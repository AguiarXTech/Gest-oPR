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
