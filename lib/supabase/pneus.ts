// Pneus com o km de cada um (lib/domain/pneus.ts): montagens fechadas usam o km gravado;
// a montagem aberta usa o hodômetro do caminhão ou as viagens da carreta até agora.
import {
  kmCarretaNoPeriodo,
  kmDoPneu,
  kmMontagemCavalo,
  situacaoPneu,
  type ViagemCarreta,
} from '@/lib/domain/pneus';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

const SELECT_PNEU =
  '*, fornecedores(nome), montagens_pneu(id, caminhao_id, carreta_id, posicao, vida, montado_em, km_montagem, retirado_em, km_retirada, km_rodado), recapagens_pneu(id, enviado_em, retornou_em, custo_centavos, vida_resultante, observacoes, fornecedores(nome))';

export async function carregarPneus(supabase: Cliente, pneuId?: string) {
  let consulta = supabase.from('pneus').select(SELECT_PNEU).order('marca_fogo');
  if (pneuId) consulta = consulta.eq('id', pneuId);
  const [{ data: pneus }, { data: caminhoes }, { data: carretas }] = await Promise.all([
    consulta,
    supabase
      .from('caminhoes')
      .select('id, placa, apelido, tipo, eixos, km_atual, ativo')
      .order('placa'),
    supabase.from('carretas').select('id, placa, apelido, eixos, ativo').order('placa'),
  ]);

  // carreta não tem hodômetro: viagens dela desde a montagem aberta mais antiga
  const abertasCarreta = (pneus ?? []).flatMap((p) =>
    p.montagens_pneu.filter((m) => !m.retirado_em && m.carreta_id),
  );
  let viagens: ViagemCarreta[] = [];
  if (abertasCarreta.length > 0) {
    const desde = abertasCarreta.map((m) => m.montado_em).sort()[0];
    const { data } = await supabase
      .from('viagens')
      .select('carreta_id, data_saida, km_saida, km_chegada')
      .in('carreta_id', [...new Set(abertasCarreta.map((m) => m.carreta_id as string))])
      .neq('status', 'cancelada')
      .gte('data_saida', desde);
    viagens = (data ?? []).map((v) => ({
      carretaId: v.carreta_id as string,
      dataSaida: v.data_saida,
      kmRodado: v.km_chegada !== null ? v.km_chegada - v.km_saida : null,
    }));
  }

  const caminhaoPorId = new Map((caminhoes ?? []).map((c) => [c.id, c]));
  const carretaPorId = new Map((carretas ?? []).map((c) => [c.id, c]));

  const lista = (pneus ?? []).map((p) => {
    const montagens = [...p.montagens_pneu]
      .sort((a, b) => b.montado_em.localeCompare(a.montado_em))
      .map((m) => {
        const caminhao = m.caminhao_id ? caminhaoPorId.get(m.caminhao_id) : undefined;
        const carreta = m.carreta_id ? carretaPorId.get(m.carreta_id) : undefined;
        const km = m.retirado_em
          ? (m.km_rodado ?? 0)
          : caminhao
            ? kmMontagemCavalo(m.km_montagem ?? caminhao.km_atual, caminhao.km_atual)
            : kmCarretaNoPeriodo(viagens, m.carreta_id as string, m.montado_em, null);
        return {
          ...m,
          km,
          veiculo: caminhao
            ? {
                tipo: 'caminhao' as const,
                id: caminhao.id,
                placa: caminhao.placa,
                kmAtual: caminhao.km_atual,
              }
            : {
                tipo: 'carreta' as const,
                id: carreta?.id ?? '',
                placa: carreta?.placa ?? '',
                kmAtual: null,
              },
        };
      });
    const condicao = { condicaoEntrada: p.condicao_entrada, vida: p.vida };
    return {
      ...p,
      situacao: situacaoPneu(condicao),
      km: kmDoPneu(
        condicao,
        montagens.map((m) => ({ vida: m.vida, km: m.km })),
      ),
      montagens,
      montagemAtual: montagens.find((m) => !m.retirado_em) ?? null,
      recapagemAtual: p.recapagens_pneu.find((r) => !r.retornou_em) ?? null,
    };
  });

  return { pneus: lista, caminhoes: caminhoes ?? [], carretas: carretas ?? [] };
}

export type PneuCarregado = Awaited<ReturnType<typeof carregarPneus>>['pneus'][number];
