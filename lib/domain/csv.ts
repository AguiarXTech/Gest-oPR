// CSV para o Excel em português (S4-7): separador ";", vírgula decimal, UTF-8 com BOM
// (sem o BOM o Excel abre os acentos errados) e quebra de linha CRLF.

export type Celula = string | number | null | undefined;

const BOM = '﻿';

function escapar(valor: Celula): string {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'number' ? String(valor).replace('.', ',') : valor;
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function gerarCsv(cabecalho: readonly string[], linhas: readonly (readonly Celula[])[]): string {
  return BOM + [cabecalho, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n') + '\r\n';
}

/** Centavos → "1234,56" (sem R$ e sem ponto de milhar: o Excel lê como número). */
export function centavosParaCsv(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  return `${negativo ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}
