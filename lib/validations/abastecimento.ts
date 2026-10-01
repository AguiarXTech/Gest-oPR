import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { validarChave } from '@/lib/domain/nfce';
import { lerDecimal, lerInteiro } from '@/lib/domain/numeros';

export const FORMAS_PAGAMENTO = {
  motorista: 'Paguei (dinheiro meu)',
  cartao_empresa: 'Cartão da empresa',
  faturado: 'Faturado no posto',
} as const;

export const abastecimentoSchema = z.object({
  caminhao_id: z.guid('Escolha o caminhão.'),
  km: z
    .string()
    .trim()
    .min(1, 'Digite o km do painel.')
    .transform((v, ctx) => {
      const n = lerInteiro(v);
      if (n === null || n <= 0 || n > 9_999_999) {
        ctx.addIssue({ code: 'custom', message: 'Km inválido. Use só números, como está no painel.' });
        return z.NEVER;
      }
      return n;
    }),
  litros: z
    .string()
    .trim()
    .min(1, 'Digite os litros.')
    .transform((v, ctx) => {
      const n = lerDecimal(v);
      if (n === null || n <= 0 || n > 5000) {
        ctx.addIssue({ code: 'custom', message: 'Litros inválidos. Ex.: 185,32' });
        return z.NEVER;
      }
      return Math.round(n * 1000) / 1000; // numeric(10,3)
    }),
  valor_total: z
    .string()
    .trim()
    .min(1, 'Digite o valor total.')
    .transform((v, ctx) => {
      try {
        const centavos = reaisParaCentavos(v);
        if (centavos > 0) return centavos;
      } catch {
        // cai no erro abaixo
      }
      ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 1.120,50' });
      return z.NEVER;
    }),
  tanque_cheio: z.boolean(),
  forma_pagamento: z.enum(['motorista', 'cartao_empresa', 'faturado']),
  nfce_chave: z
    .string()
    .nullable()
    .refine((v) => v === null || validarChave(v), 'Chave da nota inválida.'),
  nfce_url: z.string().nullable(),
  foto_path: z.string({ error: 'Tire a foto do cupom.' }).min(1, 'Tire a foto do cupom.'),
});

export type AbastecimentoForm = z.input<typeof abastecimentoSchema>;
export type AbastecimentoDados = z.output<typeof abastecimentoSchema>;
