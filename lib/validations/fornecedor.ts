import { z } from 'zod';
import type { Enums } from '@/lib/database.types';
import { cnpjOpcional, textoOpcional } from './comum';

export const TIPOS_FORNECEDOR = {
  posto: 'Posto de combustível',
  oficina: 'Oficina',
  recapadora: 'Recapadora',
  loja: 'Loja de peças',
  outro: 'Outro',
} as const satisfies Record<Enums<'tipo_fornecedor'>, string>;

export const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, 'Digite o nome.'),
  cnpj: cnpjOpcional,
  tipo: z.enum(Object.keys(TIPOS_FORNECEDOR) as [Enums<'tipo_fornecedor'>, ...Enums<'tipo_fornecedor'>[]], 'Escolha o tipo.'),
  cidade: textoOpcional,
});

export type FornecedorForm = z.input<typeof fornecedorSchema>;
export type FornecedorDados = z.output<typeof fornecedorSchema>;
