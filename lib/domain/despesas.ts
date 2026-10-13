// Despesas lançadas pelo motorista (pedido de 2026-10-07): em que linha do resumo entram.
// Sem "quem pagou" (decisão do dono, 2026-10-13): só a despesa e o caminhão.

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
