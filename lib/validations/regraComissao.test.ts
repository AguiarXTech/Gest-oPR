import { describe, expect, it } from 'vitest';
import { regraComissaoSchema, type RegraComissaoForm } from './regraComissao';

const base: RegraComissaoForm = {
  tipo: 'valor_por_viagem',
  valor: '150,00',
  percentual: '',
  deduz_pedagio: true,
  deduz_combustivel: true,
  apenas_com_frete: true,
  vigencia_inicio: '2026-10-01',
  observacoes: '',
};

describe('regraComissaoSchema', () => {
  it('valor fixo por viagem em centavos; deduções só valem no % líquido', () => {
    expect(regraComissaoSchema.parse(base)).toMatchObject({
      tipo: 'valor_por_viagem',
      valor_centavos: 15000,
      percentual: null,
      deduz_pedagio: false,
      deduz_combustivel: false,
    });
  });

  it('percentual com vírgula', () => {
    expect(regraComissaoSchema.parse({ ...base, tipo: 'pct_frete_liquido', percentual: '12,5' })).toMatchObject({
      percentual: 12.5,
      valor_centavos: null,
      deduz_pedagio: true,
    });
  });

  it('valor zero ou percentual fora de 0–100 é recusado', () => {
    expect(regraComissaoSchema.safeParse({ ...base, valor: '0' }).success).toBe(false);
    expect(regraComissaoSchema.safeParse({ ...base, tipo: 'pct_frete_bruto', percentual: '120' }).success).toBe(false);
  });
});
