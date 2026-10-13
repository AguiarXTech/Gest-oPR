import { describe, expect, it } from 'vitest';
import { separarDespesas } from './despesas';

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
