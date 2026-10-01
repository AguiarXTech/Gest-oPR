/** UUID v4. crypto.randomUUID só existe em https; no http da rede local usa getRandomValues. */
export function gerarUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Insert repetido (resposta perdida por sinal fraco, nova tentativa com o MESMO id
 * gerado no celular) bate na chave primária: o registro já foi salvo.
 */
export function jaFoiSalvo(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  return e?.code === '23505' && /_pkey/.test(e.message ?? '');
}
