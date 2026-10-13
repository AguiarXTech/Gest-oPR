import { describe, expect, it } from 'vitest';
import { avisoReembolso, separarDespesas, situacaoReembolso } from './despesas';

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

describe('situacaoReembolso com quem pagou e baixa (pedido de 2026-10-13)', () => {
  it('empresa pagou: nada a devolver', () =>
    expect(
      situacaoReembolso({ reembolsavel: true, acertoStatus: null, pagoPeloMotorista: false }),
    ).toBe('pago_pela_empresa'));
  it('dono deu baixa: devolvido, mesmo fora de acerto', () =>
    expect(
      situacaoReembolso({
        reembolsavel: true,
        acertoStatus: null,
        devolvidoEm: '2026-10-13T10:00:00Z',
      }),
    ).toBe('devolvido'));
  it('baixa vale mesmo com acerto ainda aberto', () =>
    expect(
      situacaoReembolso({
        reembolsavel: true,
        acertoStatus: 'rascunho',
        devolvidoEm: '2026-10-13T10:00:00Z',
      }),
    ).toBe('devolvido'));
});

describe('avisoReembolso (texto do aviso para o dono)', () => {
  // o formatador de moeda usa espaço que não quebra linha depois de "R$"
  const texto = (a: Parameters<typeof avisoReembolso>[0]) => avisoReembolso(a).replace(/ /g, ' ');
  it('motorista, valor, o quê e caminhão', () =>
    expect(
      texto({
        motorista: 'Enzo Henrique Caldeira',
        valorCentavos: 11550,
        oQue: 'manutenção',
        placa: 'DEF4G56',
      }),
    ).toBe('Enzo pagou R$ 115,50 em manutenção · DEF4G56'));
  it('sem caminhão', () =>
    expect(
      texto({ motorista: 'Paulo', valorCentavos: 9000, oQue: 'troca de óleo', placa: null }),
    ).toBe('Paulo pagou R$ 90,00 em troca de óleo'));
});
