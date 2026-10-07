// Dados do mês para o painel (S5-3) e o detalhe do caminhão (S5-4): regras §8.
// A comissão é a calculada pela regra vigente (estimada enquanto o acerto não fecha).
import { calcularComissaoViagem, regraVigente } from '@/lib/domain/comissao';
import { medicoesNoPeriodo } from '@/lib/domain/consumo';
import { separarDespesas } from '@/lib/domain/despesas';
import { calcularResultado, ratearDiesel, type Resultado } from '@/lib/domain/resultado';
import { paraRegraDominio } from '@/lib/supabase/acerto';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Início e fim (exclusivo) do mês aaaa-mm no horário de Brasília, em ISO. */
export function limitesDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  const proximo = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
  return {
    inicio: `${mes}-01T00:00:00-03:00`,
    fim: `${proximo}-01T00:00:00-03:00`,
    inicioData: `${mes}-01`,
    fimData: `${proximo}-01`,
  };
}

export type ViagemDoMes = {
  id: string;
  dataSaida: string;
  motorista: string;
  km: number;
  freteCentavos: number;
  quantidadeFretes: number;
  comissaoCentavos: number;
  dieselRateadoCentavos: number;
  pedagioCentavos: number;
  despesasCentavos: number;
  resultadoCentavos: number;
};

export type CaminhaoDoMes = {
  id: string;
  placa: string;
  apelido: string | null;
  resultado: Resultado;
  viagens: ViagemDoMes[];
};

