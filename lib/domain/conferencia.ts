// Análise de vários abastecimentos para a conferência do gestor (RF-13, regras §5).
// Cada abastecimento é comparado só com o que veio ANTES dele, no histórico completo
// do caminhão (inclusive de outros motoristas).
import { detectarAnomalias, montarContextoAnalise, type Anomalia } from './anomalias';
import type { Configuracoes } from './configuracoes';

export type AbastecimentoConferencia = {
  id: string;
  caminhaoId: string;
  km: number;
  litros: number;
  tanqueCheio: boolean;
  /** ISO 8601. */
  dataHora: string;
  valorTotalCentavos: number;
  nfceChave: string | null;
  fotoPath: string | null;
};

export type Analise = { anomalias: Anomalia[]; kmL: number | null };

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export function analisarAbastecimentos(
  lista: readonly AbastecimentoConferencia[],
  capacidades: Readonly<Record<string, number | null>>,
  config: Configuracoes,
): Map<string, Analise> {
  const porCaminhao = new Map<string, AbastecimentoConferencia[]>();
  for (const a of lista) porCaminhao.set(a.caminhaoId, [...(porCaminhao.get(a.caminhaoId) ?? []), a]);

  const resultado = new Map<string, Analise>();
  for (const a of lista) {
    const instante = new Date(a.dataHora).getTime();
    // histórico do caminhão até este abastecimento (inclusive): o que veio depois não conta
    const historico = (porCaminhao.get(a.caminhaoId) ?? []).filter((h) => new Date(h.dataHora).getTime() <= instante);
    // preço: mediana dos 30 dias anteriores, de todos os caminhões, sem o próprio
    const precos = lista
      .filter((h) => {
        const t = new Date(h.dataHora).getTime();
        return h.id !== a.id && t <= instante && t > instante - TRINTA_DIAS_MS;
      })
      .map((h) => Math.round(h.valorTotalCentavos / h.litros));

    const contexto = montarContextoAnalise(a, historico, capacidades[a.caminhaoId] ?? null, precos, config);
    resultado.set(a.id, {
      anomalias: detectarAnomalias(
        { km: a.km, litros: a.litros, valorTotalCentavos: a.valorTotalCentavos, dataHora: a.dataHora, nfceChave: a.nfceChave, fotoPath: a.fotoPath },
        contexto,
      ),
      kmL: contexto.kmLDesteAbastecimento,
    });
  }
  return resultado;
}
