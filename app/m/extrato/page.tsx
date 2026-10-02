// Extrato do motorista (RF-17, S4-6): quanto vai receber no próximo acerto (estimado),
// o mês atual e os acertos fechados. A RLS garante que ele vê só os próprios registros
// e não vê fretes (Q6).
import type { Metadata } from 'next';
import Link from 'next/link';
import { STATUS_ACERTO } from '@/components/acerto/status';
import { estimarComissao } from '@/lib/domain/acerto';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { competencia } from '@/lib/domain/resultado';
import { formatarData, formatarDataHora, formatarKm } from '@/lib/formatar';
import { paraRegraDominio } from '@/lib/supabase/acerto';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Meu extrato · Gestão RPortugues' };

const nomeMes = (aaaaMm: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(`${aaaaMm}-15T12:00:00Z`));

/** Competência (aaaa-mm) de agora, no horário de Brasília. */
function mesAtual() {
  return competencia(new Date().toISOString());
}

function Linha({ rotulo, valor, negativo, forte }: { rotulo: string; valor: number; negativo?: boolean; forte?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3 py-1', forte && 'mt-1 border-t pt-2 text-xl font-bold')}>
      <span>{rotulo}</span>
      <span className="tabular-nums">
        {negativo ? '− ' : ''}
        {formatarBRL(valor)}
      </span>
    </div>
  );
}

export default async function Extrato() {
  const supabase = await createClient();
  const fid = (await obterPerfilAtual())?.funcionario_id ?? '';
  const [{ data: viagens }, { data: regras }, { data: despesas }, { data: abastecimentos }, { data: adiantamentos }, { data: acertos }] =
    await Promise.all([
      supabase
        .from('viagens')
        .select('id, data_saida, km_saida, km_chegada, acerto_id, caminhoes(placa)')
        .eq('status', 'concluida')
        .eq('motorista_id', fid)
        .order('data_saida', { ascending: false })
        .limit(60),
      supabase.from('regras_comissao').select('*').eq('funcionario_id', fid),
      supabase.from('despesas_viagem').select('valor_centavos').eq('motorista_id', fid).is('acerto_id', null).eq('reembolsavel', true),
      supabase.from('abastecimentos').select('valor_total_centavos').eq('motorista_id', fid).is('acerto_id', null).eq('forma_pagamento', 'motorista'),
      supabase.from('adiantamentos').select('valor_centavos, data').eq('motorista_id', fid).is('acerto_id', null),
      supabase
        .from('acertos')
        .select('id, periodo_inicio, periodo_fim, status, total_comissao_centavos, total_reembolsos_centavos, total_adiantamentos_centavos, saldo_centavos, pago_em')
        .eq('motorista_id', fid)
        .in('status', ['fechado', 'pago'])
        .order('periodo_fim', { ascending: false })
        .limit(12),
    ]);

  const pendentes = (viagens ?? []).filter((v) => v.acerto_id === null);
  const estimativa = estimarComissao(
    pendentes.map((v) => ({ dataSaida: v.data_saida, kmRodado: (v.km_chegada ?? v.km_saida) - v.km_saida })),
    (regras ?? []).map(paraRegraDominio),
  );
  const reembolsos =
    (despesas ?? []).reduce((t, d) => t + d.valor_centavos, 0) + (abastecimentos ?? []).reduce((t, a) => t + a.valor_total_centavos, 0);
  const adiant = (adiantamentos ?? []).reduce((t, a) => t + a.valor_centavos, 0);
  const saldo = estimativa.totalCentavos + reembolsos - adiant;

  const mes = mesAtual();
  const doMes = (viagens ?? []).filter((v) => competencia(v.data_saida) === mes);
  const kmMes = doMes.reduce((t, v) => t + ((v.km_chegada ?? v.km_saida) - v.km_saida), 0);

  return (
    <>
      <h1 className="text-3xl">Meu extrato</h1>

      <section className="flex flex-col gap-1 rounded-2xl bg-grafite p-5 text-white shadow-xs">
        <p className="text-sm text-white/70">Este mês ({nomeMes(mes)})</p>
        <p className="text-3xl font-bold tabular-nums">
          {doMes.length} viage{doMes.length === 1 ? 'm' : 'ns'}
        </p>
        <p className="text-white/70 tabular-nums">{formatarKm(kmMes)} rodados</p>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="mb-2 text-lg font-semibold">A receber no próximo acerto</h2>
        <Linha rotulo={`Comissão (${pendentes.length} viage${pendentes.length === 1 ? 'm' : 'ns'})`} valor={estimativa.totalCentavos} />
        <Linha rotulo="Reembolsos (despesas do caminhão que você pagou)" valor={reembolsos} />
        <Linha rotulo="Adiantamentos recebidos" valor={adiant} negativo />
        <Linha rotulo={saldo >= 0 ? 'Saldo estimado' : 'Você deve (estimado)'} valor={Math.abs(saldo)} forte />
        <p className="mt-2 text-sm text-muted-foreground">
          Estimativa. O valor oficial sai quando o escritório fechar o acerto.
          {estimativa.dependeDoFrete > 0 && ` ${estimativa.dependeDoFrete} viagem(ns) dependem do frete e entram só no acerto.`}
          {estimativa.semRegra > 0 && ` ${estimativa.semRegra} viagem(ns) sem comissão cadastrada: fale com o escritório.`}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Acertos</h2>
        {(acertos ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nenhum acerto fechado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(acertos ?? []).map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {formatarData(a.periodo_inicio)} a {formatarData(a.periodo_fim)}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-sm font-medium', STATUS_ACERTO[a.status].classe)}>
                    {a.status === 'pago' && a.pago_em ? `Pago em ${formatarData(a.pago_em)}` : STATUS_ACERTO[a.status].rotulo}
                  </span>
                </div>
                <Linha rotulo="Comissão" valor={a.total_comissao_centavos} />
                <Linha rotulo="Reembolsos" valor={a.total_reembolsos_centavos} />
                <Linha rotulo="Adiantamentos" valor={a.total_adiantamentos_centavos} negativo />
                <Linha rotulo={a.saldo_centavos >= 0 ? 'Saldo' : 'Você ficou devendo'} valor={Math.abs(a.saldo_centavos)} forte />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Últimas viagens</h2>
        <ul className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs">
          {(viagens ?? []).slice(0, 10).map((v) => (
            <li key={v.id}>
              <Link href={`/m/viagem/${v.id}`} className="flex justify-between gap-3 p-3 tabular-nums">
                <span>{formatarDataHora(v.data_saida)}</span>
                <span className="text-muted-foreground">
                  {v.km_chegada !== null && formatarKm(v.km_chegada - v.km_saida)} {v.acerto_id ? '· acertada' : ''}
                </span>
              </Link>
            </li>
          ))}
          {(viagens ?? []).length === 0 && <li className="p-3 text-muted-foreground">Nenhuma viagem concluída.</li>}
        </ul>
      </section>
    </>
  );
}
