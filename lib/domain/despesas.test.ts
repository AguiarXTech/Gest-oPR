import { describe, expect, it } from 'vitest';
import { separarDespesas, situacaoReembolso } from './despesas';

describe('separarDespesas (linhas do resumo)', () => {
  it('pedágio, manutenção e o resto em outras despesas', () => {
    expect(
      separarDespesas([
        { tipo: 'pedagio', valorCentavos: 4_860 },
        { tipo: 'manutencao', valorCentavos: 11_550 },
        { tipo: 'chapa', valorCentavos: 10_000 },
        { tipo: 'lavagem', valorCentavos: 5_000 },
      ]),
    ).toEqual({ pedagioCentavos: 4_860, manutencaoCentavos: 11_550, outrasCentavos: 15_000 });
  });
  it('sem despesas: zero', () =>
    expect(separarDespesas([])).toEqual({
      pedagioCentavos: 0,
      manutencaoCentavos: 0,
      outrasCentavos: 0,
    }));
});

describe('situacaoReembolso (o motorista pagou do bolso)', () => {
  it('reembolsável e fora de acerto: a devolver', () =>
    expect(situacaoReembolso({ reembolsavel: true, acertoStatus: null })).toBe('a_devolver'));
  it('em acerto aberto ou fechado: entra no acerto', () => {
    expect(situacaoReembolso({ reembolsavel: true, acertoStatus: 'rascunho' })).toBe('no_acerto');
    expect(situacaoReembolso({ reembolsavel: true, acertoStatus: 'fechado' })).toBe('no_acerto');
  });
  it('acerto pago: devolvido', () =>
    expect(situacaoReembolso({ reembolsavel: true, acertoStatus: 'pago' })).toBe('devolvido'));
  it('não reembolsável (ex.: alimentação)', () =>
    expect(situacaoReembolso({ reembolsavel: false, acertoStatus: null })).toBe(
      'nao_reembolsavel',
    ));
});
