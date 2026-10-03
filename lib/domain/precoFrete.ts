// Preço do frete combinado com o cliente (pedido de 2026-10-03): fica no cadastro do
// cliente, com histórico. Reajuste = novo preço com a data de início; a viagem usa o
// preço que valia no dia da saída. Ao concluir a viagem, o banco lança o frete sozinho
// (trigger lancar_frete_automatico, mesma regra); a gestão corrige se for diferente.

export type Sentido = 'ida' | 'volta';
export type PrecoFrete = { sentido: Sentido; vigenciaInicio: string; valorCentavos: number };

/** Preço vigente numa data (aaaa-mm-dd) para o sentido: o de início mais recente até a data. */
export function precoVigente(
  precos: readonly PrecoFrete[],
  sentido: Sentido,
  data: string,
): number | null {
  const validos = precos
    .filter((p) => p.sentido === sentido && p.vigenciaInicio <= data)
    .sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
  return validos[0]?.valorCentavos ?? null;
}

/** Fretes que entram sozinhos numa viagem que saiu na data: um por sentido com preço. */
export function fretesAutomaticos(
  precos: readonly PrecoFrete[],
  data: string,
): { sentido: Sentido; valorCentavos: number }[] {
  return (['ida', 'volta'] as const).flatMap((sentido) => {
    const valorCentavos = precoVigente(precos, sentido, data);
    return valorCentavos === null ? [] : [{ sentido, valorCentavos }];
  });
}
