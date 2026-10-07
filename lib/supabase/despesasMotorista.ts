// Despesas que o motorista pagou do bolso, por tipo (pedido de 2026-10-07): pedágio aparece
// em Pedágio e manutenção em Manutenção, com o que falta devolver no acerto.
import { situacaoReembolso } from '@/lib/domain/despesas';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Do mês (aaaa-mm-dd a aaaa-mm-dd) e, de qualquer data, as que ainda não foram devolvidas. */
export async function carregarDespesasMotorista(
  supabase: Cliente,
  tipo: 'pedagio' | 'manutencao',
  periodo: { inicio: string; fim: string },
) {
  const { data } = await supabase
    .from('despesas_viagem')
    .select(
      'id, data, valor_centavos, conferido, reembolsavel, foto_path, descricao, acerto_id, acertos(status), funcionarios(nome), caminhoes(placa)',
    )
    .eq('tipo', tipo)
    .or(`acerto_id.is.null,and(data.gte.${periodo.inicio},data.lt.${periodo.fim})`)
    .order('data', { ascending: false });

  const itens = (data ?? []).map((d) => ({
    ...d,
    situacao: situacaoReembolso({
      reembolsavel: d.reembolsavel,
      acertoStatus: d.acertos?.status ?? null,
    }),
    doPeriodo: d.data >= periodo.inicio && d.data < periodo.fim,
  }));
  return {
    itens,
    totalPeriodoCentavos: itens
      .filter((d) => d.doPeriodo)
      .reduce((t, d) => t + d.valor_centavos, 0),
    aDevolverCentavos: itens
      .filter((d) => d.situacao === 'a_devolver')
      .reduce((t, d) => t + d.valor_centavos, 0),
  };
}

export type DespesaMotorista = Awaited<
  ReturnType<typeof carregarDespesasMotorista>
>['itens'][number];
