import { describe, expect, it } from 'vitest';
import {
  inicioDoPeriodoRelatorio,
  lerPeriodoRelatorio,
  linhaDoBanco,
  resumirAbastecimentos,
} from './relatorioAbastecimento';

describe('linhaDoBanco', () => {
  const base = {
    data_hora: '2026-10-13T14:05:00-03:00',
    km: 505101,
    litros: '218.868',
    valor_total_centavos: 139200,
    tanque_cheio: true,
    posto_nome: 'AUTO POSTO X LTDA',
    caminhoes: { placa: 'ABC1D23' },
    funcionarios: { nome: 'Carlos' },
    fornecedores: { nome: 'Posto Serra Verde', cidade: 'São João Evangelista - MG' },
  };
  it('converte litros (numeric) e usa o posto cadastrado', () =>
    expect(linhaDoBanco(base)).toEqual({
      dataHora: '2026-10-13T14:05:00-03:00',
      placa: 'ABC1D23',
      motorista: 'Carlos',
      posto: 'Posto Serra Verde',
      cidade: 'São João Evangelista - MG',
      km: 505101,
      litros: 218.868,
      valorTotalCentavos: 139200,
      tanqueCheio: true,
    }));
  it('sem posto cadastrado: nome do cupom e "Sem cidade"', () =>
    expect(linhaDoBanco({ ...base, fornecedores: null })).toMatchObject({
      posto: 'AUTO POSTO X LTDA',
      cidade: 'Sem cidade',
    }));
  it('sem nada do posto', () =>
    expect(linhaDoBanco({ ...base, fornecedores: null, posto_nome: null }).posto).toBe(
      'Posto não informado',
    ));
});

describe('período do relatório', () => {
  const agora = new Date('2026-10-13T15:00:00Z');
  it('padrão é 3 meses; valor estranho também', () => {
    expect(lerPeriodoRelatorio(undefined)).toBe('90d');
    expect(lerPeriodoRelatorio('xyz')).toBe('90d');
    expect(lerPeriodoRelatorio('30d')).toBe('30d');
  });
  it('início contado a partir de agora', () => {
    expect(inicioDoPeriodoRelatorio('30d', agora)).toBe('2026-09-13T15:00:00.000Z');
    expect(inicioDoPeriodoRelatorio('90d', agora)).toBe('2026-07-15T15:00:00.000Z');
    expect(inicioDoPeriodoRelatorio('12m', agora)).toBe('2025-10-13T15:00:00.000Z');
  });
});

describe('resumirAbastecimentos', () => {
  const l = (
    dataHora: string,
    placa: string,
    km: number,
    litros: number,
    valor: number,
    cheio = true,
    cidade = 'SJE',
  ) => ({
    dataHora,
    placa,
    motorista: 'M',
    posto: 'P',
    cidade,
    km,
    litros,
    valorTotalCentavos: valor,
    tanqueCheio: cheio,
  });
  const linhas = [
    l('2026-07-06T10:00:00-03:00', 'A', 100000, 200, 120000), // abre
    l('2026-07-08T10:00:00-03:00', 'A', 100580, 200, 122000), // 580 / 200 = 2,9
    l('2026-07-14T10:00:00-03:00', 'A', 101160, 232, 140000), // 580 / 232 = 2,5
    l('2026-07-07T10:00:00-03:00', 'B', 50000, 210, 126000),
    l('2026-07-09T10:00:00-03:00', 'B', 50580, 300, 250000, true, 'BH'), // 580 / 300 = 1,93 e preço 8,33: fora do padrão
  ];
  const r = resumirAbastecimentos(linhas);

  it('cards: gasto, litros, preço médio e km/L de tanque cheio', () => {
    expect(r.cards.gastoCentavos).toBe(758000);
    expect(r.cards.litros).toBeCloseTo(1142, 3);
    expect(r.cards.precoMedioCentavos).toBe(Math.round(758000 / 1142));
    expect(r.cards.kmRodados).toBe(1740);
    expect(r.cards.kmPorLitro).toBeCloseTo(1740 / 732, 4);
    expect(r.cards.abastecimentos).toBe(5);
  });
  it('custo de diesel por km = preço médio ÷ km/L', () =>
    expect(r.cards.custoKmCentavos).toBe(
      Math.round(r.cards.precoMedioCentavos! / r.cards.kmPorLitro!),
    ));
  it('gasto por semana (segunda a domingo)', () => {
    expect(r.gastoPorSemana.map((s) => [s.semana, s.gastoCentavos])).toEqual([
      ['2026-07-06', 618000],
      ['2026-07-13', 140000],
    ]);
  });
  it('km/L por caminhão', () =>
    expect(r.kmLPorCaminhao.map((c) => [c.placa, Number(c.kmL?.toFixed(3))])).toEqual([
      ['A', Number((1160 / 432).toFixed(3))],
      ['B', Number((580 / 300).toFixed(3))],
    ]));
  it('por cidade', () =>
    expect(r.porCidade.find((c) => c.cidade === 'BH')).toMatchObject({
      gastoCentavos: 250000,
      litros: 300,
    }));
  it('fora do padrão: preço alto e consumo baixo', () => {
    const fora = r.foraDoPadrao.find((f) => f.linha.placa === 'B' && f.linha.km === 50580);
    expect(fora?.motivos).toEqual(
      expect.arrayContaining([expect.stringMatching(/preço/i), expect.stringMatching(/consumo/i)]),
    );
  });
  it('sem linhas: tudo zerado e sem km/L', () => {
    const v = resumirAbastecimentos([]);
    expect(v.cards).toMatchObject({
      gastoCentavos: 0,
      kmPorLitro: null,
      custoKmCentavos: null,
      precoMedioCentavos: null,
    });
  });
});
