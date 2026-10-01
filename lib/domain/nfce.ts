// Chave de acesso de NFC-e/NF-e (44 posições) — docs/04-REGRAS-DE-NEGOCIO.md §3.
// Desde a NT 2025.001 o CNPJ do emitente (posições 7–20) pode ser alfanumérico;
// as demais posições continuam numéricas. DV: módulo 11 com valor ASCII − 48.

const FORMATO = /^\d{6}[0-9A-Z]{14}\d{24}$/;
const FORMATO_NO_TEXTO = /\d{6}[0-9A-Z]{14}\d{24}/;

const UFS: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

/** DV dos 43 primeiros caracteres: pesos 2..9 da direita para a esquerda; resto < 2 → 0. */
export function calcularDvChave(base43: string): number {
  const soma = base43
    .split('')
    .reverse()
    .reduce((total, c, i) => total + (c.charCodeAt(0) - 48) * ((i % 8) + 2), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarChave(chave: string): boolean {
  return FORMATO.test(chave) && calcularDvChave(chave.slice(0, 43)) === Number(chave[43]);
}

/**
 * Extrai a chave do texto lido no QR (URL da SEFAZ) ou digitado.
 * Retorna null se não houver chave válida (formato + DV).
 */
export function extrairChave(texto: string): string | null {
  let candidato: string | undefined;

  try {
    const url = new URL(texto.trim());
    // QR v2/v3: p=CHAVE|versão|ambiente|… · QR antigo: chNFe=CHAVE
    candidato = url.searchParams.get('p')?.split('|')[0] ?? url.searchParams.get('chNFe') ?? undefined;
  } catch {
    // não é URL: segue para a busca no texto
  }

  if (!candidato) {
    candidato = texto.replace(/\s/g, '').toUpperCase().match(FORMATO_NO_TEXTO)?.[0];
  }

  const chave = candidato?.replace(/\s/g, '').toUpperCase();
  return chave && validarChave(chave) ? chave : null;
}

export type ChaveDecomposta = {
  codigoUf: string;
  /** Sigla da UF do emitente, ou null se o código não existir. */
  uf: string | null;
  ano: number;
  mes: number;
  cnpjEmitente: string;
  /** 65 = NFC-e, 55 = NF-e. */
  modelo: string;
  serie: string;
  numero: number;
  tipoEmissao: string;
  codigoNumerico: string;
  dv: string;
};

export function decomporChave(chave: string): ChaveDecomposta | null {
  if (!validarChave(chave)) return null;
  return {
    codigoUf: chave.slice(0, 2),
    uf: UFS[chave.slice(0, 2)] ?? null,
    ano: 2000 + Number(chave.slice(2, 4)),
    mes: Number(chave.slice(4, 6)),
    cnpjEmitente: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    serie: chave.slice(22, 25),
    numero: Number(chave.slice(25, 34)),
    tipoEmissao: chave.slice(34, 35),
    codigoNumerico: chave.slice(35, 43),
    dv: chave[43],
  };
}
