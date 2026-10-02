// Dados do mês para o painel (S5-3) e o detalhe do caminhão (S5-4): regras §8.
// A comissão é a calculada pela regra vigente (estimada enquanto o acerto não fecha).
import { calcularComissaoViagem, regraVigente } from '@/lib/domain/comissao';
import { calcularResultado, ratearDiesel, type Resultado } from '@/lib/domain/resultado';
import { paraRegraDominio } from '@/lib/supabase/acerto';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Início e fim (exclusivo) do mês aaaa-mm no horário de Brasília, em ISO. */
export function limitesDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  const proximo = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
  return { inicio: `${mes}-01T00:00:00-03:00`, fim: `${proximo}-01T00:00:00-03:00`, inicioData: `${mes}-01`, fimData: `${proximo}-01` };
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

export type CaminhaoDoMes = { id: string; placa: string; apelido: string | null; resultado: Resultado; viagens: ViagemDoMes[] };

export async function carregarMes(supabase: Cliente, mes: string): Promise<{ caminhoes: CaminhaoDoMes[]; frota: Resultado }> {
  const { inicio, fim, inicioData, fimData } = limitesDoMes(mes);
  const [{ data: caminhoes }, { data: viagens }, { data: abastecimentos }, { data: despesas }, { data: regras }, { data: manutencoes }] = await Promise.all([
    supabase.from('caminhoes').select('id, placa, apelido, ativo').order('placa'),
    supabase
      .from('viagens')
      .select('id, caminhao_id, motorista_id, data_saida, km_saida, km_chegada, funcionarios(nome), fretes(valor_frete_centavos)')
      .eq('status', 'concluida')
      .gte('data_saida', inicio)
      .lt('data_saida', fim),
    supabase.from('abastecimentos').select('caminhao_id, litros, valor_total_centavos').gte('data_hora', inicio).lt('data_hora', fim),
    supabase.from('despesas_viagem').select('caminhao_id, viagem_id, tipo, valor_centavos').gte('data', inicioData).lt('data', fimData),
    supabase.from('regras_comissao').select('*'),
    supabase.from('manutencoes').select('caminhao_id, valor_centavos').gte('data', inicioData).lt('data', fimData),
  ]);

  const regrasPorMotorista = new Map<string, ReturnType<typeof paraRegraDominio>[]>();
  for (const r of regras ?? []) regrasPorMotorista.set(r.funcionario_id, [...(regrasPorMotorista.get(r.funcionario_id) ?? []), paraRegraDominio(r)]);

  const porCaminhao = (caminhoes ?? []).map((c) => {
    const vs = (viagens ?? []).filter((v) => v.caminhao_id === c.id);
    const abs = (abastecimentos ?? []).filter((a) => a.caminhao_id === c.id);
    const ds = (despesas ?? []).filter((d) => d.caminhao_id === c.id);
    const diesel = abs.reduce((t, a) => t + a.valor_total_centavos, 0);
    const litros = abs.reduce((t, a) => t + Number(a.litros), 0);
    const kmMes = vs.reduce((t, v) => t + ((v.km_chegada ?? v.km_saida) - v.km_saida), 0);

    const viagensDoMes: ViagemDoMes[] = vs.map((v) => {
      const km = (v.km_chegada ?? v.km_saida) - v.km_saida;
      const freteCentavos = v.fretes.reduce((t, f) => t + f.valor_frete_centavos, 0);
      const despesasDaViagem = ds.filter((d) => d.viagem_id === v.id);
      const pedagioCentavos = despesasDaViagem.filter((d) => d.tipo === 'pedagio').reduce((t, d) => t + d.valor_centavos, 0);
      const despesasCentavos = despesasDaViagem.filter((d) => d.tipo !== 'pedagio').reduce((t, d) => t + d.valor_centavos, 0);
      const dieselRateadoCentavos = ratearDiesel(diesel, km, kmMes);
      const regra = regraVigente(regrasPorMotorista.get(v.motorista_id) ?? [], v.data_saida);
      const comissaoCentavos = regra
        ? calcularComissaoViagem({ freteCentavos, kmRodado: km, pedagiosCentavos: pedagioCentavos, dieselRateadoCentavos }, regra)
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
        resultadoCentavos: freteCentavos - dieselRateadoCentavos - pedagioCentavos - despesasCentavos - comissaoCentavos,
      };
    });

    const resultado = calcularResultado({
      viagens: viagensDoMes.map((v) => ({ freteCentavos: v.freteCentavos, kmRodado: v.km, comissaoCentavos: v.comissaoCentavos })),
      dieselCentavos: diesel,
      litros,
      pedagioCentavos: ds.filter((d) => d.tipo === 'pedagio').reduce((t, d) => t + d.valor_centavos, 0),
      despesasCentavos: ds.filter((d) => d.tipo !== 'pedagio').reduce((t, d) => t + d.valor_centavos, 0),
      manutencaoCentavos: (manutencoes ?? []).filter((m) => m.caminhao_id === c.id).reduce((t, m) => t + m.valor_centavos, 0),
    });
    return { id: c.id, placa: c.placa, apelido: c.apelido, ativo: c.ativo, resultado, viagens: viagensDoMes };
  });

  // caminhão desativado só aparece se teve movimento no mês
  const comMovimento = porCaminhao.filter((c) => c.ativo || c.resultado.km > 0 || c.resultado.dieselCentavos > 0);
  const soma = (campo: 'dieselCentavos' | 'pedagioCentavos' | 'despesasCentavos' | 'manutencaoCentavos') => comMovimento.reduce((t, c) => t + c.resultado[campo], 0);
  const frota = calcularResultado({
    viagens: comMovimento.flatMap((c) => c.viagens.map((v) => ({ freteCentavos: v.freteCentavos, kmRodado: v.km, comissaoCentavos: v.comissaoCentavos }))),
    dieselCentavos: soma('dieselCentavos'),
    litros: (abastecimentos ?? []).reduce((t, a) => t + Number(a.litros), 0),
    pedagioCentavos: soma('pedagioCentavos'),
    despesasCentavos: soma('despesasCentavos'),
    manutencaoCentavos: soma('manutencaoCentavos'),
  });

  return {
    caminhoes: comMovimento.map((c) => ({ id: c.id, placa: c.placa, apelido: c.apelido, resultado: c.resultado, viagens: c.viagens })),
    frota,
  };
}
