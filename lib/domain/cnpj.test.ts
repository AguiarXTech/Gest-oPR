import { describe, expect, it } from 'vitest';
import { formatarCnpj, normalizarCnpj, validarCnpj } from './cnpj';

describe('normalizarCnpj', () => {
  it('remove pontuação e passa para maiúsculas', () => {
    expect(normalizarCnpj(' 11.222.333/0001-81 ')).toBe('11222333000181');
    expect(normalizarCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });
});

describe('validarCnpj', () => {
  it.each([
    '11222333000181', // numérico (seed)
    '11.222.333/0001-81',
    '12ABC34501DE35', // alfanumérico (exemplo da Receita, a partir de 07/2026)
    '12.abc.345/01de-35',
  ])('%j é válido', (cnpj) => {
    expect(validarCnpj(cnpj)).toBe(true);
  });

  it.each([
    '11222333000182', // DV errado
    '12ABC34501DE36', // DV errado (alfanumérico)
    '00000000000000', // todos iguais
    '1122233300018', // 13 caracteres
    '12ABC34501DEAB', // DV precisa ser número
    '',
  ])('%j é inválido', (cnpj) => {
    expect(validarCnpj(cnpj)).toBe(false);
  });
});

describe('formatarCnpj', () => {
  it('numérico', () => expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81'));
  it('alfanumérico', () => expect(formatarCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35'));
  it('fora do padrão volta como está', () => expect(formatarCnpj('123')).toBe('123'));
});
