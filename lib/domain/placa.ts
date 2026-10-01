// Placas brasileiras: antiga (ABC1234) e Mercosul (ABC1D23).
// No banco a placa fica sem hífen e em maiúsculas (check em caminhoes.placa).

const ANTIGA = /^[A-Z]{3}\d{4}$/;
const MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/** Remove espaços e hífen e passa para maiúsculas. */
export function normalizarPlaca(texto: string): string {
  return texto.replace(/[\s-]/g, '').toUpperCase();
}

export function validarPlaca(texto: string): boolean {
  const placa = normalizarPlaca(texto);
  return ANTIGA.test(placa) || MERCOSUL.test(placa);
}

/** Exibição: a antiga ganha hífen (ABC-1234); a Mercosul fica como está. */
export function formatarPlaca(placa: string): string {
  return ANTIGA.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}
