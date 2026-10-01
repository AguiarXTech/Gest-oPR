import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { textoOpcional } from './comum';

export const FORMAS_ADIANTAMENTO = ['PIX', 'Dinheiro', 'Transferência', 'Outro'] as const;

export const adiantamentoSchema = z.object({
  motorista_id: z.guid('Escolha o motorista.'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
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
      ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 500,00' });
      return z.NEVER;
    }),
  forma: z.enum(FORMAS_ADIANTAMENTO, 'Escolha a forma.'),
  observacao: textoOpcional,
});

export type AdiantamentoForm = z.input<typeof adiantamentoSchema>;
export type AdiantamentoDados = z.output<typeof adiantamentoSchema>;
