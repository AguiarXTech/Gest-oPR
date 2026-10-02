import { describe, expect, it } from 'vitest';
import { ordenarPorUrgencia, situacaoItem, type ItemPlano } from './manutencao';

const HOJE = '2026-10-01';
const oleo: ItemPlano = { intervaloKm: 20000, intervaloDias: 180, ultimoKm: 100000, ultimaData: '2026-06-01' };
const s = (item: ItemPlano, km: number) => situacaoItem(item, km, HOJE, 1000, 15);

describe('situacaoItem (km e tempo, vale o que vencer primeiro)', () => {
  it('em dia: faltam 5.000 km e 58 dias (01/06 + 180 dias = 28/11)', () => {
    expect(s(oleo, 115000)).toEqual({ status: 'ok', faltaKm: 5000, faltaDias: 58 });
  });

  it('próximo pelo km: faltam 800 km (aviso 1.000)', () => {
    expect(s(oleo, 119200).status).toBe('proximo');
  });

  it('próximo pelo tempo: faltam 10 dias (aviso 15)', () => {
    expect(s({ ...oleo, ultimaData: '2026-04-14' }, 105000)).toMatchObject({ status: 'proximo', faltaDias: 10 });
  });

  it('vencido pelo km mesmo com tempo sobrando', () => {
    expect(s(oleo, 120500)).toMatchObject({ status: 'vencido', faltaKm: -500 });
  });

  it('vencido pelo tempo mesmo com km sobrando', () => {
    expect(s({ ...oleo, ultimaData: '2026-03-01' }, 101000).status).toBe('vencido');
  });

  it('só por km (sem intervalo de tempo)', () => {
    expect(s({ ...oleo, intervaloDias: null, ultimaData: null }, 115000)).toEqual({ status: 'ok', faltaKm: 5000, faltaDias: null });
  });

  it('nunca registrado: sem_registro', () => {
    expect(s({ ...oleo, ultimoKm: null, ultimaData: null }, 115000).status).toBe('sem_registro');
  });
});

describe('ordenarPorUrgencia', () => {
  it('vencido, sem registro, próximo, em dia; dentro do grupo, o que falta menos km', () => {
    const lista = [
      { id: 'ok', situacao: s(oleo, 110000) },
      { id: 'prox', situacao: s(oleo, 119500) },
      { id: 'venc', situacao: s(oleo, 125000) },
      { id: 'sem', situacao: s({ ...oleo, ultimoKm: null, ultimaData: null }, 0) },
      { id: 'ok2', situacao: s(oleo, 114000) },
    ];
    expect(ordenarPorUrgencia(lista).map((x) => x.id)).toEqual(['venc', 'sem', 'prox', 'ok2', 'ok']);
  });
});
