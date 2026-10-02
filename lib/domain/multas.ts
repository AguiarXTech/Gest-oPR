// Multas (RF-35): quem dirigia e prazo de indicação do condutor.
// Se a empresa não indica no prazo, vem a multa NIC (mesmo valor) e os pontos ficam com ela.

export type ViagemMulta = { motoristaId: string; caminhaoId: string; dataSaida: string; dataChegada: string | null };

/** Motorista da viagem do caminhão que estava em curso no momento da infração. */
export function motoristaNaHora(viagens: readonly ViagemMulta[], caminhaoId: string, dataInfracao: string): string | null {
  const t = Date.parse(dataInfracao);
  const v = viagens.find(
    (x) => x.caminhaoId === caminhaoId && Date.parse(x.dataSaida) <= t && (x.dataChegada === null || t <= Date.parse(x.dataChegada)),
  );
  return v?.motoristaId ?? null;
}

/** Prazo para indicar o condutor: data da notificação + N dias (config `multa_prazo_indicacao_dias`). */
export function prazoIndicacao(notificadaEm: string, dias: number): string {
  return new Date(Date.parse(`${notificadaEm}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

export type SituacaoMulta = 'indicar_atrasado' | 'indicar' | 'pagar' | 'resolvida';

export function situacaoMulta(m: { prazoIndicacao: string | null; indicadoEm: string | null; pagoEm: string | null }, hoje: string): SituacaoMulta {
  if (m.prazoIndicacao && !m.indicadoEm) return m.prazoIndicacao < hoje ? 'indicar_atrasado' : 'indicar';
  if (!m.pagoEm) return 'pagar';
  return 'resolvida';
}

export function diasAte(data: string, hoje: string): number {
  return Math.round((Date.parse(`${data}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
}
