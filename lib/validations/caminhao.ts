import { z } from 'zod';
import { lerDecimal, lerInteiro } from '@/lib/domain/numeros';
import { normalizarPlaca, validarPlaca } from '@/lib/domain/placa';
import { inteiroOpcional, textoOpcional } from './comum';

// Os campos chegam do formulário como texto; o schema converte para o formato do banco.

export const caminhaoSchema = z.object({
  placa: z
    .string()
    .trim()
    .min(1, 'Digite a placa.')
    .refine(validarPlaca, 'Placa inválida. Use o formato ABC1234 ou ABC1D23.')
    .transform(normalizarPlaca),
  apelido: textoOpcional,
  marca: textoOpcional,
  modelo: textoOpcional,
  ano: inteiroOpcional(1950, 2100, 'Ano inválido.'),
  eixos: inteiroOpcional(2, 9, 'Eixos: de 2 a 9.'),
  configuracao_eixos: textoOpcional,
  capacidade_tanque_l: z
    .string()
    .trim()
    .min(1, 'Digite a capacidade do tanque.')
    .transform((v, ctx) => {
      const n = lerDecimal(v);
      if (n === null || n <= 0 || n > 99999) {
        ctx.addIssue({ code: 'custom', message: 'Capacidade inválida (em litros).' });
        return z.NEVER;
      }
      return Math.round(n * 10) / 10; // numeric(7,1)
    }),
  km_atual: z
    .string()
    .trim()
    .min(1, 'Digite o km atual do painel.')
    .transform((v, ctx) => {
      const n = lerInteiro(v);
      if (n === null || n > 9_999_999) {
        ctx.addIssue({ code: 'custom', message: 'Km inválido. Use só números.' });
        return z.NEVER;
      }
      return n;
    }),
  observacoes: textoOpcional,
});

export type CaminhaoForm = z.input<typeof caminhaoSchema>;
export type CaminhaoDados = z.output<typeof caminhaoSchema>;
