import { describe, expect, it } from 'vitest';
import { lerDecimal, lerInteiro } from './numeros';

describe('lerInteiro (km, ano, eixos)', () => {
  it.each([
    ['480000', 480000],
    ['480.000', 480000],
    [' 1.234.567 ', 1234567],
    ['0', 0],
  ])('%j → %i', (texto, esperado) => {
    expect(lerInteiro(texto)).toBe(esperado);
  });

  it.each(['', '  ', 'abc', '12,5', '-10', '1.23', '12a'])('%j → null', (texto) => {
    expect(lerInteiro(texto)).toBeNull();
  });
});

describe('lerDecimal (litros, padrão brasileiro)', () => {
  it.each([
    ['300', 300],
    ['300,5', 300.5],
    ['1.250,75', 1250.75],
    ['300.5', 300.5], // ponto decimal digitado no teclado numérico
    ['1.250', 1250], // ponto de milhar
  ])('%j → %d', (texto, esperado) => {
    expect(lerDecimal(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '1,2,3', '-5', '12,5a'])('%j → null', (texto) => {
    expect(lerDecimal(texto)).toBeNull();
  });
});
