import { describe, expect, it } from 'vitest';
import { calcularMedicoes, mediaPonderada, type AbastecimentoConsumo } from './consumo';

const ab = (id: string, km: number, litros: number, tanqueCheio = true, dataHora = '2026-10-01T10:00:00Z'): AbastecimentoConsumo => ({
  id,
  km,
  litros,
  tanqueCheio,
  dataHora,
});

describe('calcularMedicoes (regras §4, método tanque cheio)', () => {
  it('dois cheios: 580 km / 190 L = 3,05 km/L', () => {
    const [m] = calcularMedicoes([ab('A1', 100000, 300), ab('A2', 100580, 190)]);
    expect(m).toMatchObject({ abastecimentoId: 'A2', distancia: 580, litros: 190 });
    expect(m.kmL).toBeCloseTo(3.05, 2);
  });

  it('parcial entra na próxima medição: 600 km / (80 + 110) L = 3,16 km/L; A2 sem medição', () => {
    const medicoes = calcularMedicoes([ab('A1', 100000, 300), ab('A2', 100300, 80, false), ab('A3', 100600, 110)]);
    expect(medicoes).toHaveLength(1);
    expect(medicoes[0]).toMatchObject({ abastecimentoId: 'A3', distancia: 600, litros: 190 });
    expect(medicoes[0].kmL).toBeCloseTo(3.16, 2);
  });

  it('primeiro abastecimento do caminhão: sem medição', () => {
    expect(calcularMedicoes([ab('A1', 100000, 300)])).toEqual([]);
  });

  it('ordena por km e data, não pela ordem recebida', () => {
    const medicoes = calcularMedicoes([ab('A2', 100580, 190), ab('A1', 100000, 300)]);
    expect(medicoes.map((m) => m.abastecimentoId)).toEqual(['A2']);
  });

  it('parciais antes do primeiro cheio não geram medição', () => {
    expect(calcularMedicoes([ab('A0', 99800, 50, false), ab('A1', 100000, 300)])).toEqual([]);
  });

  it('soma litros com 3 casas sem erro de ponto flutuante', () => {
    const [m] = calcularMedicoes([ab('A1', 0 + 1, 1), ab('A2', 101, 0.1, false), ab('A3', 201, 0.2)]);
    expect(m.litros).toBe(0.3);
  });

  it('distância zero ou negativa (km digitado errado) não gera medição', () => {
    expect(calcularMedicoes([ab('A1', 100000, 300), ab('A2', 100000, 190)])).toEqual([]);
  });
});

describe('mediaPonderada', () => {
  it('Σ distâncias ÷ Σ litros, não média das médias', () => {
    const medicoes = calcularMedicoes([ab('A1', 0 + 100000, 300), ab('A2', 100600, 200), ab('A3', 100900, 50)]);
    // (600 + 300) / (200 + 50) = 3,6 (a média das médias daria (3 + 6) / 2 = 4,5)
    expect(mediaPonderada(medicoes)).toBeCloseTo(3.6, 5);
  });

  it('sem medições → null', () => expect(mediaPonderada([])).toBeNull());
});
