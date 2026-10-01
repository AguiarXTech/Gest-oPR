import { describe, expect, it } from 'vitest';
import { formatarCpf, normalizarCpf, validarCpf } from './cpf';

describe('normalizarCpf', () => {
  it('remove pontos, hífen e espaços', () => expect(normalizarCpf(' 000.000.001-91 ')).toBe('00000000191'));
});

describe('validarCpf (dígitos verificadores)', () => {
  it.each(['00000000191', '000.000.001-91', '00000000272', '00000000353', '529.982.247-25'])('%j é válido', (cpf) => {
    expect(validarCpf(cpf)).toBe(true);
  });

  it.each([
    '00000000192', // DV errado
    '529.982.247-24', // DV errado
    '11111111111', // todos iguais
    '00000000000',
    '1234567890', // 10 dígitos
    '123456789012',
    'abc.def.ghi-jk',
    '',
  ])('%j é inválido', (cpf) => {
    expect(validarCpf(cpf)).toBe(false);
  });
});

describe('formatarCpf', () => {
  it('11 dígitos ganham pontos e hífen', () => expect(formatarCpf('52998224725')).toBe('529.982.247-25'));
  it('texto fora do padrão volta como está', () => expect(formatarCpf('123')).toBe('123'));
});
