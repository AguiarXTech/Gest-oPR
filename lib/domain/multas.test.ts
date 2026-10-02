import { describe, expect, it } from 'vitest';
import { diasAte, motoristaNaHora, prazoIndicacao, situacaoMulta } from './multas';

const viagens = [
  { motoristaId: 'm1', caminhaoId: 'c1', dataSaida: '2026-09-10T08:00:00-03:00', dataChegada: '2026-09-12T18:00:00-03:00' },
  { motoristaId: 'm2', caminhaoId: 'c1', dataSaida: '2026-09-14T08:00:00-03:00', dataChegada: null }, // em andamento
  { motoristaId: 'm3', caminhaoId: 'c2', dataSaida: '2026-09-10T08:00:00-03:00', dataChegada: '2026-09-12T18:00:00-03:00' },
];

describe('motoristaNaHora', () => {
  it('pega o motorista da viagem do caminhão naquele momento', () => {
    expect(motoristaNaHora(viagens, 'c1', '2026-09-11T15:30:00-03:00')).toBe('m1');
    expect(motoristaNaHora(viagens, 'c2', '2026-09-11T15:30:00-03:00')).toBe('m3');
  });

  it('viagem ainda em andamento vale até agora', () => {
    expect(motoristaNaHora(viagens, 'c1', '2026-09-20T10:00:00-03:00')).toBe('m2');
  });

  it('caminhão parado (entre viagens): ninguém', () => {
    expect(motoristaNaHora(viagens, 'c1', '2026-09-13T10:00:00-03:00')).toBeNull();
  });
});

describe('prazo e situação', () => {
  it('prazo = notificação + 30 dias', () => expect(prazoIndicacao('2026-09-28', 30)).toBe('2026-10-28'));

  it.each([
    [{ prazoIndicacao: '2026-10-28', indicadoEm: null, pagoEm: null }, 'indicar'],
    [{ prazoIndicacao: '2026-09-30', indicadoEm: null, pagoEm: null }, 'indicar_atrasado'],
    [{ prazoIndicacao: '2026-10-28', indicadoEm: '2026-10-01', pagoEm: null }, 'pagar'],
    [{ prazoIndicacao: null, indicadoEm: null, pagoEm: null }, 'pagar'],
    [{ prazoIndicacao: '2026-10-28', indicadoEm: '2026-10-01', pagoEm: '2026-10-05' }, 'resolvida'],
  ])('%j → %s', (m, esperado) => expect(situacaoMulta(m, '2026-10-01')).toBe(esperado));

  it('diasAte', () => expect(diasAte('2026-10-28', '2026-10-01')).toBe(27));
});