export async function carregarMes(
  supabase: Cliente,
  mes: string,
): Promise<{ caminhoes: CaminhaoDoMes[]; frota: Resultado }> {
  const { inicio, fim, inicioData, fimData } = limitesDoMes(mes);
  const [
    { data: caminhoes },
    { data: viagens },
    { data: abastecimentosPeriodo },
    { data: despesas },
    { data: regras },
    { data: manutencoes },
  ] = await Promise.all([
    supabase.from('caminhoes').select('id, placa, apelido, ativo').order('placa'),
    supabase
      .from('viagens')
      .select(
        'id, caminhao_id, motorista_id, data_saida, km_saida, km_chegada, funcionarios(nome), fretes(valor_frete_centavos), cobrancas_pedagio(valor_cobrado_centavos)',
      )
      .eq('status', 'concluida')
      .gte('data_saida', inicio)
      .lt('data_saida', fim),
    // 120 dias antes do mês: traz o último tanque cheio, que abre a 1ª medição de km/L (§4)
    supabase
      .from('abastecimentos')
      .select('id, caminhao_id, km, litros, tanque_cheio, data_hora, valor_total_centavos')
      .gte('data_hora', new Date(Date.parse(inicio) - 120 * 86_400_000).toISOString())
      .lt('data_hora', fim),
    supabase
      .from('despesas_viagem')
      .select('caminhao_id, viagem_id, tipo, valor_centavos')
      .gte('data', inicioData)
      .lt('data', fimData),
    supabase.from('regras_comissao').select('*'),
    supabase
      .from('manutencoes')
      .select('caminhao_id, valor_centavos')
      .gte('data', inicioData)
      .lt('data', fimData),
  ]);

  // custo do diesel = o que foi abastecido no mês; km/L = tanque cheio a tanque cheio
  const abastecimentos = (abastecimentosPeriodo ?? []).filter(
    (a) => Date.parse(a.data_hora) >= Date.parse(inicio),
  );
  const medicoes = medicoesNoPeriodo(
    (abastecimentosPeriodo ?? []).map((a) => ({
      id: a.id,
      caminhaoId: a.caminhao_id,
      km: a.km,
      litros: Number(a.litros),
      tanqueCheio: a.tanque_cheio,
      dataHora: a.data_hora,
    })),
    inicio,
    fim,
  );

  const regrasPorMotorista = new Map<string, ReturnType<typeof paraRegraDominio>[]>();
  for (const r of regras ?? [])
    regrasPorMotorista.set(r.funcionario_id, [
      ...(regrasPorMotorista.get(r.funcionario_id) ?? []),
      paraRegraDominio(r),
    ]);

  const porCaminhao = (caminhoes ?? []).map((c) => {
    const vs = (viagens ?? []).filter((v) => v.caminhao_id === c.id);
    const abs = (abastecimentos ?? []).filter((a) => a.caminhao_id === c.id);
    const ds = (despesas ?? []).filter((d) => d.caminhao_id === c.id);
    const separadas = separarDespesas(
      ds.map((d) => ({ tipo: d.tipo, valorCentavos: d.valor_centavos })),
    );
    const diesel = abs.reduce((t, a) => t + a.valor_total_centavos, 0);
    const kmMes = vs.reduce((t, v) => t + ((v.km_chegada ?? v.km_saida) - v.km_saida), 0);

    const viagensDoMes: ViagemDoMes[] = vs.map((v) => {
      const km = (v.km_chegada ?? v.km_saida) - v.km_saida;
      const freteCentavos = v.fretes.reduce((t, f) => t + f.valor_frete_centavos, 0);
      const despesasDaViagem = ds.filter((d) => d.viagem_id === v.id);
      // pedágio = lançado como despesa + cobrado pelo app de pedágio (controle de pedágio)
      const pedagioCentavos =
        despesasDaViagem
          .filter((d) => d.tipo === 'pedagio')
          .reduce((t, d) => t + d.valor_centavos, 0) +
        v.cobrancas_pedagio.reduce((t, c) => t + c.valor_cobrado_centavos, 0);
      const despesasCentavos = despesasDaViagem
        .filter((d) => d.tipo !== 'pedagio')
        .reduce((t, d) => t + d.valor_centavos, 0);
      const dieselRateadoCentavos = ratearDiesel(diesel, km, kmMes);
      const regra = regraVigente(regrasPorMotorista.get(v.motorista_id) ?? [], v.data_saida);
      const comissaoCentavos = regra
        ? calcularComissaoViagem(
            {
              freteCentavos,
              kmRodado: km,
              pedagiosCentavos: pedagioCentavos,
              dieselRateadoCentavos,
            },
            regra,
          )
        : 0;
      return {
        id: v.id,
        dataSaida: v.data_saida,
        motorista: v.funcionarios?.nome ?? '',
        km,
        freteCentavos,
        quantidadeFretes: v.fretes.length,
        comissaoCentavos,
        dieselRateadoCentavos,
        pedagioCentavos,
        despesasCentavos,
        resultadoCentavos:
          freteCentavos -
          dieselRateadoCentavos -
          pedagioCentavos -
          despesasCentavos -
          comissaoCentavos,
      };
    });

    const resultado = calcularResultado({
      viagens: viagensDoMes.map((v) => ({
        freteCentavos: v.freteCentavos,
        kmRodado: v.km,
        comissaoCentavos: v.comissaoCentavos,
      })),
      dieselCentavos: diesel,
      medicoesConsumo: medicoes.filter((m) => m.caminhaoId === c.id),
      pedagioCentavos:
        separadas.pedagioCentavos +
        vs.reduce(
          (t, v) => t + v.cobrancas_pedagio.reduce((s, c) => s + c.valor_cobrado_centavos, 0),
          0,
        ),
      despesasCentavos: separadas.outrasCentavos,
      // manutenção lançada pela gestão (pago pelo dono) + a que o motorista pagou e lançou
      manutencaoCentavos:
        (manutencoes ?? [])
          .filter((m) => m.caminhao_id === c.id)
          .reduce((t, m) => t + m.valor_centavos, 0) + separadas.manutencaoCentavos,
    });
    return {
      id: c.id,
      placa: c.placa,
      apelido: c.apelido,
      ativo: c.ativo,
      resultado,
      viagens: viagensDoMes,
    };
  });

  // caminhão desativado só aparece se teve movimento no mês
  const comMovimento = porCaminhao.filter(
    (c) => c.ativo || c.resultado.km > 0 || c.resultado.dieselCentavos > 0,
  );
  const soma = (
    campo: 'dieselCentavos' | 'pedagioCentavos' | 'despesasCentavos' | 'manutencaoCentavos',
  ) => comMovimento.reduce((t, c) => t + c.resultado[campo], 0);
  // despesa lançada sem viagem e sem caminhão (antes de 2026-10-07 o app deixava): não
  // tem caminhão para entrar, mas entra no total da frota para não sumir
  const semCaminhao = separarDespesas(
    (despesas ?? [])
      .filter((d) => d.caminhao_id === null)
      .map((d) => ({ tipo: d.tipo, valorCentavos: d.valor_centavos })),
  );
  const frota = calcularResultado({
    viagens: comMovimento.flatMap((c) =>
      c.viagens.map((v) => ({
        freteCentavos: v.freteCentavos,
        kmRodado: v.km,
        comissaoCentavos: v.comissaoCentavos,
      })),
    ),
    dieselCentavos: soma('dieselCentavos'),
    medicoesConsumo: medicoes.filter((m) => comMovimento.some((c) => c.id === m.caminhaoId)),
    pedagioCentavos: soma('pedagioCentavos') + semCaminhao.pedagioCentavos,
    despesasCentavos: soma('despesasCentavos') + semCaminhao.outrasCentavos,
    manutencaoCentavos: soma('manutencaoCentavos') + semCaminhao.manutencaoCentavos,
  });

  return {
    caminhoes: comMovimento.map((c) => ({
      id: c.id,
      placa: c.placa,
      apelido: c.apelido,
      resultado: c.resultado,
      viagens: c.viagens,
    })),
    frota,
  };
}
