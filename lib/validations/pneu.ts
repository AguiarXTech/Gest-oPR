import { z } from 'zod';
import { centavosOpcional, dataOpcional, textoOpcional } from './comum';

// Cadastro do pneu (entra no estoque). Novo ou usado: do usado não se sabe o km de antes.

export const pneuSchema = z.object({
  marca_fogo: z
    .string()
    .trim()
    .min(1, 'Digite a marca de fogo (número gravado no pneu).')
    .transform((v) => v.toUpperCase()),
  marca: textoOpcional,
  modelo: textoOpcional,
  medida: textoOpcional,
  dot: textoOpcional,
  condicao_entrada: z.enum(['novo', 'usado']),
  valor_compra_centavos: centavosOpcional,
  data_compra: dataOpcional,
  fornecedor_id: z
    .string()
    .trim()
    .transform((v) => v || null),
  observacoes: textoOpcional,
});

export type PneuForm = z.input<typeof pneuSchema>;
export type PneuDados = z.output<typeof pneuSchema>;
