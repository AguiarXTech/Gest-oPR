// Gestão de pneus (RF-30, pedido de 2026-10-03) — docs/04-REGRAS-DE-NEGOCIO.md §14.
// Estoque → montado (cavalo/truck ou carreta, numa posição) → retirada → estoque,
// recapagem (volta com vida + 1) ou descarte.
// Km: no caminhão, pelo hodômetro (km na retirada − km na montagem). A carreta não tem
// hodômetro: soma o km das viagens em que ela foi puxada enquanto o pneu estava montado.

export type StatusPneu = 'estoque' | 'montado' | 'em_recapagem' | 'descartado';
export type CondicaoEntrada = 'novo' | 'usado';
export type SituacaoPneu = 'novo' | 'recapado' | 'usado';

/** Km de uma montagem no caminhão (cavalo ou truck), pelo hodômetro. */
export function kmMontagemCavalo(kmMontagem: number, kmAgora: number): number {
  return Math.max(0, kmAgora - kmMontagem);
}

export type ViagemCarreta = { carretaId: string; dataSaida: string; kmRodado: number | null };

/** Km da carreta entre a montagem e a retirada (ou agora): viagens que saíram no período. */
export function kmCarretaNoPeriodo(
  viagens: readonly ViagemCarreta[],
  carretaId: string,
  inicio: string,
  fim: string | null,
): number {
  const ini = Date.parse(inicio);
  const end = fim === null ? Infinity : Date.parse(fim);
  return viagens
    .filter((v) => v.carretaId === carretaId)
    .filter((v) => {
      const t = Date.parse(v.dataSaida);
      return t >= ini && t < end;
    })
    .reduce((t, v) => t + (v.kmRodado ?? 0), 0);
}

/**
 * Km do pneu: na vida atual (desde novo, ou desde a última recapagem) e desde novo.
 * Pneu que entrou usado: o km de antes não se sabe, então "desde novo" é null.
 */
export function kmDoPneu(
  pneu: { condicaoEntrada: CondicaoEntrada; vida: number },
  montagens: readonly { vida: number; km: number }[],
): { kmVidaAtual: number; kmDesdeNovo: number | null } {
  const kmVidaAtual = montagens.filter((m) => m.vida === pneu.vida).reduce((t, m) => t + m.km, 0);
  const total = montagens.reduce((t, m) => t + m.km, 0);
  return { kmVidaAtual, kmDesdeNovo: pneu.condicaoEntrada === 'novo' ? total : null };
}

/** Como o pneu aparece no estoque: novo, recapado (vida ≥ 1) ou usado. */
export function situacaoPneu(pneu: {
  condicaoEntrada: CondicaoEntrada;
  vida: number;
}): SituacaoPneu {
  if (pneu.vida > 0) return 'recapado';
  return pneu.condicaoEntrada === 'novo' ? 'novo' : 'usado';
}

/**
 * Posições sugeridas pelo nº de eixos (§14): {eixo}{lado}{I|E}; lado E/D. No caminhão o
 * 1º eixo (direcional) é simples e os outros duplos; na carreta todos são duplos.
 */
export function posicoesDoVeiculo(eixos: number | null, primeiroSimples: boolean): string[] {
  const lista: string[] = [];
  for (let e = 1; e <= (eixos ?? 0); e++) {
    if (e === 1 && primeiroSimples) lista.push('1E', '1D');
    else lista.push(`${e}EE`, `${e}EI`, `${e}DI`, `${e}DE`);
  }
  return [...lista, 'Estepe'];
}
