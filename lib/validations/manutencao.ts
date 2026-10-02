import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { lerInteiro } from '@/lib/domain/numeros';
import { dataOpcional, inteiroOpcional, textoOpcional } from './comum';

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

export const itemPlanoSchema = z
  .object({
    caminhao_id: z.string(),
    todos: z.boolean(),
    item: z.string().trim().min(2, 'Digite o item. Ex.: Troca de óleo'),
    intervalo_km: inteiroOpcional(100, 1_000_000, 'Km inválido.'),
    intervalo_dias: inteiroOpcional(1, 3650, 'Dias inválidos.'),
    ultimo_km: inteiroOpcional(0, 9_999_999, 'Km inválido.'),
    ultima_data: dataOpcional,
    observacoes: textoOpcional,
  })
  .superRefine((v, ctx) => {
    if (v.intervalo_km === null && v.intervalo_dias === null) {
      ctx.addIssue({ code: 'custom', path: ['intervalo_km'], message: 'Informe o intervalo em km, em dias ou os dois.' });
    }
    if (!v.todos && !v.caminhao_id) ctx.addIssue({ code: 'custom', path: ['caminhao_id'], message: 'Escolha o caminhão.' });
  });

export const manutencaoSchema = z.object({
  caminhao_id: z.guid('Escolha o caminhão.'),
  data,
  km: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = lerInteiro(v);
      if (n === null || n <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Digite o km do painel.' });
        return z.NEVER;
      }
      return n;
    }),
  tipo: z.enum(['preventiva', 'corretiva']),
  descricao: z.string().trim().min(3, 'Descreva o que foi feito.'),
  valor: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return 0;
      try {
        return reaisParaCentavos(v);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 1.200,00' });
        return z.NEVER;
      }
    }),
  fornecedor_id: z.string().transform((v) => v || null),
  itens: z.array(z.string()),
});

export type ItemPlanoForm = z.input<typeof itemPlanoSchema>;
export type ItemPlanoDados = z.output<typeof itemPlanoSchema>;
export type ManutencaoForm = z.input<typeof manutencaoSchema>;
export type ManutencaoDados = z.output<typeof manutencaoSchema>;
