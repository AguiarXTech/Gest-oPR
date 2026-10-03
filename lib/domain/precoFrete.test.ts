import { describe, expect, it } from 'vitest';
import { fretesAutomaticos, precoVigente, type PrecoFrete } from './precoFrete';

const precos: PrecoFrete[] = [
  { sentido: 'ida', vigenciaInicio: '2026-01-01', valorCentavos: 480_000 },
  { sentido: 'ida', vigenciaInicio: '2026-10-01', valorCentavos: 508_000 }, // reajuste
];

describe('precoVigente', () => {
  it('usa o preço que valia na data da viagem', () => {
    expect(precoVigente(precos, 'ida', '2026-09-30')).toBe(480_000);
    expect(precoVigente(precos, 'ida', '2026-10-01')).toBe(508_000);
    expect(precoVigente(precos, 'ida', '2026-12-15')).toBe(508_000);
  });
  it('antes do primeiro preço: sem preço', () =>
    expect(precoVigente(precos, 'ida', '2025-12-31')).toBeNull());
  it('sentido sem preço combinado', () =>
    expect(precoVigente(precos, 'volta', '2026-10-03')).toBeNull());
});

describe('fretesAutomaticos', () => {
  it('lança só os sentidos com preço na data', () => {
    expect(fretesAutomaticos(precos, '2026-10-03')).toEqual([
      { sentido: 'ida', valorCentavos: 508_000 },
    ]);
  });
  it('ida e volta combinadas', () => {
    const ambos: PrecoFrete[] = [
      ...precos,
      { sentido: 'volta', vigenciaInicio: '2026-01-01', valorCentavos: 300_000 },
    ];
    expect(fretesAutomaticos(ambos, '2026-10-03')).toEqual([
      { sentido: 'ida', valorCentavos: 508_000 },
      { sentido: 'volta', valorCentavos: 300_000 },
    ]);
  });
  it('sem preço: nada', () => expect(fretesAutomaticos([], '2026-10-03')).toEqual([]));
});
