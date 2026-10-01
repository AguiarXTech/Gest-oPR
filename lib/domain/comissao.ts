// Comissão por viagem — docs/04-REGRAS-DE-NEGOCIO.md §6.
// Em uso (Q1, 2026-10-01): valor fixo por viagem (ciclo ida + volta), por motorista.
// Os demais tipos ficam como configuração, caso a regra mude.
import { aplicarPercentual, percentualParaPontosBase } from './dinheiro';

export type TipoComissao = 'valor_por_viagem' | 'pct_frete_bruto' | 'pct_frete_liquido' | 'valor_por_km';

export type RegraComissao = {
  id: string;
  tipo: TipoComissao;
  /** Percentual (12.5 = 12,5%), para os tipos pct_*. */
  percentual: number | null;
  /** Centavos, para valor_por_viagem e valor_por_km (por km). */
  valorCentavos: number | null;
  deduzPedagio: boolean;
  deduzCombustivel: boolean;
  apenasComFrete: boolean;
  /** aaaa-mm-dd */
  vigenciaInicio: string;
  vigenciaFim: string | null;
};

export type ViagemComissao = {
  /** Σ fretes (ida + volta) da viagem. */
  freteCentavos: number;
  kmRodado: number;
  pedagiosCentavos: number;
  /** Diesel rateado por km (regras §8.2); só usado em pct_frete_liquido com deduz_combustivel. */
  dieselRateadoCentavos: number;
};

/** Comissão de UMA viagem, já arredondada (arredondamento por viagem, §1). */
export function calcularComissaoViagem(v: ViagemComissao, r: RegraComissao): number {
  switch (r.tipo) {
    case 'valor_por_viagem':
      return r.apenasComFrete && v.freteCentavos === 0 ? 0 : (r.valorCentavos ?? 0);
    case 'pct_frete_bruto':
      return aplicarPercentual(v.freteCentavos, percentualParaPontosBase(r.percentual ?? 0));
    case 'pct_frete_liquido': {
      const base = Math.max(
        0,
        v.freteCentavos - (r.deduzPedagio ? v.pedagiosCentavos : 0) - (r.deduzCombustivel ? v.dieselRateadoCentavos : 0),
      );
      return aplicarPercentual(base, percentualParaPontosBase(r.percentual ?? 0));
    }
    case 'valor_por_km':
      return v.kmRodado * (r.valorCentavos ?? 0);
  }
}

/** Data (aaaa-mm-dd) de um instante no horário de Brasília. */
export function dataBrasilia(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

/** Regra cujo período contém a data de saída da viagem (vigências não se sobrepõem no banco). */
export function regraVigente<T extends Pick<RegraComissao, 'vigenciaInicio' | 'vigenciaFim'>>(regras: readonly T[], dataSaida: string): T | null {
  const dia = dataBrasilia(dataSaida);
  return regras.find((r) => r.vigenciaInicio <= dia && (r.vigenciaFim === null || dia <= r.vigenciaFim)) ?? null;
}
