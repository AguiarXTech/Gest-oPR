// Manutenção preventiva por km e/ou tempo (RF-32). O km atual do caminhão vem dos
// abastecimentos, viagens e manutenções (trigger), então o aviso sai sozinho.

export type StatusManutencao = 'vencido' | 'proximo' | 'ok' | 'sem_registro';

export type ItemPlano = {
  intervaloKm: number | null;
  intervaloDias: number | null;
  ultimoKm: number | null;
  /** aaaa-mm-dd */
  ultimaData: string | null;
};

export type SituacaoItem = {
  status: StatusManutencao;
  /** km que faltam (negativo = passou), se o item tem intervalo por km. */
  faltaKm: number | null;
  /** dias que faltam (negativo = passou), se o item tem intervalo por tempo. */
  faltaDias: number | null;
};

const ORDEM: Record<StatusManutencao, number> = { vencido: 0, sem_registro: 1, proximo: 2, ok: 3 };

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
const somarDias = (data: string, dias: number) => new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

/**
 * Situação de um item: vale o que vencer primeiro (km ou tempo).
 * Sem a última vez registrada não dá para calcular: "sem_registro".
 */
export function situacaoItem(item: ItemPlano, kmAtual: number, hoje: string, avisoKm: number, avisoDias: number): SituacaoItem {
  const faltaKm = item.intervaloKm !== null && item.ultimoKm !== null ? item.ultimoKm + item.intervaloKm - kmAtual : null;
  const faltaDias = item.intervaloDias !== null && item.ultimaData !== null ? diasEntre(hoje, somarDias(item.ultimaData, item.intervaloDias)) : null;

  const semRegistro = (item.intervaloKm !== null && item.ultimoKm === null) || (item.intervaloDias !== null && item.ultimaData === null);
  const status: StatusManutencao =
    (faltaKm !== null && faltaKm < 0) || (faltaDias !== null && faltaDias < 0)
      ? 'vencido'
      : semRegistro
        ? 'sem_registro'
        : (faltaKm !== null && faltaKm <= avisoKm) || (faltaDias !== null && faltaDias <= avisoDias)
          ? 'proximo'
          : 'ok';
  return { status, faltaKm, faltaDias };
}

export function ordenarPorUrgencia<T extends { situacao: SituacaoItem }>(itens: readonly T[]): T[] {
  return [...itens].sort(
    (a, b) =>
      ORDEM[a.situacao.status] - ORDEM[b.situacao.status] ||
      (a.situacao.faltaKm ?? Infinity) - (b.situacao.faltaKm ?? Infinity) ||
      (a.situacao.faltaDias ?? Infinity) - (b.situacao.faltaDias ?? Infinity),
  );
}
