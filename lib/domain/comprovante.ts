// Fotos de comprovantes (AGENTS.md §4.8, RNF-03): bucket privado `comprovantes`,
// caminho {funcionario_id}/{yyyy}/{mm}/{uuid}.jpg, maior lado ≤ 1600 px, ~300 KB.

export const BUCKET_COMPROVANTES = 'comprovantes';
export const LADO_MAXIMO = 1600;
export const TAMANHO_ALVO_BYTES = 300 * 1024;

/** Ano e mês no horário de Brasília (a pasta segue o mês em que a foto foi tirada lá). */
function anoMes(data: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })
    .formatToParts(data);
  return {
    ano: partes.find((p) => p.type === 'year')!.value,
    mes: partes.find((p) => p.type === 'month')!.value,
  };
}

export function caminhoComprovante(funcionarioId: string, data: Date, uuid: string): string {
  const { ano, mes } = anoMes(data);
  return `${funcionarioId}/${ano}/${mes}/${uuid}.jpg`;
}

/** Novo tamanho mantendo a proporção; nunca amplia. */
export function dimensionar(largura: number, altura: number, maiorLado = LADO_MAXIMO) {
  const escala = Math.min(1, maiorLado / Math.max(largura, altura));
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}
