import { describe, expect, it } from 'vitest';
import { caminhaoSchema } from './caminhao';
import { carretaSchema } from './carreta';
import { clienteSchema } from './cliente';
import { fornecedorSchema } from './fornecedor';

describe('clienteSchema', () => {
  it('normaliza CNPJ e converte prazo', () => {
    const r = clienteSchema.parse({
      razao_social: 'Cliente',
      cnpj: '12.abc.345/01de-35',
      contato: '',
      prazo_pagamento_dias: '30',
    });
    expect(r).toEqual({
      razao_social: 'Cliente',
      cnpj: '12ABC34501DE35',
      contato: null,
      prazo_pagamento_dias: 30,
    });
  });

  it('CNPJ é opcional', () => {
    expect(
      clienteSchema.parse({
        razao_social: 'Cliente',
        cnpj: '',
        contato: '',
        prazo_pagamento_dias: '',
      }).cnpj,
    ).toBeNull();
  });

  it('recusa CNPJ com DV errado', () => {
    expect(
      clienteSchema.safeParse({
        razao_social: 'Cliente',
        cnpj: '11222333000182',
        contato: '',
        prazo_pagamento_dias: '',
      }).success,
    ).toBe(false);
  });
});

describe('fornecedorSchema', () => {
  it('aceita os tipos do banco', () => {
    expect(
      fornecedorSchema.parse({ nome: 'Posto BR', cnpj: '', tipo: 'posto', cidade: 'Guanhães' })
        .tipo,
    ).toBe('posto');
  });

  it('recusa tipo desconhecido', () => {
    expect(
      fornecedorSchema.safeParse({ nome: 'X', cnpj: '', tipo: 'banco', cidade: '' }).success,
    ).toBe(false);
  });
});

describe('caminhaoSchema (truck × cavalo)', () => {
  const base = {
    placa: 'abc-1d23',
    apelido: '',
    marca: '',
    modelo: '',
    ano: '',
    eixos: '3',
    configuracao_eixos: '',
    capacidade_tanque_l: '500',
    km_atual: '1000',
    observacoes: '',
    eixos_suspensos: '',
  };
  it('aceita truck e cavalo', () => {
    expect(caminhaoSchema.parse({ ...base, tipo: 'truck' }).tipo).toBe('truck');
    expect(caminhaoSchema.parse({ ...base, tipo: 'cavalo' }).tipo).toBe('cavalo');
  });
  it('recusa outro tipo', () =>
    expect(caminhaoSchema.safeParse({ ...base, tipo: 'carreta' }).success).toBe(false));
});

describe('carretaSchema', () => {
  const base = {
    placa: 'car-1c11',
    apelido: '',
    composicao: 'carreta',
    carroceria: 'Vanderléia',
    eixos: '3',
    eixos_suspensos: '1',
    observacoes: '',
  };
  it('normaliza a placa e converte eixos', () => {
    expect(carretaSchema.parse(base)).toEqual({
      placa: 'CAR1C11',
      apelido: null,
      composicao: 'carreta',
      carroceria: 'Vanderléia',
      eixos: 3,
      eixos_suspensos: 1,
      observacoes: null,
    });
  });
  it('suspensos precisam ser menos que os eixos', () =>
    expect(carretaSchema.safeParse({ ...base, eixos_suspensos: '3' }).success).toBe(false));
  it('composição só carreta, bitrem ou rodotrem', () =>
    expect(carretaSchema.safeParse({ ...base, composicao: 'treminhao' }).success).toBe(false));
  it('recusa placa inválida', () =>
    expect(carretaSchema.safeParse({ ...base, placa: '123' }).success).toBe(false));
});
