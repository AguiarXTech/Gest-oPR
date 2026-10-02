// Carrega um acerto e monta a entrada do domínio (lib/domain/acerto.ts).
// Usado pela tela do acerto e pela ação de fechar (que recalcula na hora).
import type { Tables } from '@/lib/database.types';
import { calcularAcerto, verificarFechamento, type EntradaAcerto } from '@/lib/domain/acerto';
import type { RegraComissao } from '@/lib/domain/comissao';
import { competencia, ratearDiesel } from '@/lib/domain/resultado';
import { analisarDesde } from '@/lib/supabase/conferencia';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Linha de `regras_comissao` → regra do domínio. */
export function paraRegraDominio(r: Tables<'regras_comissao'>): RegraComissao {
  return {
    id: r.id,
    tipo: r.tipo,
    percentual: r.percentual === null ? null : Number(r.percentual),
    valorCentavos: r.valor_centavos,
    deduzPedagio: r.deduz_pedagio,
    deduzCombustivel: r.deduz_combustivel,
    apenasComFrete: r.apenas_com_frete,
    vigenciaInicio: r.vigencia_inicio,
    vigenciaFim: r.vigencia_fim,
  };
}

export async function carregarAcerto(supabase: Cliente, id: string) {
  const { data: acerto } = await supabase.from('acertos').select('*, funcionarios(nome, telefone)').eq('id', id).maybeSingle();
  if (!acerto) return null;

  const [{ data: viagens }, { data: abastecimentos }, { data: despesas }, { data: adiantamentos }, { data: regras }] = await Promise.all([
    supabase
      .from('viagens')
      .select('id, caminhao_id, data_saida, data_chegada, km_saida, km_chegada, caminhoes(placa), fretes(sentido, valor_frete_centavos), despesas_viagem(tipo, valor_centavos)')
      .eq('acerto_id', id)
      .order('data_saida'),
    supabase
      .from('abastecimentos')
      .select('id, data_hora, km, litros, valor_total_centavos, forma_pagamento, conferido')
      .eq('acerto_id', id)
      .order('data_hora'),
    supabase.from('despesas_viagem').select('id, data, tipo, valor_centavos, reembolsavel, conferido').eq('acerto_id', id).order('data'),
    supabase.from('adiantamentos').select('id, data, valor_centavos, forma').eq('acerto_id', id).order('data'),
    supabase.from('regras_comissao').select('*').eq('funcionario_id', acerto.motorista_id),
  ]);

  const regrasDominio = (regras ?? []).map(paraRegraDominio);

  // Diesel rateado só é preciso na comissão sobre frete líquido que desconta combustível.
  const precisaRateio = regrasDominio.some((r) => r.tipo === 'pct_frete_liquido' && r.deduzCombustivel);
  const rateio = precisaRateio ? await calcularRateios(supabase, viagens ?? []) : new Map<string, number>();

  const entrada: EntradaAcerto = {
    viagens: (viagens ?? []).map((v) => ({
      id: v.id,
      dataSaida: v.data_saida,
      kmRodado: (v.km_chegada ?? v.km_saida) - v.km_saida,
      fretesCentavos: v.fretes.map((f) => f.valor_frete_centavos),
      pedagiosCentavos: v.despesas_viagem.filter((d) => d.tipo === 'pedagio').reduce((t, d) => t + d.valor_centavos, 0),
      dieselRateadoCentavos: rateio.get(v.id) ?? 0,
    })),
    regras: regrasDominio,
    despesas: (despesas ?? []).map((d) => ({ valorCentavos: d.valor_centavos, reembolsavel: d.reembolsavel })),
    abastecimentos: (abastecimentos ?? []).map((a) => ({ valorTotalCentavos: a.valor_total_centavos, formaPagamento: a.forma_pagamento })),
    adiantamentosCentavos: (adiantamentos ?? []).map((a) => a.valor_centavos),
  };

  // alertas graves não conferidos (aviso ao fechar)
  let alertasGraves = 0;
  const pendentes = (abastecimentos ?? []).filter((a) => !a.conferido);
  if (pendentes.length > 0 && acerto.status === 'rascunho') {
    const desde = new Date(new Date(`${acerto.periodo_inicio}T00:00:00-03:00`).getTime() - 86_400_000);
    const analises = await analisarDesde(supabase, desde, await obterConfiguracoes());
    alertasGraves = pendentes.filter((a) => analises.get(a.id)?.anomalias.some((x) => x.severidade === 'alta')).length;
  }

  return {
    acerto,
    viagens: viagens ?? [],
    abastecimentos: abastecimentos ?? [],
    despesas: despesas ?? [],
    adiantamentos: adiantamentos ?? [],
    regras: regras ?? [],
    entrada,
    resultado: calcularAcerto(entrada),
    verificacao: verificarFechamento(entrada, alertasGraves),
  };
}

/** Diesel rateado por viagem: diesel do caminhão no mês × km da viagem ÷ km do caminhão no mês. */
async function calcularRateios(
  supabase: Cliente,
  viagens: { id: string; caminhao_id: string; data_saida: string; km_saida: number; km_chegada: number | null }[],
) {
  const rateio = new Map<string, number>();
  const grupos = new Map<string, typeof viagens>();
  for (const v of viagens) {
    const chave = `${v.caminhao_id}|${competencia(v.data_saida)}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), v]);
  }
  for (const [chave, lista] of grupos) {
    const [caminhaoId, mes] = chave.split('|');
    const inicio = `${mes}-01T00:00:00-03:00`;
    const [ano, m] = mes.split('-').map(Number);
    const fim = `${m === 12 ? ano + 1 : ano}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01T00:00:00-03:00`;
    const [{ data: diesel }, { data: doMes }] = await Promise.all([
      supabase.from('abastecimentos').select('valor_total_centavos').eq('caminhao_id', caminhaoId).gte('data_hora', inicio).lt('data_hora', fim),
      supabase.from('viagens').select('km_saida, km_chegada').eq('caminhao_id', caminhaoId).eq('status', 'concluida').gte('data_saida', inicio).lt('data_saida', fim),
    ]);
    const dieselMes = (diesel ?? []).reduce((t, a) => t + a.valor_total_centavos, 0);
    const kmMes = (doMes ?? []).reduce((t, v) => t + ((v.km_chegada ?? v.km_saida) - v.km_saida), 0);
    for (const v of lista) rateio.set(v.id, ratearDiesel(dieselMes, (v.km_chegada ?? v.km_saida) - v.km_saida, kmMes));
  }
  return rateio;
}
