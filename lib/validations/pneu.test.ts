import { describe, expect, it } from 'vitest';
import { pneuSchema } from './pneu';

const base = {
  marca_fogo: ' f001 ',
  marca: 'Michelin',
  modelo: '',
  medida: '295/80 R22.5',
  dot: '',
  condicao_entrada: 'novo' as const,
  valor_compra_centavos: '2.500,00',
  data_compra: '2026-10-01',
  fornecedor_id: '',
  observacoes: '',
};

describe('pneuSchema', () => {
  it('marca de fogo em maiúsculas e valor em centavos', () => {
    expect(pneuSchema.parse(base)).toMatchObject({
      marca_fogo: 'F001',
      valor_compra_centavos: 250000,
      fornecedor_id: null,
      modelo: null,
    });
  });
  it('marca de fogo é obrigatória', () =>
    expect(pneuSchema.safeParse({ ...base, marca_fogo: ' ' }).success).toBe(false));
  it('usado é aceito', () =>
    expect(pneuSchema.parse({ ...base, condicao_entrada: 'usado' }).condicao_entrada).toBe(
      'usado',
    ));
});
