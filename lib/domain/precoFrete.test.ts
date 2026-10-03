import { describe, expect, it } from 'vitest';
import { freteAutomatico, precoVigente, type PrecoFrete } from './precoFrete';

const precos: PrecoFrete[] = [
  { vigenciaInicio: '2026-01-01', valorCentavos: 480_000 },
  { vigenciaInicio: '2026-10-01', valorCentavos: 508_000 }, // reajuste
];

describe('precoVigente', () => {
  it('usa o preço que valia na data da viagem', () => {
    expect(precoVigente(precos, '2026-09-30')).toBe(480_000);
    expect(precoVigente(precos, '2026-10-01')).toBe(508_000);
    expect(precoVigente(precos, '2026-12-15')).toBe(508_000);
  });
  it('antes do primeiro preço: sem preço', () =>
    expect(precoVigente(precos, '2025-12-31')).toBeNull());
  it('sem preço cadastrado', () => expect(precoVigente([], '2026-10-03')).toBeNull());
});

describe('freteAutomatico (trecho pelo local do produto)', () => {
  const cimentoLiz = { sentido: 'volta' as const, precos };
  it('produto na região de BH: frete na volta, com o preço do dia da saída', () =>
    expect(freteAutomatico(cimentoLiz, '2026-10-03')).toEqual({
      sentido: 'volta',
      valorCentavos: 508_000,
    }));
  it('produto na região de SJE: frete na ida', () =>
    expect(freteAutomatico({ sentido: 'ida', precos }, '2026-10-03')).toEqual({
      sentido: 'ida',
      valorCentavos: 508_000,
    }));
  it('viagem sem produto escolhido: nada', () =>
    expect(freteAutomatico(null, '2026-10-03')).toBeNull());
  it('produto sem preço na data: nada', () =>
    expect(freteAutomatico({ sentido: 'volta', precos }, '2025-06-01')).toBeNull());
});
