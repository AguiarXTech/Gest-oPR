import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { lerInteiro } from '@/lib/domain/numeros';

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
