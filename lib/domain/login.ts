// Login por CPF ou e-mail (ADR-0001, Q8): motoristas sem e-mail recebem o
// e-mail interno `{cpf}@frota.local`, e a tela aceita o CPF digitado.

export const DOMINIO_EMAIL_INTERNO = 'frota.local';

/** Converte o que o usuário digitou no e-mail usado pelo Supabase Auth. */
export function paraEmailDeLogin(entrada: string): string | null {
  const texto = entrada.trim();

  if (texto.includes('@')) {
    const email = texto.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }

  const digitos = texto.replace(/[\s.-]/g, '');
  return /^\d{11}$/.test(digitos) ? `${digitos}@${DOMINIO_EMAIL_INTERNO}` : null;
}

/** CPF de quem entra pelo CPF (e-mail interno); null para e-mail comum. */
export function cpfDoLogin(email: string | undefined | null): string | null {
  const m = /^(\d{11})@(.+)$/.exec(email ?? '');
  return m && m[2] === DOMINIO_EMAIL_INTERNO ? m[1] : null;
}
