import { describe, expect, it } from 'vitest';
import { lerCsv, lerPlanilhaAbastecimentos, resumirAbastecimentos } from './relatorioAbastecimento';

describe('lerCsv', () => {
  it('aspas, vírgula decimal entre aspas e quebra de linha do Windows', () => {
    expect(lerCsv('a,b,c\r\n"6,05","x ""y""",3\r\n')).toEqual([
      ['a', 'b', 'c'],
      ['6,05', 'x "y"', '3'],
    ]);
  });
  it('separador ponto e vírgula (Excel em português)', () => {
    expect(lerCsv('a;b\n1,5;2')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
  });
});

const CABECALHO =
  'data_hora,placa,motorista,posto,cidade,km,litros,preco_litro,valor_total,tanque_cheio,trecho';

describe('lerPlanilhaAbastecimentos', () => {
  it('lê formato brasileiro e o da planilha em inglês', () => {
    const { linhas, ignoradas } = lerPlanilhaAbastecimentos(
      [
        CABECALHO,
        '2026-07-02 18:40,DEM1A01,Carlos,Posto Serra,São João Evangelista - MG,480580,"215,430","6,05","1.303,35",Sim,volta',
        '03/07/2026 09:15,DEM1A01,Carlos,Posto Anel,Belo Horizonte - MG,480870,90.5,5.99,542.10,Não,ida',
      ].join('\n'),
    );
    expect(ignoradas).toBe(0);
    expect(linhas[0]).toMatchObject({
      placa: 'DEM1A01',
      km: 480580,
      litros: 215.43,
      valorTotalCentavos: 130335,
      tanqueCheio: true,
      trecho: 'volta',
      dataHora: '2026-07-02T18:40:00-03:00',
    });
    expect(linhas[1]).toMatchObject({
      litros: 90.5,
      valorTotalCentavos: 54210,
      tanqueCheio: false,
      dataHora: '2026-07-03T09:15:00-03:00',
    });
  });
  it('linha incompleta é ignorada e contada (aparece no relatório)', () => {
    const r = lerPlanilhaAbastecimentos(
      [CABECALHO, '2026-07-02 18:40,DEM1A01,Carlos,Posto,Cidade,abc,10,6,60,Sim,ida', ''].join(
        '\n',
      ),
    );
    expect(r).toEqual({ linhas: [], ignoradas: 1 });
  });
  it('cabeçalho com acento e maiúsculas', () => {
    const r = lerPlanilhaAbastecimentos(
      'Data/Hora,Placa,Motorista,Posto,Cidade,KM,Litros,Preço litro,Valor total,Tanque cheio,Trecho\n2026-07-02 18:40,DEM1A01,C,P,X,1000,100,6,600,sim,ida',
    );
    expect(r.linhas).toHaveLength(1);
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
    trecho: null,
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
