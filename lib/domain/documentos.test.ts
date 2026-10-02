import { describe, expect, it } from 'vitest';
import { aceitaAnexo, diasParaVencer, statusDocumento } from './documentos';

const HOJE = '2026-10-01';

describe('statusDocumento (regras §9, faixas 30/15/7)', () => {
  it.each([
    ['2026-09-30', 'vencido'],
    ['2026-10-01', 'critico'], // vence hoje
    ['2026-10-08', 'critico'], // 7 dias
    ['2026-10-09', 'atencao'], // 8 dias
    ['2026-10-16', 'atencao'], // 15 dias
    ['2026-10-17', 'aviso'], // 16 dias
    ['2026-10-31', 'aviso'], // 30 dias
    ['2026-11-01', 'ok'], // 31 dias
  ])('vence em %s → %s', (vencimento, esperado) => {
    expect(statusDocumento(vencimento, HOJE)).toBe(esperado);
  });

  it('faixas configuráveis e em qualquer ordem', () => {
    expect(statusDocumento('2026-11-15', HOJE, [60, 10, 30])).toBe('aviso'); // 45 dias
    expect(statusDocumento('2026-10-21', HOJE, [60, 10, 30])).toBe('atencao'); // 20 dias
  });
});

describe('diasParaVencer', () => {
  it('atravessa a mudança de mês sem erro de fuso', () => expect(diasParaVencer('2026-11-01', HOJE)).toBe(31));
  it('negativo quando vencido', () => expect(diasParaVencer('2026-09-28', HOJE)).toBe(-3));
});

describe('aceitaAnexo (LGPD)', () => {
  it('toxicológico: só datas, sem anexo', () => expect(aceitaAnexo('toxicologico')).toBe(false));
  it('CNH e documentos do caminhão aceitam anexo', () => {
    expect(aceitaAnexo('cnh')).toBe(true);
    expect(aceitaAnexo('crlv')).toBe(true);
  });
});
