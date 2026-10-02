import { ordenarPorUrgencia, situacaoItem } from '@/lib/domain/manutencao';
import { hojeIso } from '@/lib/formatar';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Itens do plano de cada caminhão ativo com a situação (vencido / próximo / em dia). */
export async function carregarSituacaoManutencao(supabase: Cliente) {
  const [config, { data: caminhoes }, { data: planos }] = await Promise.all([
    obterConfiguracoes(),
    supabase.from('caminhoes').select('id, placa, apelido, km_atual').eq('ativo', true).order('placa'),
    supabase.from('planos_manutencao').select('*').eq('ativo', true).order('item'),
  ]);
  const hoje = hojeIso();

  return (caminhoes ?? []).map((c) => ({
    ...c,
    itens: ordenarPorUrgencia(
      (planos ?? [])
        .filter((p) => p.caminhao_id === c.id)
        .map((p) => ({
          ...p,
          situacao: situacaoItem(
            { intervaloKm: p.intervalo_km, intervaloDias: p.intervalo_dias, ultimoKm: p.ultimo_km, ultimaData: p.ultima_data },
            c.km_atual,
            hoje,
            config.manutencaoAvisoKm,
            config.manutencaoAvisoDias,
          ),
        })),
    ),
  }));
}
