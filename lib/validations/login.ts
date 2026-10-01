import { z } from 'zod';
import { paraEmailDeLogin } from '@/lib/domain/login';

export const loginSchema = z.object({
  usuario: z
    .string()
    .trim()
    .min(1, 'Digite seu CPF ou e-mail.')
    .refine((valor) => paraEmailDeLogin(valor) !== null, 'CPF deve ter 11 números, ou digite um e-mail válido.'),
  senha: z.string().min(1, 'Digite sua senha.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
