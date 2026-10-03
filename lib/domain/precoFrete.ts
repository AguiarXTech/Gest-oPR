// Preço do frete combinado por produto/local de carga (pedido de 2026-10-03), com histórico.
// O trecho carregado vem do lugar do produto: região de BH = volta; região de SJE = ida.
// Reajuste = novo preço com a data de início; a viagem usa o preço do dia da saída.
// Ao concluir a viagem, o banco lança o frete do produto que o motorista escolheu
// (trigger lancar_frete_automatico, mesma regra); a gestão corrige se for diferente.

export type Sentido = 'ida' | 'volta';
export type PrecoFrete = { vigenciaInicio: string; valorCentavos: number };

/** Preço vigente numa data (aaaa-mm-dd): o de início mais recente até a data. */
export function precoVigente(precos: readonly PrecoFrete[], data: string): number | null {
  const validos = precos
    .filter((p) => p.vigenciaInicio <= data)
    .sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
  return validos[0]?.valorCentavos ?? null;
}

/** Frete que entra sozinho na viagem: trecho do local do produto + preço da data. */
export function freteAutomatico(
  local: { sentido: Sentido; precos: readonly PrecoFrete[] } | null,
  data: string,
): { sentido: Sentido; valorCentavos: number } | null {
  if (!local) return null;
  const valorCentavos = precoVigente(local.precos, data);
  return valorCentavos === null ? null : { sentido: local.sentido, valorCentavos };
}

/** Como o trecho aparece para quem cadastra: pelo lugar do produto. */
export const REGIAO_DO_TRECHO: Record<Sentido, string> = {
  volta: 'Região de BH (carrega na volta)',
  ida: 'Região de SJE (carrega na ida)',
};
