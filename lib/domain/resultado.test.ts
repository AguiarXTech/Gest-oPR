import { describe, expect, it } from 'vitest';
import { competencia, ratearDiesel } from './resultado';

describe('ratearDiesel (regras §8.2)', () => {
  it('diesel do mês × km da viagem / km do mês', () => {
    // R$ 6.000 de diesel, viagem de 580 km num mês de 1.740 km → 1/3
    expect(ratearDiesel(600000, 580, 1740)).toBe(200000);
  });

  it('arredonda para centavos inteiros', () => {
    expect(ratearDiesel(100, 1, 3)).toBe(33);
  });

  it('mês sem km ou viagem sem km → 0', () => {
    expect(ratearDiesel(600000, 580, 0)).toBe(0);
    expect(ratearDiesel(600000, 0, 1000)).toBe(0);
  });
});

describe('competencia', () => {
  it('mês no horário de Brasília', () => {
    expect(competencia('2026-10-01T02:00:00Z')).toBe('2026-09');
    expect(competencia('2026-10-01T12:00:00Z')).toBe('2026-10');
  });
});
