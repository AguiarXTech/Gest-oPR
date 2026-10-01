import { z } from 'zod';
import type { Enums } from '@/lib/database.types';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';

export const TIPOS_DESPESA = {
  pedagio: 'Pedágio',
  alimentacao: 'Alimentação',
  pernoite: 'Pernoite',
  chapa: 'Chapa',
  borracharia: 'Borracharia',
  manutencao: 'Manutenção',
  estacionamento: 'Estacionamento',
  lavagem: 'Lavagem',
  outros: 'Outros',
} as const satisfies Record<Enums<'tipo_despesa'>, string>;

type TipoDespesa = Enums<'tipo_despesa'>;

export const despesaSchema = z.object({
  tipo: z.enum(Object.keys(TIPOS_DESPESA) as [TipoDespesa, ...TipoDespesa[]], 'Escolha o tipo da despesa.'),
  valor: z
    .string()
    .trim()
    .min(1, 'Digite o valor.')
    .transform((v, ctx) => {
      try {
        const centavos = reaisParaCentavos(v);
        if (centavos > 0) return centavos;
      } catch {
        // cai no erro abaixo
      }
      ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 45,90' });
      return z.NEVER;
    }),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  descricao: z
    .string()
    .trim()
    .max(200, 'Descrição longa demais.')
    .transform((v) => v || null),
  foto_path: z.string({ error: 'Tire a foto do comprovante.' }).min(1, 'Tire a foto do comprovante.'),
});

export type DespesaForm = z.input<typeof despesaSchema>;
export type DespesaDados = z.output<typeof despesaSchema>;
