import { describe, expect, it } from 'vitest';
import { calcularDvChave } from '@/lib/domain/nfce';
import { freteSchema } from './frete';

const chave = (modelo: string) => {
  const base = '31' + '2610' + '11222333000181' + modelo + '001' + '000000777' + '1' + '00000777';
  return base + calcularDvChave(base);
};
const base = { cliente_id: '', valor: '4.500,00', peso_kg: '', cte_chave: '', mdfe_chave: '', observacoes: '' };

describe('freteSchema', () => {
  it('valor em centavos; campos vazios viram null', () => {
    expect(freteSchema.parse(base)).toEqual({
      cliente_id: null,
      valor: 450000,
      peso_kg: null,
      cte_chave: null,
      mdfe_chave: null,
      observacoes: null,
    });
  });

  it('frete zero é permitido (diferente de não lançado)', () => {
    expect(freteSchema.parse({ ...base, valor: '0' }).valor).toBe(0);
  });

  it('aceita CT-e (57) e MDF-e (58) digitados com espaços', () => {
    const r = freteSchema.parse({ ...base, cte_chave: chave('57').replace(/(.{4})/g, '$1 '), mdfe_chave: chave('58') });
    expect(r.cte_chave).toBe(chave('57'));
    expect(r.mdfe_chave).toBe(chave('58'));
  });

  it('recusa chave de NFC-e (65) no campo de CT-e', () => {
    expect(freteSchema.safeParse({ ...base, cte_chave: chave('65') }).success).toBe(false);
  });

  it('recusa chave com DV errado', () => {
    const errada = chave('57').slice(0, 43) + ((Number(chave('57')[43]) + 1) % 10);
    expect(freteSchema.safeParse({ ...base, cte_chave: errada }).success).toBe(false);
  });

  it('peso com vírgula', () => {
    expect(freteSchema.parse({ ...base, peso_kg: '14.000,5' }).peso_kg).toBe(14000.5);
  });
});
