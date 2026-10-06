import { z } from 'zod';
import { lerInteiro } from '@/lib/domain/numeros';

const kmObrigatorio = (mensagem: string) =>
  z
    .string()
    .trim()
    .min(1, mensagem)
    .transform((v, ctx) => {
      const n = lerInteiro(v);
      if (n === null || n <= 0 || n > 9_999_999) {
        ctx.addIssue({
          code: 'custom',
          message: 'Km inválido. Use só números, como está no painel.',
        });
        return z.NEVER;
      }
      return n;
    });

export const iniciarViagemSchema = z.object({
  caminhao_id: z.guid('Escolha o caminhão.'),
  /** Carreta puxada pelo cavalo: id, 'sem' (cavalo sozinho) ou '' (truck / ainda não escolheu). */
  carreta_id: z
    .union([z.literal(''), z.literal('sem'), z.guid()])
    .transform((v) => (v === '' || v === 'sem' ? null : v)),
  origem: z.string().trim().min(2, 'Digite a origem.'),
  destino: z.string().trim().min(2, 'Digite o destino.'),
  km_saida: kmObrigatorio('Digite o km do painel na saída.'),
});

export const finalizarViagemSchema = z.object({
  km_chegada: kmObrigatorio('Digite o km do painel na chegada.'),
  /**
   * O que carregou: escolhido só ao finalizar, porque a carga pode trocar no meio da
   * viagem (pedido de 2026-10-06). Id do produto do cliente, ou 'outro' / ''.
   */
  local_carga_id: z
    .union([z.literal(''), z.literal('outro'), z.guid()])
    .transform((v) => (v === '' || v === 'outro' ? null : v)),
});

export type IniciarViagemForm = z.input<typeof iniciarViagemSchema>;
export type IniciarViagemDados = z.output<typeof iniciarViagemSchema>;
export type FinalizarViagemForm = z.input<typeof finalizarViagemSchema>;
export type FinalizarViagemDados = z.output<typeof finalizarViagemSchema>;
