import { describe, expect, it } from 'vitest';
import { calcularAcerto, despesaReembolsavel, estimarComissao, periodoSugerido, verificarFechamento, type EntradaAcerto } from './acerto';
import type { RegraComissao } from './comissao';

const regra150: RegraComissao = {
  id: 'r1',
  tipo: 'valor_por_viagem',
  percentual: null,
  valorCentavos: 15000,
  deduzPedagio: false,
  deduzCombustivel: false,
  apenasComFrete: true,
  vigenciaInicio: '2024-01-01',
  vigenciaFim: null,
};

const viagem = (id: string, fretes: number[], dia = 10) => ({
  id,
  dataSaida: `2026-09-${dia}T10:00:00Z`,
  kmRodado: 580,
  fretesCentavos: fretes,
  pedagiosCentavos: 0,
  dieselRateadoCentavos: 0,
});

// Exemplo completo das regras §7: 4 viagens (3 só volta, 1 ida + volta), comissão fixa R$ 150.
const exemplo: EntradaAcerto = {
  viagens: [viagem('v1', [450000]), viagem('v2', [450000]), viagem('v3', [450000]), viagem('v4', [120000, 450000])],
  regras: [regra150],
  despesas: [
    { valorCentavos: 12000, reembolsavel: true },
    { valorCentavos: 6540, reembolsavel: true },
    { valorCentavos: 5000, reembolsavel: false },
  ],
  abastecimentos: [
    { valorTotalCentavos: 30000, formaPagamento: 'motorista' },
    { valorTotalCentavos: 110000, formaPagamento: 'cartao_empresa' },
  ],
  adiantamentosCentavos: [100000],
};

describe('calcularAcerto (regras §7)', () => {
  it('exemplo completo: saldo R$ 85,40', () => {
    const r = calcularAcerto(exemplo);
    expect(r).toMatchObject({
      totalFreteCentavos: 4 * 450000 + 120000,
      totalComissaoCentavos: 60000,
      totalReembolsosCentavos: 18540 + 30000,
      totalAdiantamentosCentavos: 100000,
      saldoCentavos: 8540,
    });
    expect(r.porViagem.map((v) => v.comissaoCentavos)).toEqual([15000, 15000, 15000, 15000]);
  });

  it('saldo negativo: o motorista deve', () => {
    const r = calcularAcerto({ ...exemplo, adiantamentosCentavos: [100000, 50000] });
    expect(r.saldoCentavos).toBe(8540 - 50000);
  });

  it('viagem sem regra vigente: comissão 0 e marcada', () => {
    const r = calcularAcerto({ ...exemplo, regras: [] });
    expect(r.totalComissaoCentavos).toBe(0);
    expect(r.porViagem.every((v) => v.regraId === null)).toBe(true);
  });
});

describe('verificarFechamento', () => {
  it('tudo certo: pode fechar', () => {
    expect(verificarFechamento(exemplo, 0)).toEqual({ erros: [], avisos: [] });
  });

  it('viagem sem frete lançado bloqueia', () => {
    const r = verificarFechamento({ ...exemplo, viagens: [...exemplo.viagens, viagem('v5', [], 20)] }, 0);
    expect(r.erros).toEqual(['Viagem de 20/09/2026 sem frete lançado.']);
  });

  it('viagem sem regra de comissão vigente bloqueia', () => {
    expect(verificarFechamento({ ...exemplo, regras: [] }, 0).erros).toHaveLength(4);
  });

  it('alertas graves não conferidos só avisam (o gestor decide)', () => {
    const r = verificarFechamento(exemplo, 2);
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual(['2 abastecimento(s) com alerta grave ainda não conferido(s).']);
  });
});

describe('estimarComissao (extrato do motorista)', () => {
  const v = (dia: number) => ({ dataSaida: `2026-09-${dia}T10:00:00Z`, kmRodado: 580 });

  it('valor fixo: viagens × valor', () => {
    expect(estimarComissao([v(10), v(12), v(14)], [regra150])).toEqual({ totalCentavos: 45000, dependeDoFrete: 0, semRegra: 0 });
  });

  it('regra em % depende do frete: fica para o acerto', () => {
    const pct: RegraComissao = { ...regra150, tipo: 'pct_frete_bruto', percentual: 12, valorCentavos: null };
    expect(estimarComissao([v(10)], [pct])).toEqual({ totalCentavos: 0, dependeDoFrete: 1, semRegra: 0 });
  });

  it('sem regra vigente', () => {
    expect(estimarComissao([v(10)], [])).toEqual({ totalCentavos: 0, dependeDoFrete: 0, semRegra: 1 });
  });
});

describe('despesaReembolsavel (Q5)', () => {
  it.each(['pedagio', 'borracharia', 'manutencao', 'estacionamento', 'lavagem', 'chapa'])('%s: despesa do caminhão, reembolsa', (t) => {
    expect(despesaReembolsavel(t)).toBe(true);
  });
  it.each(['alimentacao', 'pernoite', 'outros'])('%s: não reembolsa', (t) => {
    expect(despesaReembolsavel(t)).toBe(false);
  });
});

describe('periodoSugerido (Q2)', () => {
  // 01/10/2026 é uma quinta-feira
  it('mensal: o mês anterior inteiro', () => {
    expect(periodoSugerido('mensal', '2026-10-01')).toEqual({ inicio: '2026-09-01', fim: '2026-09-30' });
    expect(periodoSugerido('mensal', '2026-01-10')).toEqual({ inicio: '2025-12-01', fim: '2025-12-31' });
    expect(periodoSugerido('mensal', '2028-03-05')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' }); // bissexto
  });

  it('quinzenal: a última quinzena fechada', () => {
    expect(periodoSugerido('quinzenal', '2026-10-01')).toEqual({ inicio: '2026-09-16', fim: '2026-09-30' });
    expect(periodoSugerido('quinzenal', '2026-10-16')).toEqual({ inicio: '2026-10-01', fim: '2026-10-15' });
  });

  it('semanal: a semana anterior, de segunda a domingo', () => {
    expect(periodoSugerido('semanal', '2026-10-01')).toEqual({ inicio: '2026-09-21', fim: '2026-09-27' });
    // numa segunda, a semana anterior inteira
    expect(periodoSugerido('semanal', '2026-10-05')).toEqual({ inicio: '2026-09-28', fim: '2026-10-04' });
  });
});
