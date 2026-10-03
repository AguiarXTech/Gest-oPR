import { describe, expect, it } from 'vitest';
import {
  CARROCERIAS,
  COMPOSICOES_CARRETA,
  CONFIGURACOES_CAMINHAO,
  eixosSugeridos,
} from './veiculos';

describe('classificação dos veículos', () => {
  it('peça única: toco, truck, bitruck', () => {
    expect(CONFIGURACOES_CAMINHAO.truck.map((c) => c.valor)).toEqual(['toco', 'truck', 'bitruck']);
  });
  it('cavalo: 4x2, 6x2, 6x4', () => {
    expect(CONFIGURACOES_CAMINHAO.cavalo.map((c) => c.valor)).toEqual(['4x2', '6x2', '6x4']);
  });
  it('composições da carreta', () => {
    expect(COMPOSICOES_CARRETA.map((c) => c.valor)).toEqual(['carreta', 'bitrem', 'rodotrem']);
  });
  it('carrocerias incluem vanderléia, tanque e caçamba', () => {
    expect(CARROCERIAS).toEqual(expect.arrayContaining(['Vanderléia', 'Tanque', 'Caçamba']));
  });
});

describe('eixosSugeridos', () => {
  it.each([
    ['toco', 2],
    ['truck', 3],
    ['bitruck', 4],
    ['4x2', 2],
    ['6x2', 3],
    ['6x4', 3],
    ['carreta', 3],
    ['bitrem', 4],
    ['rodotrem', 6],
  ])('%s → %i eixos', (valor, eixos) => expect(eixosSugeridos(valor)).toBe(eixos));
  it('desconhecido → null', () => expect(eixosSugeridos('outro')).toBeNull());
});
