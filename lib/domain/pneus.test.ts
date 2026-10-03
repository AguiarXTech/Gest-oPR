import { describe, expect, it } from 'vitest';
import {
  kmCarretaNoPeriodo,
  kmDoPneu,
  kmMontagemCavalo,
  posicoesDoVeiculo,
  situacaoPneu,
} from './pneus';

describe('kmMontagemCavalo (hodômetro do caminhão)', () => {
  it('km de agora menos o km da montagem', () =>
    expect(kmMontagemCavalo(500_000, 512_300)).toBe(12_300));
  it('km menor que o da montagem (erro de digitação) não fica negativo', () =>
    expect(kmMontagemCavalo(500_000, 499_000)).toBe(0));
});

describe('kmCarretaNoPeriodo (carreta não tem hodômetro: soma das viagens)', () => {
  const viagens = [
    { carretaId: 'c1', dataSaida: '2026-09-01T10:00:00Z', kmRodado: 580 },
    { carretaId: 'c1', dataSaida: '2026-09-10T10:00:00Z', kmRodado: 600 },
    { carretaId: 'c2', dataSaida: '2026-09-12T10:00:00Z', kmRodado: 590 },
    { carretaId: 'c1', dataSaida: '2026-09-20T10:00:00Z', kmRodado: null }, // em andamento
    { carretaId: 'c1', dataSaida: '2026-10-01T10:00:00Z', kmRodado: 570 },
  ];
  it('viagens da carreta desde a montagem', () =>
    expect(kmCarretaNoPeriodo(viagens, 'c1', '2026-09-05T00:00:00Z', null)).toBe(1_170));
  it('até a retirada', () =>
    expect(kmCarretaNoPeriodo(viagens, 'c1', '2026-08-01T00:00:00Z', '2026-09-30T00:00:00Z')).toBe(
      1_180,
    ));
  it('outra carreta não conta', () =>
    expect(kmCarretaNoPeriodo(viagens, 'c2', '2026-01-01T00:00:00Z', null)).toBe(590));
});

describe('kmDoPneu', () => {
  const montagens = [
    { vida: 0, km: 80_000 },
    { vida: 0, km: 20_000 },
    { vida: 1, km: 15_000 }, // depois da 1ª recapagem
  ];
  it('pneu comprado novo: km da vida atual e km desde novo', () =>
    expect(kmDoPneu({ condicaoEntrada: 'novo', vida: 1 }, montagens)).toEqual({
      kmVidaAtual: 15_000,
      kmDesdeNovo: 115_000,
    }));
  it('pneu comprado usado: km desde novo não dá para calcular', () =>
    expect(kmDoPneu({ condicaoEntrada: 'usado', vida: 0 }, [{ vida: 0, km: 7_000 }])).toEqual({
      kmVidaAtual: 7_000,
      kmDesdeNovo: null,
    }));
  it('novo sem montagem: zero', () =>
    expect(kmDoPneu({ condicaoEntrada: 'novo', vida: 0 }, [])).toEqual({
      kmVidaAtual: 0,
      kmDesdeNovo: 0,
    }));
});

describe('situacaoPneu (o que aparece no estoque)', () => {
  it('novo', () => expect(situacaoPneu({ condicaoEntrada: 'novo', vida: 0 })).toBe('novo'));
  it('recapado (comprado novo ou usado)', () => {
    expect(situacaoPneu({ condicaoEntrada: 'novo', vida: 2 })).toBe('recapado');
    expect(situacaoPneu({ condicaoEntrada: 'usado', vida: 1 })).toBe('recapado');
  });
  it('usado', () => expect(situacaoPneu({ condicaoEntrada: 'usado', vida: 0 })).toBe('usado'));
});

describe('posicoesDoVeiculo', () => {
  it('caminhão: 1º eixo simples, demais duplos', () =>
    expect(posicoesDoVeiculo(3, true)).toEqual([
      '1E',
      '1D',
      '2EE',
      '2EI',
      '2DI',
      '2DE',
      '3EE',
      '3EI',
      '3DI',
      '3DE',
      'Estepe',
    ]));
  it('carreta: todos os eixos duplos', () =>
    expect(posicoesDoVeiculo(2, false)).toEqual([
      '1EE',
      '1EI',
      '1DI',
      '1DE',
      '2EE',
      '2EI',
      '2DI',
      '2DE',
      'Estepe',
    ]));
  it('sem eixos no cadastro: só estepe (digita a posição)', () =>
    expect(posicoesDoVeiculo(null, true)).toEqual(['Estepe']));
});
