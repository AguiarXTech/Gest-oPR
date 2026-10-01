// Resultado — docs/04-REGRAS-DE-NEGOCIO.md §8.

/**
 * Diesel rateado por km (§8.2): um tanque cobre mais de uma viagem, então o diesel
 * do caminhão no mês é dividido pelas viagens na proporção do km rodado.
 */
export function ratearDiesel(dieselMesCentavos: number, kmViagem: number, kmTotalMes: number): number {
  if (kmTotalMes <= 0 || kmViagem <= 0) return 0;
  return Math.round((dieselMesCentavos * kmViagem) / kmTotalMes);
}

/** aaaa-mm de um instante no horário de Brasília (competência). */
export function competencia(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date(iso));
}
