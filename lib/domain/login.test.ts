import { describe, expect, it } from 'vitest';
import { paraEmailDeLogin } from './login';

describe('paraEmailDeLogin (ADR-0001, Q8)', () => {
  it.each([
    ['00000000191', '00000000191@frota.local'],
    ['000.000.001-91', '00000000191@frota.local'],
    [' 000 000 001 91 ', '00000000191@frota.local'],
  ])('CPF %j vira e-mail interno', (entrada, esperado) => {
    expect(paraEmailDeLogin(entrada)).toBe(esperado);
  });

  it.each([
    ['dono@frota.local', 'dono@frota.local'],
    ['  Admin@Frota.Local ', 'admin@frota.local'],
    ['maria@gmail.com', 'maria@gmail.com'],
  ])('e-mail %j é normalizado', (entrada, esperado) => {
    expect(paraEmailDeLogin(entrada)).toBe(esperado);
  });

  it.each(['', '   ', '123', '0000000019', '000000001911', 'joao', 'joao@', '@frota.local'])(
    '%j é inválido',
    (entrada) => {
      expect(paraEmailDeLogin(entrada)).toBeNull();
    },
  );
});
