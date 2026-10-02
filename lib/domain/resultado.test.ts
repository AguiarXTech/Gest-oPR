import { describe, expect, it } from 'vitest';
import { calcularResultado, competencia, ratearDiesel } from './resultado';

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

describe('calcularResultado (regras §8.1)', () => {
  it('receita − diesel − pedágio − despesas − comissão', () => {
    const r = calcularResultado({
      viagens: [
        { freteCentavos: 450000, kmRodado: 580, comissaoCentavos: 15000 },
        { freteCentavos: 570000, kmRodado: 600, comissaoCentavos: 15000 },
      ],
      dieselCentavos: 230000,
      litros: 400,
      pedagioCentavos: 19440,
      despesasCentavos: 8000,
    });
    expect(r).toMatchObject({
      receitaCentavos: 1020000,
      comissaoCentavos: 30000,
      resultadoCentavos: 1020000 - 230000 - 19440 - 8000 - 30000,
      km: 1180,
      custoPorKmCentavos: Math.round((230000 + 19440 + 8000 + 30000) / 1180),
    });
    expect(r.kmPorLitro).toBeCloseTo(2.95, 2);
  });

  it('manutenção entra no custo', () => {
    const r = calcularResultado({
      viagens: [{ freteCentavos: 450000, kmRodado: 580, comissaoCentavos: 15000 }],
      dieselCentavos: 0,
      litros: 0,
      pedagioCentavos: 0,
      despesasCentavos: 0,
      manutencaoCentavos: 120000,
    });
    expect(r).toMatchObject({ manutencaoCentavos: 120000, resultadoCentavos: 450000 - 15000 - 120000 });
  });

  it('mês sem viagens: resultado negativo do que gastou, sem custo por km', () => {
    const r = calcularResultado({ viagens: [], dieselCentavos: 50000, litros: 80, pedagioCentavos: 0, despesasCentavos: 0 });
    expect(r).toMatchObject({ receitaCentavos: 0, resultadoCentavos: -50000, custoPorKmCentavos: null, kmPorLitro: null });
  });
});
