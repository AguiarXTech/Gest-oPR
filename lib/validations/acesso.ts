import { z } from 'zod';

// Acesso ao app de um funcionário. O login é sempre o CPF (e-mail interno
// {cpf}@frota.local, ADR-0001). O papel "dono" não é criado pela tela.

const senha = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(72, 'Senha longa demais.');

export const criarAcessoSchema = z.object({
  funcionarioId: z.uuid(),
  papel: z.enum(['motorista', 'admin'], 'Escolha o tipo de acesso.'),
  senha,
});

export const redefinirSenhaSchema = z.object({
  funcionarioId: z.uuid(),
  senha,
});
