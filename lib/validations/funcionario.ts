import { z } from 'zod';
import { normalizarCpf, validarCpf } from '@/lib/domain/cpf';
import { centavosOpcional, dataOpcional, textoOpcional } from './comum';

export const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

export const funcionarioSchema = z.object({
  nome: z.string().trim().min(3, 'Digite o nome completo.'),
  cpf: z
    .string()
    .trim()
    .min(1, 'Digite o CPF.')
    .refine(validarCpf, 'CPF inválido. Confira os números.')
    .transform(normalizarCpf),
  telefone: textoOpcional,
  cargo: z.string().trim().min(1, 'Digite o cargo.'),
  data_admissao: dataOpcional,
  salario_base_centavos: centavosOpcional,
  cnh_numero: textoOpcional,
  cnh_categoria: z.union([z.enum(CATEGORIAS_CNH), z.literal('')]).transform((v) => v || null),
  pix_chave: textoOpcional,
  observacoes: textoOpcional,
});

export type FuncionarioForm = z.input<typeof funcionarioSchema>;
export type FuncionarioDados = z.output<typeof funcionarioSchema>;
