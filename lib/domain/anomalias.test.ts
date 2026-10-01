import { describe, expect, it } from 'vitest';
import { detectarAnomalias, mediana, type AbastecimentoAnalise, type ContextoAnalise } from './anomalias';
import { CONFIG_PADRAO } from './configuracoes';
import type { Medicao } from './consumo';
import { calcularDvChave } from './nfce';

// Chave de teste de 09/2026 (gerada com a função de DV, sem nota real).
const base = '31' + '2609' + '11222333000181' + '65' + '001' + '000001234' + '1' + '00001234';
const CHAVE_SET_2026 = base + calcularDvChave(base);

const normal: AbastecimentoAnalise = {
  km: 100580,
  litros: 190,
  valorTotalCentavos: 114000, // R$ 6,00/L
  dataHora: '2026-09-20T13:00:00Z',
  nfceChave: CHAVE_SET_2026,
  fotoPath: 'f1/2026/09/x.jpg',
};

const medicao = (kmL: number): Medicao => ({
  abastecimentoId: 'x',
  dataHora: '2026-09-01T00:00:00Z',
  distancia: kmL * 100,
  litros: 100,
  kmL,
});

const contexto: ContextoAnalise = {
  capacidadeTanqueL: 300,
  maiorKmAnterior: 100000,
  kmUltimoAbastecimento: 100000,
  kmLDesteAbastecimento: 3.05,
  medicoesAnteriores: [medicao(3), medicao(3.1), medicao(3)],
  precosLitroRecentesCentavos: [590, 600, 610],
  config: CONFIG_PADRAO,
};

const codigos = (a: AbastecimentoAnalise, c: Partial<ContextoAnalise> = {}) =>
  detectarAnomalias(a, { ...contexto, ...c }).map((x) => x.codigo);

describe('detectarAnomalias (regras §5)', () => {
  it('abastecimento normal: nenhuma anomalia', () => {
    expect(codigos(normal)).toEqual([]);
  });

  it('KM_REGRESSIVO (alta): km menor que o maior já registrado', () => {
    const r = detectarAnomalias({ ...normal, km: 99000 }, contexto);
    expect(r.find((x) => x.codigo === 'KM_REGRESSIVO')?.severidade).toBe('alta');
    // km regressivo não acusa também intervalo curto
    expect(r.map((x) => x.codigo)).not.toContain('INTERVALO_CURTO');
  });

  it('LITROS_ACIMA_TANQUE (alta): 300 L × 1,05 = 315 L é o limite', () => {
    expect(codigos({ ...normal, litros: 315 })).not.toContain('LITROS_ACIMA_TANQUE');
    expect(codigos({ ...normal, litros: 315.5 })).toContain('LITROS_ACIMA_TANQUE');
  });

  it('LITROS_ACIMA_TANQUE não roda sem capacidade cadastrada', () => {
    expect(codigos({ ...normal, litros: 900 }, { capacidadeTanqueL: null })).not.toContain('LITROS_ACIMA_TANQUE');
  });

  it('CONSUMO_FORA_FAIXA (média): ±20% da média ponderada', () => {
    // média das anteriores ≈ 3,033; faixa ≈ 2,43 a 3,64
    expect(codigos(normal, { kmLDesteAbastecimento: 3.6 })).not.toContain('CONSUMO_FORA_FAIXA');
    expect(codigos(normal, { kmLDesteAbastecimento: 3.7 })).toContain('CONSUMO_FORA_FAIXA');
    expect(codigos(normal, { kmLDesteAbastecimento: 2.3 })).toContain('CONSUMO_FORA_FAIXA');
  });

  it('CONSUMO_FORA_FAIXA exige pelo menos 3 medições anteriores', () => {
    expect(codigos(normal, { kmLDesteAbastecimento: 9, medicoesAnteriores: [medicao(3), medicao(3)] })).not.toContain(
      'CONSUMO_FORA_FAIXA',
    );
  });

  it('CONSUMO_FORA_FAIXA usa só as últimas N medições (consumo_janela)', () => {
    const antigas = Array.from({ length: 10 }, () => medicao(6));
    const recentes = Array.from({ length: 10 }, () => medicao(3));
    expect(codigos(normal, { kmLDesteAbastecimento: 3, medicoesAnteriores: [...antigas, ...recentes] })).not.toContain(
      'CONSUMO_FORA_FAIXA',
    );
  });

  it('PRECO_FORA_FAIXA (média): ±15% da mediana', () => {
    // mediana 6,00 → faixa 5,10 a 6,90
    expect(codigos({ ...normal, valorTotalCentavos: 190 * 690 })).not.toContain('PRECO_FORA_FAIXA');
    expect(codigos({ ...normal, valorTotalCentavos: 190 * 700 })).toContain('PRECO_FORA_FAIXA');
    expect(codigos({ ...normal, valorTotalCentavos: 190 * 500 })).toContain('PRECO_FORA_FAIXA');
  });

  it('PRECO_FORA_FAIXA não roda sem preços recentes', () => {
    expect(codigos({ ...normal, valorTotalCentavos: 1 }, { precosLitroRecentesCentavos: [] })).not.toContain(
      'PRECO_FORA_FAIXA',
    );
  });

  it('INTERVALO_CURTO (baixa): menos de 150 km do último abastecimento', () => {
    expect(codigos({ ...normal, km: 100149 })).toContain('INTERVALO_CURTO');
    expect(codigos({ ...normal, km: 100150 })).not.toContain('INTERVALO_CURTO');
  });

  it('SEM_NFCE (baixa) e SEM_FOTO (alta)', () => {
    const r = detectarAnomalias({ ...normal, nfceChave: null, fotoPath: null }, contexto);
    expect(r.find((x) => x.codigo === 'SEM_NFCE')?.severidade).toBe('baixa');
    expect(r.find((x) => x.codigo === 'SEM_FOTO')?.severidade).toBe('alta');
  });

  it('MES_DIVERGENTE (média): mês da chave ≠ mês do abastecimento no horário de Brasília', () => {
    expect(codigos({ ...normal, dataHora: '2026-10-05T12:00:00Z' })).toContain('MES_DIVERGENTE');
    // 01/10 às 01:00 UTC ainda é 30/09 em Brasília → mesmo mês da chave
    expect(codigos({ ...normal, dataHora: '2026-10-01T01:00:00Z' })).not.toContain('MES_DIVERGENTE');
  });

  it('ordena da mais grave para a mais leve', () => {
    const r = detectarAnomalias({ ...normal, nfceChave: null, fotoPath: null, km: 100100 }, contexto);
    expect(r.map((x) => x.severidade)).toEqual(['alta', 'baixa', 'baixa']);
  });
});

describe('mediana', () => {
  it('ímpar', () => expect(mediana([3, 1, 2])).toBe(2));
  it('par', () => expect(mediana([4, 1, 3, 2])).toBe(2.5));
  it('vazia', () => expect(mediana([])).toBeNull());
});
