import { describe, expect, it } from 'vitest';
import { calcularComissaoViagem, regraVigente, type RegraComissao, type ViagemComissao } from './comissao';

const regra = (r: Partial<RegraComissao>): RegraComissao => ({
  id: 'r',
  tipo: 'valor_por_viagem',
  percentual: null,
  valorCentavos: null,
  deduzPedagio: false,
  deduzCombustivel: false,
  apenasComFrete: true,
  vigenciaInicio: '2024-01-01',
  vigenciaFim: null,
  ...r,
});
const viagem = (v: Partial<ViagemComissao> = {}): ViagemComissao => ({
  freteCentavos: 450000,
  kmRodado: 580,
  pedagiosCentavos: 0,
  dieselRateadoCentavos: 0,
  ...v,
});

describe('calcularComissaoViagem (regras §6)', () => {
  it('valor_por_viagem R$ 150: 1 frete ou 2 fretes → R$ 150 (em uso, Q1)', () => {
    const r = regra({ tipo: 'valor_por_viagem', valorCentavos: 15000 });
    expect(calcularComissaoViagem(viagem({ freteCentavos: 450000 }), r)).toBe(15000);
    expect(calcularComissaoViagem(viagem({ freteCentavos: 570000 }), r)).toBe(15000);
  });

  it('valor_por_viagem com apenas_com_frete e frete 0 → 0', () => {
    expect(calcularComissaoViagem(viagem({ freteCentavos: 0 }), regra({ valorCentavos: 15000 }))).toBe(0);
    expect(calcularComissaoViagem(viagem({ freteCentavos: 0 }), regra({ valorCentavos: 15000, apenasComFrete: false }))).toBe(15000);
  });

  it('pct_frete_bruto 12%, frete R$ 4.500 → R$ 540', () => {
    expect(calcularComissaoViagem(viagem(), regra({ tipo: 'pct_frete_bruto', percentual: 12 }))).toBe(54000);
  });

  it('pct_frete_liquido 15%, deduz pedágio R$ 97,20 → base 440.280 → R$ 660,42', () => {
    const r = regra({ tipo: 'pct_frete_liquido', percentual: 15, deduzPedagio: true });
    expect(calcularComissaoViagem(viagem({ pedagiosCentavos: 9720 }), r)).toBe(66042);
  });

  it('pct_frete_liquido com diesel rateado e base negativa → 0', () => {
    const r = regra({ tipo: 'pct_frete_liquido', percentual: 15, deduzPedagio: true, deduzCombustivel: true });
    expect(calcularComissaoViagem(viagem({ freteCentavos: 1000, pedagiosCentavos: 900, dieselRateadoCentavos: 500 }), r)).toBe(0);
  });

  it('valor_por_km R$ 0,35/km × 580 km → R$ 203', () => {
    expect(calcularComissaoViagem(viagem(), regra({ tipo: 'valor_por_km', valorCentavos: 35 }))).toBe(20300);
  });
});

describe('regraVigente', () => {
  const regras = [
    regra({ id: 'antiga', vigenciaInicio: '2024-01-01', vigenciaFim: '2026-06-30' }),
    regra({ id: 'nova', vigenciaInicio: '2026-07-01', vigenciaFim: null }),
  ];

  it('escolhe pela data de saída da viagem (horário de Brasília)', () => {
    expect(regraVigente(regras, '2026-06-30T23:00:00-03:00')?.id).toBe('antiga');
    // 01/07 02:00 UTC ainda é 30/06 em Brasília
    expect(regraVigente(regras, '2026-07-01T02:00:00Z')?.id).toBe('antiga');
    expect(regraVigente(regras, '2026-07-01T12:00:00Z')?.id).toBe('nova');
  });

  it('sem regra no período → null', () => {
    expect(regraVigente(regras, '2023-12-31T12:00:00Z')).toBeNull();
  });
});
