import { describe, expect, it } from 'vitest';
import {
  conferirCobranca,
  eixosCobrados,
  eixosDoConjunto,
  passagensPrevistas,
  tarifaVigente,
} from './pedagio';

const truck3 = { eixos: 3, eixosSuspensos: 1 };
const tarifas = [
  { vigenciaInicio: '2025-09-27', tarifaEixoCentavos: 1500 },
  { vigenciaInicio: '2026-08-06', tarifaEixoCentavos: 1620 },
];

describe('eixosCobrados (eixo suspenso vazio não paga)', () => {
  it('vazio: eixos − suspensos', () => expect(eixosCobrados(truck3, false, null)).toBe(2));
  it('carregado: todos', () => expect(eixosCobrados(truck3, true, null)).toBe(3));
  it('exceção da viagem vale (ex.: reboque)', () => expect(eixosCobrados(truck3, true, 5)).toBe(5));
  it('sem eixos no cadastro: não prevê', () =>
    expect(eixosCobrados({ eixos: null, eixosSuspensos: 0 }, true, null)).toBeNull());
});

describe('tarifaVigente', () => {
  it('usa a tarifa da data (reajuste em 06/08/2026)', () => {
    expect(tarifaVigente(tarifas, '2026-08-05')).toBe(1500);
    expect(tarifaVigente(tarifas, '2026-08-06')).toBe(1620);
  });
  it('antes da primeira tarifa: null', () =>
    expect(tarifaVigente(tarifas, '2025-01-01')).toBeNull());
});

describe('passagensPrevistas', () => {
  it('ida vazia (2 eixos) e volta carregada (3 eixos)', () => {
    const p = passagensPrevistas(
      {
        dataIda: '2026-09-10',
        dataVolta: '2026-09-12',
        temFreteIda: false,
        eixosIda: null,
        eixosVolta: null,
      },
      truck3,
      tarifas,
    );
    expect(p).toEqual([
      {
        sentido: 'ida',
        data: '2026-09-10',
        eixos: 2,
        tarifaEixoCentavos: 1620,
        previstoCentavos: 3240,
      },
      {
        sentido: 'volta',
        data: '2026-09-12',
        eixos: 3,
        tarifaEixoCentavos: 1620,
        previstoCentavos: 4860,
      },
    ]);
  });

  it('ida com frete paga todos os eixos', () => {
    const [ida] = passagensPrevistas(
      {
        dataIda: '2026-09-10',
        dataVolta: '2026-09-12',
        temFreteIda: true,
        eixosIda: null,
        eixosVolta: null,
      },
      truck3,
      tarifas,
    );
    expect(ida.previstoCentavos).toBe(4860);
  });
});

describe('conferirCobranca', () => {
  it.each([
    [3240, 3240, 'certo', 0],
    [3240, 4860, 'cobrou_mais', 1620], // cobrou o eixo suspenso
    [4860, 3240, 'cobrou_menos', -1620],
  ])('previsto %i, cobrado %i → %s', (prev, cob, situacao, dif) => {
    expect(conferirCobranca(prev, cob)).toEqual({ situacao, diferencaCentavos: dif });
  });
  it('sem previsão', () =>
    expect(conferirCobranca(null, 100)).toEqual({
      situacao: 'sem_previsao',
      diferencaCentavos: null,
    }));
});

describe('eixosDoConjunto (cavalo + carreta)', () => {
  const cavalo = { eixos: 3, eixosSuspensos: 1 };
  it('truck ou cavalo sem carreta: só os eixos dele', () =>
    expect(eixosDoConjunto(cavalo, null)).toEqual(cavalo));
  it('soma eixos e eixos suspensos da carreta', () =>
    expect(eixosDoConjunto(cavalo, { eixos: 3, eixosSuspensos: 1 })).toEqual({
      eixos: 6,
      eixosSuspensos: 2,
    }));
  it('carreta sem eixos no cadastro: não dá para prever', () =>
    expect(eixosDoConjunto(cavalo, { eixos: null, eixosSuspensos: 0 }).eixos).toBeNull());
  it('cavalo sem eixos no cadastro: não dá para prever', () =>
    expect(
      eixosDoConjunto({ eixos: null, eixosSuspensos: 0 }, { eixos: 3, eixosSuspensos: 0 }).eixos,
    ).toBeNull());
  it('conjunto vazio de 6 eixos com 2 suspensos paga 4', () =>
    expect(
      eixosCobrados(eixosDoConjunto(cavalo, { eixos: 3, eixosSuspensos: 1 }), false, null),
    ).toBe(4));
});
