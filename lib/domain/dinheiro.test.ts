import { describe, expect, it } from 'vitest';
import {
  aplicarPercentual,
  formatarBRL,
  percentualParaPontosBase,
  reaisParaCentavos,
  valorPorDigitos,
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
    // teclado do celular com ponto decimal (o motorista digitou 115.50 e virava 11.550,00)
    ['115.50', 11550],
    ['115.5', 11550],
    ['0.99', 99],
    // ponto com 3 dígitos depois continua sendo milhar
    ['1.500', 150000],
    ['1.234.567', 123456700],
    ['1.500,00', 150000],
  ])('"%s" → %i', (texto, esperado) => {
    expect(reaisParaCentavos(texto)).toBe(esperado);
  });

  it('rejeita texto inválido', () => {
    expect(() => reaisParaCentavos('12,345')).toThrow(RangeError);
    expect(() => reaisParaCentavos('abc')).toThrow(RangeError);
  });
});

describe('valorPorDigitos (campo estilo maquininha: só números, da direita para a esquerda)', () => {
  it.each([
    ['', ''],
    ['1', '0,01'],
    ['11', '0,11'],
    ['115', '1,15'],
    ['11550', '115,50'],
    ['1155000', '11.550,00'],
    ['0011550', '115,50'],
    ['R$ 115,50', '115,50'],
    ['00', ''],
  ])('"%s" → "%s"', (entrada, esperado) => expect(valorPorDigitos(entrada)).toBe(esperado));
  it('no máximo 9 dígitos (R$ 9.999.999,99)', () =>
    expect(valorPorDigitos('12345678901')).toBe('1.234.567,89'));
  it('o resultado volta certo em centavos', () =>
    expect(reaisParaCentavos(valorPorDigitos('11550'))).toBe(11550));
});
