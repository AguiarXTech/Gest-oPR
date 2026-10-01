import { describe, expect, it } from 'vitest';
import { formatarPlaca, normalizarPlaca, validarPlaca } from './placa';

describe('normalizarPlaca', () => {
  it.each([
    ['abc-1234', 'ABC1234'],
    [' abc 1d23 ', 'ABC1D23'],
    ['ABC1D23', 'ABC1D23'],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizarPlaca(entrada)).toBe(esperado);
  });
});

describe('validarPlaca (formato antigo e Mercosul)', () => {
  it.each(['ABC1234', 'abc-1234', 'ABC1D23', 'abc1d23', 'GHI7J89'])('%j é válida', (placa) => {
    expect(validarPlaca(placa)).toBe(true);
  });

  it.each(['', 'AB1234', 'ABCD123', 'ABC12345', '1BC1234', 'ABC1DD3', 'ABC12D3', 'ÁBC1234'])(
    '%j é inválida',
    (placa) => {
      expect(validarPlaca(placa)).toBe(false);
    },
  );
});

describe('formatarPlaca', () => {
  it('antiga ganha hífen', () => expect(formatarPlaca('ABC1234')).toBe('ABC-1234'));
  it('Mercosul fica sem hífen', () => expect(formatarPlaca('ABC1D23')).toBe('ABC1D23'));
});
