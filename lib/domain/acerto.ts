// Acerto com o motorista — docs/04-REGRAS-DE-NEGOCIO.md §7.
// Suposições provisórias do PRD (confirmar com o dono): período livre (Q2),
// sem diária fixa (Q5), só diesel pago pelo motorista é reembolsado (Q11).
import { calcularComissaoViagem, dataBrasilia, regraVigente, type RegraComissao } from './comissao';
import { somarCentavos } from './dinheiro';

export type ViagemAcerto = {
  id: string;
  /** ISO 8601. */
  dataSaida: string;
  kmRodado: number;
  /** Valor de cada frete lançado (ida e/ou volta). Vazio = sem frete. */
  fretesCentavos: number[];
  pedagiosCentavos: number;
  dieselRateadoCentavos: number;
};

export type EntradaAcerto = {
  viagens: ViagemAcerto[];
  regras: RegraComissao[];
  despesas: { valorCentavos: number; reembolsavel: boolean }[];
  abastecimentos: { valorTotalCentavos: number; formaPagamento: 'motorista' | 'cartao_empresa' | 'faturado' }[];
  adiantamentosCentavos: number[];
};

export type ResultadoAcerto = {
  porViagem: { id: string; freteCentavos: number; comissaoCentavos: number; regraId: string | null }[];
  totalFreteCentavos: number;
  totalComissaoCentavos: number;
  totalReembolsosCentavos: number;
  totalAdiantamentosCentavos: number;
  saldoCentavos: number;
};

export function calcularAcerto(e: EntradaAcerto): ResultadoAcerto {
  const porViagem = e.viagens.map((v) => {
    const freteCentavos = somarCentavos(v.fretesCentavos);
    const regra = regraVigente(e.regras, v.dataSaida);
    return {
      id: v.id,
      freteCentavos,
      regraId: regra?.id ?? null,
      comissaoCentavos: regra ? calcularComissaoViagem({ ...v, freteCentavos }, regra) : 0,
    };
  });

  const totalComissaoCentavos = somarCentavos(porViagem.map((v) => v.comissaoCentavos));
  const totalReembolsosCentavos = somarCentavos([
    ...e.despesas.filter((d) => d.reembolsavel).map((d) => d.valorCentavos),
    ...e.abastecimentos.filter((a) => a.formaPagamento === 'motorista').map((a) => a.valorTotalCentavos),
  ]);
  const totalAdiantamentosCentavos = somarCentavos(e.adiantamentosCentavos);

  return {
    porViagem,
    totalFreteCentavos: somarCentavos(porViagem.map((v) => v.freteCentavos)),
    totalComissaoCentavos,
    totalReembolsosCentavos,
    totalAdiantamentosCentavos,
    saldoCentavos: totalComissaoCentavos + totalReembolsosCentavos - totalAdiantamentosCentavos,
  };
}

const dataBr = (iso: string) => dataBrasilia(iso).split('-').reverse().join('/');

/**
 * O que impede (erros) ou merece atenção (avisos) antes de fechar o acerto.
 * `alertasGravesPendentes`: abastecimentos com anomalia alta ainda não conferidos.
 */
export function verificarFechamento(e: EntradaAcerto, alertasGravesPendentes: number) {
  const erros: string[] = [];
  for (const v of e.viagens) {
    if (v.fretesCentavos.length === 0) erros.push(`Viagem de ${dataBr(v.dataSaida)} sem frete lançado.`);
    if (!regraVigente(e.regras, v.dataSaida)) erros.push(`Viagem de ${dataBr(v.dataSaida)} sem regra de comissão vigente.`);
  }
  const avisos =
    alertasGravesPendentes > 0 ? [`${alertasGravesPendentes} abastecimento(s) com alerta grave ainda não conferido(s).`] : [];
  return { erros, avisos };
}

/**
 * Comissão ESTIMADA para o extrato do motorista, que não vê o frete (Q6).
 * Valor fixo por viagem e por km não dependem do frete (a volta é sempre carregada,
 * Q3); os tipos em % só são conhecidos no acerto.
 */
export function estimarComissao(viagens: readonly { dataSaida: string; kmRodado: number }[], regras: readonly RegraComissao[]) {
  let totalCentavos = 0;
  let dependeDoFrete = 0;
  let semRegra = 0;
  for (const v of viagens) {
    const regra = regraVigente(regras, v.dataSaida);
    if (!regra) semRegra++;
    else if (regra.tipo === 'valor_por_viagem') totalCentavos += regra.valorCentavos ?? 0;
    else if (regra.tipo === 'valor_por_km') totalCentavos += v.kmRodado * (regra.valorCentavos ?? 0);
    else dependeDoFrete++;
  }
  return { totalCentavos, dependeDoFrete, semRegra };
}

/**
 * Q5 (2026-10-01): a empresa não paga alimentação, pernoite etc.; só reembolsa as
 * despesas do caminhão que o motorista pagou do bolso. O gestor pode mudar na conferência.
 */
export const DESPESAS_DO_CAMINHAO = ['pedagio', 'borracharia', 'manutencao', 'estacionamento', 'lavagem', 'chapa'] as const;

export function despesaReembolsavel(tipo: string): boolean {
  return (DESPESAS_DO_CAMINHAO as readonly string[]).includes(tipo);
}

export type TipoPeriodo = 'mensal' | 'quinzenal' | 'semanal';

/**
 * Q2 (2026-10-01): o acerto pode ser mensal, de 15 ou de 7 dias. Sugere o último período
 * FECHADO antes de `hoje` (aaaa-mm-dd). A semana começa na segunda-feira (AGENTS.md §4.3).
 */
export function periodoSugerido(tipo: TipoPeriodo, hoje: string): { inicio: string; fim: string } {
  const d = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const somar = (x: Date, dias: number) => new Date(x.getTime() + dias * 86_400_000);
  const ultimoDiaDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // mes 1-12
  const [ano, mes, dia] = hoje.split('-').map(Number);

  if (tipo === 'semanal') {
    const h = d(hoje);
    const diasDesdeSegunda = (h.getUTCDay() + 6) % 7;
    const segundaPassada = somar(h, -diasDesdeSegunda - 7);
    return { inicio: iso(segundaPassada), fim: iso(somar(segundaPassada, 6)) };
  }

  const [aAnt, mAnt] = mes === 1 ? [ano - 1, 12] : [ano, mes - 1];
  const mm = (m: number) => String(m).padStart(2, '0');
  if (tipo === 'mensal') {
    return { inicio: `${aAnt}-${mm(mAnt)}-01`, fim: `${aAnt}-${mm(mAnt)}-${ultimoDiaDoMes(aAnt, mAnt)}` };
  }
  // quinzenal: a partir do dia 16, a 1ª quinzena do mês já fechou; antes disso, a 2ª do mês anterior
  return dia >= 16
    ? { inicio: `${ano}-${mm(mes)}-01`, fim: `${ano}-${mm(mes)}-15` }
    : { inicio: `${aAnt}-${mm(mAnt)}-16`, fim: `${aAnt}-${mm(mAnt)}-${ultimoDiaDoMes(aAnt, mAnt)}` };
}
