import { z } from 'zod';
import { centavosOpcional, cnpjOpcional, inteiroOpcional, textoOpcional } from './comum';

export const clienteSchema = z.object({
  razao_social: z.string().trim().min(2, 'Digite a razão social.'),
  cnpj: cnpjOpcional,
  contato: textoOpcional,
  prazo_pagamento_dias: inteiroOpcional(0, 365, 'Prazo em dias: de 0 a 365.'),
});

export type ClienteForm = z.input<typeof clienteSchema>;
export type ClienteDados = z.output<typeof clienteSchema>;

/**
 * Cadastro de cliente novo já com o frete e a carga (pedido de 2026-10-03): o produto + onde
 * (primeiro local de carga, que define o trecho) e o frete dele (primeira linha de precos_frete).
 * Tudo opcional; depois se edita na tela do cliente.
 */
/** Um produto do cadastro: produto + local (define o trecho) + frete. Linha toda em branco é ignorada. */
export const produtoCadastroSchema = z
  .object({
    produto: textoOpcional,
    local: textoOpcional,
    /** Trecho carregado, pelo lugar do produto (região de BH = volta). */
    sentido: z.enum(['ida', 'volta']),
    valor_frete: centavosOpcional,
    vigencia_inicio: z.string().trim(),
  })
  .superRefine((d, ctx) => {
    if ((d.local || d.valor_frete !== null) && !d.produto) {
      ctx.addIssue({
        code: 'custom',
        path: ['produto'],
        message: 'Digite o produto. Ex.: Cimento Liz',
      });
    }
    if (d.valor_frete !== null && d.valor_frete <= 0) {
      ctx.addIssue({ code: 'custom', path: ['valor_frete'], message: 'Digite o valor do frete.' });
    }
    if (d.valor_frete !== null && !/^\d{4}-\d{2}-\d{2}$/.test(d.vigencia_inicio)) {
      ctx.addIssue({
        code: 'custom',
        path: ['vigencia_inicio'],
        message: 'Informe desde quando vale.',
      });
    }
  });

export const cadastroClienteSchema = clienteSchema
  .extend({
    /** Um cliente pode mandar carregar vários produtos, cada um com o seu frete. */
    produtos: z.array(produtoCadastroSchema),
    frete_automatico: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (
      d.frete_automatico &&
      d.produtos.length > 0 &&
      !d.produtos.some((p) => p.produto && p.valor_frete !== null)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['produtos', 0, 'valor_frete'],
        message: 'Para lançar sozinho, informe o valor do frete.',
      });
    }
  })
  // linhas em branco ficam de fora
  .transform((d) => ({ ...d, produtos: d.produtos.filter((p) => p.produto) }));

export type CadastroClienteForm = z.input<typeof cadastroClienteSchema>;
export type CadastroClienteDados = z.output<typeof cadastroClienteSchema>;
