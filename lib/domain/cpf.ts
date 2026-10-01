// CPF: no banco fica só com os 11 dígitos (check em funcionarios.cpf).

export function normalizarCpf(texto: string): string {
  return texto.replace(/[\s.-]/g, '');
}

/** Confere formato e os dois dígitos verificadores. Rejeita sequências repetidas (111.111.111-11). */
export function validarCpf(texto: string): boolean {
  const cpf = normalizarCpf(texto);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split('').map(Number);
  const dv = (quantidade: number) => {
    const soma = digitos.slice(0, quantidade).reduce((total, d, i) => total + d * (quantidade + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return dv(9) === digitos[9] && dv(10) === digitos[10];
}

export function formatarCpf(cpf: string): string {
  return /^\d{11}$/.test(cpf) ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : cpf;
}
