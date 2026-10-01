import { z } from 'zod';
import { cnpjOpcional, inteiroOpcional, textoOpcional } from './comum';

export const clienteSchema = z.object({
  razao_social: z.string().trim().min(2, 'Digite a razão social.'),
  cnpj: cnpjOpcional,
  contato: textoOpcional,
  prazo_pagamento_dias: inteiroOpcional(0, 365, 'Prazo em dias: de 0 a 365.'),
});

export type ClienteForm = z.input<typeof clienteSchema>;
export type ClienteDados = z.output<typeof clienteSchema>;
