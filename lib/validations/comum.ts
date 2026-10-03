import { z } from 'zod';
import { normalizarCnpj, validarCnpj } from '@/lib/domain/cnpj';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { lerInteiro } from '@/lib/domain/numeros';
import { normalizarPlaca, validarPlaca } from '@/lib/domain/placa';

// Campos de formulário reaproveitados: chegam como texto e saem no formato do banco.

/** Texto livre; vazio vira null. */
export const textoOpcional = z
  .string()
  .trim()
  .transform((v) => v || null);

export function inteiroOpcional(min: number, max: number, mensagem: string) {
  return z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = lerInteiro(v);
      if (n === null || n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: mensagem });
        return z.NEVER;
      }
      return n;
    });
}

/** Valor em reais digitado ("1.800,00") → centavos inteiros; vazio vira null. */
export const centavosOpcional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      return reaisParaCentavos(v);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 1.800,00' });
      return z.NEVER;
    }
  });

/** Data de <input type="date"> (aaaa-mm-dd); vazio vira null. */
export const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida.')
  .transform((v) => v || null);

/** CNPJ numérico ou alfanumérico, com DV conferido; vazio vira null. */
export const cnpjOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || validarCnpj(v), 'CNPJ inválido. Confira os caracteres.')
  .transform((v) => (v ? normalizarCnpj(v) : null));

/** Placa antiga ou Mercosul; sai sem hífen e em maiúsculas. */
export const placaObrigatoria = z
  .string()
  .trim()
  .min(1, 'Digite a placa.')
  .refine(validarPlaca, 'Placa inválida. Use o formato ABC1234 ou ABC1D23.')
  .transform(normalizarPlaca);

/** Eixos erguidos quando vazio (pedágio: eixo suspenso vazio não paga). Vazio = 0. */
export const eixosSuspensos = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return 0;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 8) {
      ctx.addIssue({ code: 'custom', message: 'De 0 a 8.' });
      return z.NEVER;
    }
    return n;
  });

/** Eixos suspensos precisam ser menos que o total de eixos. */
export function conferirSuspensos(
  c: { eixos: number | null; eixos_suspensos: number },
  ctx: z.RefinementCtx,
) {
  if (c.eixos_suspensos > 0 && (c.eixos === null || c.eixos_suspensos >= c.eixos)) {
    ctx.addIssue({
      code: 'custom',
      path: ['eixos_suspensos'],
      message: 'Precisa ser menor que o total de eixos.',
    });
  }
}
