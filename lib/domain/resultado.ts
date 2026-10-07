// Resultado — docs/04-REGRAS-DE-NEGOCIO.md §8.
import { mediaPonderada, type Medicao } from './consumo';

/**
 * Diesel rateado por km (§8.2): um tanque cobre mais de uma viagem, então o diesel
 * do caminhão no mês é dividido pelas viagens na proporção do km rodado.
 */
export function ratearDiesel(
  dieselMesCentavos: number,
  kmViagem: number,
  kmTotalMes: number,
): number {
  if (kmTotalMes <= 0 || kmViagem <= 0) return 0;
  return Math.round((dieselMesCentavos * kmViagem) / kmTotalMes);
}

/** aaaa-mm de um instante no horário de Brasília (competência). */
export function competencia(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date(iso));
}

export type EntradaResultado = {
  /** Viagens concluídas do caminhão no mês. */
  viagens: { freteCentavos: number; kmRodado: number; comissaoCentavos: number }[];
  dieselCentavos: number;
  /** Medições de tanque cheio fechadas no mês (§4): dão o km/L exato. */
  medicoesConsumo: readonly Medicao[];
  pedagioCentavos: number;
  despesasCentavos: number;
  /** Oficina e peças do mês (manutenções registradas pela gestão). */
  manutencaoCentavos?: number;
};

export type Resultado = {
  receitaCentavos: number;
  dieselCentavos: number;
  pedagioCentavos: number;
  despesasCentavos: number;
  manutencaoCentavos: number;
  comissaoCentavos: number;
  resultadoCentavos: number;
  km: number;
  /** Custo total ÷ km (centavos por km), ou null sem km. */
  custoPorKmCentavos: number | null;
  /** Tanque cheio a tanque cheio (§4): Σ km ÷ Σ litros das medições do mês; null sem medição. */
  kmPorLitro: number | null;
};

/** Resultado por caminhão/mês (§8.1): receita − diesel − pedágio − despesas − manutenção − comissão. */
export function calcularResultado(e: EntradaResultado): Resultado {
  const receitaCentavos = e.viagens.reduce((t, v) => t + v.freteCentavos, 0);
  const comissaoCentavos = e.viagens.reduce((t, v) => t + v.comissaoCentavos, 0);
  const km = e.viagens.reduce((t, v) => t + v.kmRodado, 0);
  const manutencaoCentavos = e.manutencaoCentavos ?? 0;
  const custo =
    e.dieselCentavos +
    e.pedagioCentavos +
    e.despesasCentavos +
    manutencaoCentavos +
    comissaoCentavos;
  return {
    receitaCentavos,
    dieselCentavos: e.dieselCentavos,
    pedagioCentavos: e.pedagioCentavos,
    despesasCentavos: e.despesasCentavos,
    manutencaoCentavos,
    comissaoCentavos,
    resultadoCentavos: receitaCentavos - custo,
    km,
    custoPorKmCentavos: km > 0 ? Math.round(custo / km) : null,
    kmPorLitro: mediaPonderada(e.medicoesConsumo),
  };
}
