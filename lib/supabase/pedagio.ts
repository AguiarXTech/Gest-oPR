// Controle de pedágio do mês: para cada viagem, as passagens previstas (ida e volta em
// cada praça ativa) e o que o app de pagamento cobrou.
import { dataBrasilia } from '@/lib/domain/comissao';
import {
  conferirCobranca,
  eixosDoConjunto,
  passagensPrevistas,
  type Conferencia,
  type Sentido,
} from '@/lib/domain/pedagio';
import { limitesDoMes } from '@/lib/supabase/painel';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

export type LinhaPassagem = {
  viagemId: string;
  pracaId: string;
  praca: string;
  sentido: Sentido;
  data: string;
  eixos: number | null;
  previstoCentavos: number | null;
  cobranca: {
    id: string;
    valorCentavos: number;
    situacao: 'conferido' | 'contestar' | 'contestado' | 'ressarcido';
    observacao: string | null;
  } | null;
  conferencia: Conferencia | null;
  diferencaCentavos: number | null;
};

export type ViagemPedagioMes = {
  id: string;
  placa: string;
  placaCarreta: string | null;
  motorista: string;
  dataSaida: string;
  eixosIda: number | null;
  eixosVolta: number | null;
  passagens: LinhaPassagem[];
};

export async function carregarPedagioMes(supabase: Cliente, mes: string) {
  const { inicio, fim } = limitesDoMes(mes);
  const [{ data: viagens }, { data: pracas }] = await Promise.all([
    supabase
      .from('viagens')
      .select(
        'id, data_saida, data_chegada, eixos_ida, eixos_volta, caminhoes(placa, eixos, eixos_suspensos), carretas(placa, eixos, eixos_suspensos), funcionarios(nome), fretes(sentido), cobrancas_pedagio(id, praca_id, sentido, valor_cobrado_centavos, situacao, observacao)',
      )
      .neq('status', 'cancelada')
      .gte('data_saida', inicio)
      .lt('data_saida', fim)
      .order('data_saida', { ascending: false }),
    supabase
      .from('pracas_pedagio')
      .select('id, nome, rodovia, ativa, tarifas_pedagio(vigencia_inicio, tarifa_eixo_centavos)')
      .order('nome'),
  ]);

  const ativas = (pracas ?? []).filter((p) => p.ativa);
  const lista: ViagemPedagioMes[] = (viagens ?? []).map((v) => {
    const passagens = ativas.flatMap((p) => {
      const previstas = passagensPrevistas(
        {
          dataIda: dataBrasilia(v.data_saida),
          dataVolta: dataBrasilia(v.data_chegada ?? v.data_saida),
          temFreteIda: v.fretes.some((f) => f.sentido === 'ida'),
          eixosIda: v.eixos_ida,
          eixosVolta: v.eixos_volta,
        },
        eixosDoConjunto(
          { eixos: v.caminhoes?.eixos ?? null, eixosSuspensos: v.caminhoes?.eixos_suspensos ?? 0 },
          v.carretas
            ? { eixos: v.carretas.eixos, eixosSuspensos: v.carretas.eixos_suspensos }
            : null,
        ),
        p.tarifas_pedagio.map((t) => ({
          vigenciaInicio: t.vigencia_inicio,
          tarifaEixoCentavos: t.tarifa_eixo_centavos,
        })),
      );
      return previstas.map((pp): LinhaPassagem => {
        const c = v.cobrancas_pedagio.find((x) => x.praca_id === p.id && x.sentido === pp.sentido);
        const conf = c ? conferirCobranca(pp.previstoCentavos, c.valor_cobrado_centavos) : null;
        return {
          viagemId: v.id,
          pracaId: p.id,
          praca: p.nome,
          sentido: pp.sentido,
          data: pp.data,
          eixos: pp.eixos,
          previstoCentavos: pp.previstoCentavos,
          cobranca: c
            ? {
                id: c.id,
                valorCentavos: c.valor_cobrado_centavos,
                situacao: c.situacao,
                observacao: c.observacao,
              }
            : null,
          conferencia: conf?.situacao ?? null,
          diferencaCentavos: conf?.diferencaCentavos ?? null,
        };
      });
    });
    return {
      id: v.id,
      placa: v.caminhoes?.placa ?? '',
      placaCarreta: v.carretas?.placa ?? null,
      motorista: v.funcionarios?.nome ?? '',
      dataSaida: v.data_saida,
      eixosIda: v.eixos_ida,
      eixosVolta: v.eixos_volta,
      passagens,
    };
  });

  const todas = lista.flatMap((v) => v.passagens);
  const totais = {
    previstoCentavos: todas.reduce((t, p) => t + (p.previstoCentavos ?? 0), 0),
    cobradoCentavos: todas.reduce((t, p) => t + (p.cobranca?.valorCentavos ?? 0), 0),
    // dinheiro a recuperar: cobranças a mais que ainda não foram ressarcidas
    aMaisEmAbertoCentavos: todas
      .filter((p) => p.conferencia === 'cobrou_mais' && p.cobranca?.situacao !== 'ressarcido')
      .reduce((t, p) => t + (p.diferencaCentavos ?? 0), 0),
    semLancamento: todas.filter((p) => !p.cobranca).length,
    paraContestar: todas.filter((p) => p.cobranca?.situacao === 'contestar').length,
  };

  return { viagens: lista, pracas: pracas ?? [], totais };
}
