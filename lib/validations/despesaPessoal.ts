import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { textoOpcional } from './comum';

export const CATEGORIAS_PESSOAIS = {
  alimentacao: 'Alimentação',
  pernoite: 'Pernoite',
  higiene: 'Banho e higiene',
  saude: 'Saúde',
  outros: 'Outros',
} as const;

type Categoria = keyof typeof CATEGORIAS_PESSOAIS;

export const despesaPessoalSchema = z.object({
  categoria: z.enum(Object.keys(CATEGORIAS_PESSOAIS) as [Categoria, ...Categoria[]]),
  valor: z
    .string()
    .trim()
    .min(1, 'Digite o valor.')
    .transform((v, ctx) => {
      try {
        const c = reaisParaCentavos(v);
        if (c > 0) return c;
      } catch {
        // cai no erro abaixo
      }
      ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 32,50' });
      return z.NEVER;
    }),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  descricao: textoOpcional,
});

export type DespesaPessoalForm = z.input<typeof despesaPessoalSchema>;
export type DespesaPessoalDados = z.output<typeof despesaPessoalSchema>;
