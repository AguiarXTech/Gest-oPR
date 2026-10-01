// Leitura de números digitados no padrão brasileiro (ponto de milhar, vírgula decimal).
// Valores negativos não são aceitos: nenhum campo de cadastro usa negativo.

/** "480.000" → 480000. Retorna null se não for inteiro não negativo. */
export function lerInteiro(texto: string): number | null {
  const limpo = texto.trim();
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(limpo)) return null;
  return Number(limpo.replace(/\./g, ''));
}

/**
 * "1.250,75" → 1250.75. Sem vírgula, um ponto seguido de exatamente 3 dígitos
 * é milhar ("1.250" → 1250); senão é decimal ("300.5" → 300.5).
 */
export function lerDecimal(texto: string): number | null {
  const limpo = texto.trim();
  let normalizado: string;

  if (limpo.includes(',')) {
    if (!/^(\d{1,3}(\.\d{3})*|\d+),\d+$/.test(limpo)) return null;
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '');
  } else {
    if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
    normalizado = limpo;
  }

  return Number(normalizado);
}
