import { describe, expect, it } from 'vitest';
import { alterarAtivoSchema, criarAcessoSchema } from './acesso';

describe('ids de funcionário', () => {
  // Ids fixos do seed não seguem a versão RFC do UUID; z.uuid() do Zod 4 os recusaria.
  it.each(['00000000-0000-0000-0000-0000000000f3', 'ba571e30-cef6-4243-8070-a65b0155e543'])('%s é aceito', (id) => {
    expect(alterarAtivoSchema.safeParse({ funcionarioId: id, ativo: 'false' }).success).toBe(true);
  });

  it('texto qualquer é recusado', () => {
    expect(alterarAtivoSchema.safeParse({ funcionarioId: 'abc', ativo: 'false' }).success).toBe(false);
  });
});

describe('criarAcessoSchema', () => {
  const base = { funcionarioId: '00000000-0000-0000-0000-0000000000f3', senha: 'senha-1234' };

  it('aceita motorista e admin', () => {
    expect(criarAcessoSchema.safeParse({ ...base, papel: 'motorista' }).success).toBe(true);
    expect(criarAcessoSchema.safeParse({ ...base, papel: 'admin' }).success).toBe(true);
  });

  it('recusa criar dono pela tela', () => {
    expect(criarAcessoSchema.safeParse({ ...base, papel: 'dono' }).success).toBe(false);
  });

  it('recusa senha com menos de 8 caracteres', () => {
    expect(criarAcessoSchema.safeParse({ ...base, papel: 'motorista', senha: '1234567' }).success).toBe(false);
  });
});
