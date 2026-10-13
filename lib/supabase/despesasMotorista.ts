// O que o motorista pagou do bolso, por tipo (pedidos de 2026-10-07 e 2026-10-13): pedágio
// aparece em Pedágio e manutenção em Manutenção, com o que falta devolver. Manutenção junta
// as duas fontes: a despesa que o motorista lançou e a manutenção que a gestão lançou dizendo
// que um motorista pagou. Devolve no acerto ou pela baixa do dono (o que vier primeiro).
import { situacaoReembolso, type SituacaoReembolso } from '@/lib/domain/despesas';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

export type ItemPagoMotorista = {
  origem: 'despesa' | 'manutencao';
  id: string;
  data: string;
  valorCentavos: number;
  motorista: string;
  placa: string | null;
  descricao: string | null;
  conferido: boolean;
  semFoto: boolean;
  situacao: SituacaoReembolso;
  reembolsadoEm: string | null;
  /** Despesa abre a conferência; manutenção da gestão não tem página própria. */
  href: string | null;
};

/** Do mês (aaaa-mm-dd a aaaa-mm-dd) e, de qualquer data, o que ainda falta devolver. */
export async function carregarDespesasMotorista(
  supabase: Cliente,
  tipo: 'pedagio' | 'manutencao',
  periodo: { inicio: string; fim: string },
) {
  const doPeriodo = (data: string) => data >= periodo.inicio && data < periodo.fim;
  const [{ data: despesas }, { data: manutencoes }] = await Promise.all([
    supabase
      .from('despesas_viagem')
      .select(
        'id, data, valor_centavos, conferido, reembolsavel, pago_pelo_motorista, reembolsado_em, foto_path, descricao, acertos(status), funcionarios(nome), caminhoes(placa)',
      )
      .eq('tipo', tipo)
      .or(`acerto_id.is.null,and(data.gte.${periodo.inicio},data.lt.${periodo.fim})`)
      .order('data', { ascending: false }),
    tipo === 'manutencao'
      ? supabase
          .from('manutencoes')
          .select(
            'id, data, valor_centavos, descricao, arquivo_path, reembolsado_em, caminhoes(placa), funcionarios(nome)',
          )
          .not('pago_por_funcionario_id', 'is', null)
          .or(`reembolsado_em.is.null,and(data.gte.${periodo.inicio},data.lt.${periodo.fim})`)
          .order('data', { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const deDespesas: (ItemPagoMotorista & { pagoPeloMotorista: boolean })[] = (despesas ?? []).map(
    (d) => ({
      origem: 'despesa',
      id: d.id,
      data: d.data,
      valorCentavos: d.valor_centavos,
      motorista: d.funcionarios?.nome ?? '',
      placa: d.caminhoes?.placa ?? null,
      descricao: d.descricao,
      conferido: d.conferido,
      semFoto: !d.foto_path,
      situacao: situacaoReembolso({
        reembolsavel: d.reembolsavel,
        acertoStatus: d.acertos?.status ?? null,
        pagoPeloMotorista: d.pago_pelo_motorista,
        devolvidoEm: d.reembolsado_em,
      }),
      reembolsadoEm: d.reembolsado_em,
      href: `/g/abastecimentos/despesas/${d.id}`,
      pagoPeloMotorista: d.pago_pelo_motorista,
    }),
  );
  const deManutencoes: ItemPagoMotorista[] = (manutencoes ?? []).map((m) => ({
    origem: 'manutencao',
    id: m.id,
    data: m.data,
    valorCentavos: m.valor_centavos,
    motorista: m.funcionarios?.nome ?? '',
    placa: m.caminhoes?.placa ?? null,
    descricao: m.descricao,
    conferido: true, // lançada pela própria gestão
    semFoto: !m.arquivo_path,
    situacao: m.reembolsado_em ? 'devolvido' : 'a_devolver',
    reembolsadoEm: m.reembolsado_em,
    href: null,
  }));

  // na lista: o que o motorista pagou, do mês ou ainda a devolver
  const itens = [...deDespesas.filter((d) => d.pagoPeloMotorista), ...deManutencoes]
    .filter((i) => doPeriodo(i.data) || i.situacao === 'a_devolver')
    .sort((a, b) => b.data.localeCompare(a.data));

  return {
    itens,
    totalPeriodoCentavos: itens
      .filter((i) => doPeriodo(i.data))
      .reduce((t, i) => t + i.valorCentavos, 0),
    aDevolverCentavos: itens
      .filter((i) => i.situacao === 'a_devolver')
      .reduce((t, i) => t + i.valorCentavos, 0),
    /** Despesa do tipo lançada pelo motorista, mas paga pela empresa (entra no "pago pelo dono"). */
    pagoEmpresaPeriodoCentavos: deDespesas
      .filter((d) => !d.pagoPeloMotorista && doPeriodo(d.data))
      .reduce((t, d) => t + d.valorCentavos, 0),
  };
}
