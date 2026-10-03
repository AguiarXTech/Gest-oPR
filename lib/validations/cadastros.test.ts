import { describe, expect, it } from 'vitest';
import { caminhaoSchema } from './caminhao';
import { carretaSchema } from './carreta';
import { cadastroClienteSchema, clienteSchema } from './cliente';
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
    marca: 'Randon',
    ano: '2015',
    composicao: 'carreta',
    carroceria: 'Grade baixa',
    eixos: '3',
    eixos_suspensos: '1',
    observacoes: '',
  };
  it('normaliza a placa e converte eixos', () => {
    expect(carretaSchema.parse(base)).toEqual({
      placa: 'CAR1C11',
      apelido: null,
      marca: 'Randon',
      ano: 2015,
      composicao: 'carreta',
      carroceria: 'Grade baixa',
      eixos: 3,
      eixos_suspensos: 1,
      observacoes: null,
    });
  });
  it('suspensos precisam ser menos que os eixos', () =>
    expect(carretaSchema.safeParse({ ...base, eixos_suspensos: '3' }).success).toBe(false));
  it('configuração/tipo livre; vazia vira null', () =>
    expect(carretaSchema.parse({ ...base, composicao: '' }).composicao).toBeNull());
  it('recusa ano fora do intervalo', () =>
    expect(carretaSchema.safeParse({ ...base, ano: '1800' }).success).toBe(false));
  it('recusa placa inválida', () =>
    expect(carretaSchema.safeParse({ ...base, placa: '123' }).success).toBe(false));
});

describe('cadastroClienteSchema (vários produtos no cadastro)', () => {
  const liz = {
    produto: 'Cimento Liz',
    local: 'Vespasiano - MG',
    sentido: 'volta' as const,
    valor_frete: '5.080,00',
    vigencia_inicio: '2026-10-01',
  };
  const areia = {
    produto: 'Areia',
    local: 'Guanhães - MG',
    sentido: 'ida' as const,
    valor_frete: '1.500,00',
    vigencia_inicio: '2026-10-01',
  };
  const vazio = {
    produto: '',
    local: '',
    sentido: 'volta' as const,
    valor_frete: '',
    vigencia_inicio: '2026-10-01',
  };
  const base = {
    razao_social: 'Japa Cimentos',
    cnpj: '',
    contato: '',
    prazo_pagamento_dias: '',
    frete_automatico: true,
  };

  it('vários produtos, cada um com o seu trecho e frete', () => {
    const r = cadastroClienteSchema.parse({ ...base, produtos: [liz, areia] });
    expect(r.produtos).toMatchObject([
      { produto: 'Cimento Liz', local: 'Vespasiano - MG', sentido: 'volta', valor_frete: 508000 },
      { produto: 'Areia', sentido: 'ida', valor_frete: 150000 },
    ]);
  });
  it('linha em branco é ignorada', () =>
    expect(cadastroClienteSchema.parse({ ...base, produtos: [liz, vazio] }).produtos).toHaveLength(
      1,
    ));
  it('só a razão social, sem produtos', () =>
    expect(
      cadastroClienteSchema.parse({ ...base, frete_automatico: false, produtos: [vazio] }).produtos,
    ).toEqual([]));
  it('frete ou local sem produto não', () =>
    expect(
      cadastroClienteSchema.safeParse({ ...base, produtos: [{ ...liz, produto: '' }] }).success,
    ).toBe(false));
  it('lançar sozinho exige um frete', () =>
    expect(
      cadastroClienteSchema.safeParse({ ...base, produtos: [{ ...liz, valor_frete: '' }] }).success,
    ).toBe(false));
  it('frete exige a data de início', () =>
    expect(
      cadastroClienteSchema.safeParse({ ...base, produtos: [{ ...liz, vigencia_inicio: '' }] })
        .success,
    ).toBe(false));
});
