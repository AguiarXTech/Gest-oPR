import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { decomporChave } from '@/lib/domain/nfce';
import { lerDecimal } from '@/lib/domain/numeros';
import { textoOpcional } from './comum';

/** Chave de 44 posições com DV correto e do modelo esperado (57 = CT-e, 58 = MDF-e); vazio vira null. */
function chaveOpcional(modelo: '57' | '58', nome: string) {
  return z
    .string()
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .refine((v) => v === '' || decomporChave(v) !== null, `Chave do ${nome} inválida. Confira os 44 caracteres.`)
    .refine((v) => v === '' || decomporChave(v)?.modelo === modelo, `Esta chave não é de ${nome} (modelo ${modelo}).`)
    .transform((v) => v || null);
}

export const freteSchema = z.object({
  cliente_id: z
    .string()
    .refine((v) => v === '' || z.guid().safeParse(v).success, 'Cliente inválido.')
    .transform((v) => v || null),
  valor: z
    .string()
    .trim()
    .min(1, 'Digite o valor do frete.')
    .transform((v, ctx) => {
      try {
        return reaisParaCentavos(v);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 4.500,00' });
        return z.NEVER;
      }
    }),
  peso_kg: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = lerDecimal(v);
      if (n === null || n <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Peso inválido (em kg).' });
        return z.NEVER;
      }
      return Math.round(n * 10) / 10;
    }),
  cte_chave: chaveOpcional('57', 'CT-e'),
  mdfe_chave: chaveOpcional('58', 'MDF-e'),
  observacoes: textoOpcional,
});

export type FreteForm = z.input<typeof freteSchema>;
export type FreteDados = z.output<typeof freteSchema>;
