// Despesas que os motoristas lançaram, por tipo (pedido de 2026-10-07): pedágio aparece em
// Pedágio e manutenção em Manutenção, sempre com o caminhão. Sem "quem pagou" (o dono não
// quer esse vínculo, 2026-10-13): só a despesa e o caminhão.
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Despesas do tipo lançadas no período (aaaa-mm-dd a aaaa-mm-dd), mais recentes primeiro. */
export async function carregarDespesasMotorista(
  supabase: Cliente,
  tipo: 'pedagio' | 'manutencao',
  periodo: { inicio: string; fim: string },
) {
  const { data } = await supabase
    .from('despesas_viagem')
    .select(
      'id, data, valor_centavos, conferido, foto_path, descricao, funcionarios(nome), caminhoes(placa)',
    )
    .eq('tipo', tipo)
    .gte('data', periodo.inicio)
    .lt('data', periodo.fim)
    .order('data', { ascending: false });

  const itens = (data ?? []).map((d) => ({
    id: d.id,
    data: d.data,
    valorCentavos: d.valor_centavos,
    motorista: d.funcionarios?.nome ?? '',
    placa: d.caminhoes?.placa ?? null,
    descricao: d.descricao,
    conferido: d.conferido,
    semFoto: !d.foto_path,
  }));
  return { itens, totalCentavos: itens.reduce((t, i) => t + i.valorCentavos, 0) };
}

export type DespesaDoMotorista = Awaited<
  ReturnType<typeof carregarDespesasMotorista>
>['itens'][number];
