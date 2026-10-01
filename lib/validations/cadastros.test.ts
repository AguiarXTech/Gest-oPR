import { describe, expect, it } from 'vitest';
import { clienteSchema } from './cliente';
import { fornecedorSchema } from './fornecedor';

describe('clienteSchema', () => {
  it('normaliza CNPJ e converte prazo', () => {
    const r = clienteSchema.parse({ razao_social: 'Cliente', cnpj: '12.abc.345/01de-35', contato: '', prazo_pagamento_dias: '30' });
    expect(r).toEqual({ razao_social: 'Cliente', cnpj: '12ABC34501DE35', contato: null, prazo_pagamento_dias: 30 });
  });

  it('CNPJ é opcional', () => {
    expect(clienteSchema.parse({ razao_social: 'Cliente', cnpj: '', contato: '', prazo_pagamento_dias: '' }).cnpj).toBeNull();
  });

  it('recusa CNPJ com DV errado', () => {
    expect(clienteSchema.safeParse({ razao_social: 'Cliente', cnpj: '11222333000182', contato: '', prazo_pagamento_dias: '' }).success).toBe(false);
  });
});

describe('fornecedorSchema', () => {
  it('aceita os tipos do banco', () => {
    expect(fornecedorSchema.parse({ nome: 'Posto BR', cnpj: '', tipo: 'posto', cidade: 'Guanhães' }).tipo).toBe('posto');
  });

  it('recusa tipo desconhecido', () => {
    expect(fornecedorSchema.safeParse({ nome: 'X', cnpj: '', tipo: 'banco', cidade: '' }).success).toBe(false);
  });
});
