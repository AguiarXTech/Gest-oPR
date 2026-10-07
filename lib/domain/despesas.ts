// Despesas lançadas pelo motorista (pedido de 2026-10-07): em que linha do resumo entram e
// se o dinheiro (pago do bolso dele) já foi devolvido. A devolução é feita no acerto
// (§ acerto: reembolsos = despesas reembolsáveis do período).

export type DespesaParaResumo = { tipo: string; valorCentavos: number };

/** Pedágio e manutenção têm linha própria no resumo; o resto é "outras despesas". */
export function separarDespesas(despesas: readonly DespesaParaResumo[]) {
  const soma = (filtro: (tipo: string) => boolean) =>
    despesas.filter((d) => filtro(d.tipo)).reduce((t, d) => t + d.valorCentavos, 0);
  return {
    pedagioCentavos: soma((t) => t === 'pedagio'),
    manutencaoCentavos: soma((t) => t === 'manutencao'),
    outrasCentavos: soma((t) => t !== 'pedagio' && t !== 'manutencao'),
  };
}

export type SituacaoReembolso = 'a_devolver' | 'no_acerto' | 'devolvido' | 'nao_reembolsavel';

/** O que pagou do bolso: a devolver (ainda fora de acerto), no acerto ou já devolvido. */
export function situacaoReembolso(d: {
  reembolsavel: boolean;
  acertoStatus: 'rascunho' | 'fechado' | 'pago' | null;
}): SituacaoReembolso {
  if (!d.reembolsavel) return 'nao_reembolsavel';
  if (d.acertoStatus === null) return 'a_devolver';
  return d.acertoStatus === 'pago' ? 'devolvido' : 'no_acerto';
}
