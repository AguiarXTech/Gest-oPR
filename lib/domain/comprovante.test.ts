import { describe, expect, it } from 'vitest';
import { caminhoComprovante, dimensionar, LADO_MAXIMO } from './comprovante';

describe('caminhoComprovante (AGENTS.md §4.8)', () => {
  it('{funcionario_id}/{yyyy}/{mm}/{uuid}.jpg no mês de Brasília', () => {
    expect(caminhoComprovante('f1', new Date('2026-10-05T12:00:00Z'), 'abc')).toBe('f1/2026/10/abc.jpg');
  });

  it('virada do mês usa o horário de Brasília (01/10 01:00 UTC = 30/09)', () => {
    expect(caminhoComprovante('f1', new Date('2026-10-01T01:00:00Z'), 'abc')).toBe('f1/2026/09/abc.jpg');
  });
});

describe('dimensionar (maior lado ≤ 1600 px)', () => {
  it('foto de celular em pé (3024 × 4032) → 1200 × 1600', () => {
    expect(dimensionar(3024, 4032)).toEqual({ largura: 1200, altura: 1600 });
  });

  it('foto deitada (4032 × 3024) → 1600 × 1200', () => {
    expect(dimensionar(4032, 3024)).toEqual({ largura: 1600, altura: 1200 });
  });

  it('foto pequena não é ampliada', () => {
    expect(dimensionar(800, 600)).toEqual({ largura: 800, altura: 600 });
  });

  it('limite configurável', () => {
    expect(dimensionar(2000, 1000, 1000)).toEqual({ largura: 1000, altura: 500 });
    expect(LADO_MAXIMO).toBe(1600);
  });
});
