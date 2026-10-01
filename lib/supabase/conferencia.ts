import { analisarAbastecimentos, type Analise } from '@/lib/domain/conferencia';
import type { Configuracoes } from '@/lib/domain/configuracoes';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Histórico extra antes do período: o consumo precisa do tanque cheio anterior. */
const MARGEM_HISTORICO_DIAS = 120;

/**
 * Analisa (km/L + anomalias) os abastecimentos a partir de `desde`, usando o histórico
 * completo dos caminhões (gestor lê tudo pela RLS).
 */
export async function analisarDesde(supabase: Cliente, desde: Date, config: Configuracoes): Promise<Map<string, Analise>> {
  const inicio = new Date(desde.getTime() - MARGEM_HISTORICO_DIAS * 24 * 60 * 60 * 1000);
  const [{ data: abastecimentos }, { data: caminhoes }] = await Promise.all([
    supabase
      .from('abastecimentos')
      .select('id, caminhao_id, km, litros, tanque_cheio, data_hora, valor_total_centavos, nfce_chave, foto_path')
      .gte('data_hora', inicio.toISOString())
      .order('data_hora'),
    supabase.from('caminhoes').select('id, capacidade_tanque_l'),
  ]);

  const capacidades = Object.fromEntries(
    (caminhoes ?? []).map((c) => [c.id, c.capacidade_tanque_l === null ? null : Number(c.capacidade_tanque_l)]),
  );
  return analisarAbastecimentos(
    (abastecimentos ?? []).map((a) => ({
      id: a.id,
      caminhaoId: a.caminhao_id,
      km: a.km,
      litros: Number(a.litros),
      tanqueCheio: a.tanque_cheio,
      dataHora: a.data_hora,
      valorTotalCentavos: a.valor_total_centavos,
      nfceChave: a.nfce_chave,
      fotoPath: a.foto_path,
    })),
    capacidades,
    config,
  );
}
