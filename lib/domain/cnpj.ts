// CNPJ numérico e alfanumérico (Receita Federal, emitido a partir de 07/2026):
// 12 caracteres [0-9A-Z] + 2 dígitos verificadores numéricos.
// No banco fica sem pontuação e em maiúsculas.

const FORMATO = /^[0-9A-Z]{12}\d{2}$/;

export function normalizarCnpj(texto: string): string {
  return texto.replace(/[\s./-]/g, '').toUpperCase();
}

/** Valor de cada caractere no cálculo do DV: código ASCII − 48 (dígitos ficam iguais; A=17, B=18…). */
const valor = (c: string) => c.charCodeAt(0) - 48;

function calcularDv(base: string): number {
  // Pesos de 2 a 9, da direita para a esquerda, recomeçando em 2.
  const soma = base
    .split('')
    .reverse()
    .reduce((total, c, i) => total + valor(c) * ((i % 8) + 2), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCnpj(texto: string): boolean {
  const cnpj = normalizarCnpj(texto);
  if (!FORMATO.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;

  const dv1 = calcularDv(cnpj.slice(0, 12));
  const dv2 = calcularDv(cnpj.slice(0, 12) + dv1);
  return cnpj.slice(12) === `${dv1}${dv2}`;
}

export function formatarCnpj(cnpj: string): string {
  return FORMATO.test(cnpj)
    ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
    : cnpj;
}
