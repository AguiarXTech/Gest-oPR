import { describe, expect, it } from 'vitest';
import {
  aplicarPercentual,
  formatarBRL,
  percentualParaPontosBase,
  reaisParaCentavos,
  somarCentavos,
} from './dinheiro';

describe('aplicarPercentual (regras §1)', () => {
  it.each([
    [450000, 1250, 56250],
    [333333, 1000, 33333],
    [5, 1000, 1], // 0,5 → 1
  ])('%i centavos × %i pb = %i', (centavos, pb, esperado) => {
    expect(aplicarPercentual(centavos, pb)).toBe(esperado);
  });

  it('rejeita valor não inteiro ou negativo', () => {
    expect(() => aplicarPercentual(10.5, 1000)).toThrow(RangeError);
    expect(() => aplicarPercentual(-1, 1000)).toThrow(RangeError);
  });
});

describe('percentualParaPontosBase', () => {
  it('converte numeric(5,2) para pontos-base', () => {
    expect(percentualParaPontosBase(12.5)).toBe(1250);
    expect(percentualParaPontosBase(10)).toBe(1000);
    expect(percentualParaPontosBase(0.01)).toBe(1);
  });

  it('rejeita fora de 0–100', () => {
    expect(() => percentualParaPontosBase(-1)).toThrow(RangeError);
    expect(() => percentualParaPontosBase(100.01)).toThrow(RangeError);
  });
});

describe('somarCentavos', () => {
  it('arredonda por item e depois soma', () => {
    const itens = [333333, 333333, 333334].map((v) => aplicarPercentual(v, 1000));
    expect(somarCentavos(itens)).toBe(33333 + 33333 + 33333);
  });
});

describe('formatarBRL', () => {
  it('formata em pt-BR', () => {
    expect(formatarBRL(164540).replace(/\s/g, ' ')).toBe('R$ 1.645,40');
  });
});

describe('reaisParaCentavos', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,5', 123450],
    ['R$ 10', 1000],
    ['0,01', 1],
  ])('"%s" → %i', (texto, esperado) => {
    expect(reaisParaCentavos(texto)).toBe(esperado);
  });

  it('rejeita texto inválido', () => {
    expect(() => reaisParaCentavos('12,345')).toThrow(RangeError);
    expect(() => reaisParaCentavos('abc')).toThrow(RangeError);
  });
});
