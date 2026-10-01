import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatarPlaca } from '@/lib/domain/placa';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { createClient } from '@/lib/supabase/server';
import { FormFinalizarViagem } from './FormFinalizarViagem';

export const metadata: Metadata = { title: 'Viagem · Gestão Frota' };

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const km = new Intl.NumberFormat('pt-BR');

export default async function Viagem({ params }: PageProps<'/m/viagem/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [config, { data: viagem }] = await Promise.all([
    obterConfiguracoes(),
    supabase
      .from('viagens')
      .select('id, origem, destino, data_saida, data_chegada, km_saida, km_chegada, status, caminhoes(placa, apelido)')
      .eq('id', id)
      .maybeSingle(),
  ]);
  if (!viagem) notFound();

  const resumo = (
    <section className="flex flex-col gap-1 rounded-2xl bg-grafite p-5 text-white shadow-xs">
      <p className="text-sm font-medium text-white/70">
        {viagem.status === 'em_andamento' ? 'Viagem em andamento' : viagem.status === 'concluida' ? 'Viagem finalizada' : 'Viagem cancelada'}
      </p>
      <p className="text-2xl font-bold">
        {viagem.origem} → {viagem.destino} → volta
      </p>
      <p className="text-white/70">
        {viagem.caminhoes ? formatarPlaca(viagem.caminhoes.placa) : ''} · saiu {dataHora.format(new Date(viagem.data_saida))} com{' '}
        <span className="tabular-nums">{km.format(viagem.km_saida)} km</span>
      </p>
      {viagem.km_chegada !== null && viagem.data_chegada && (
        <p className="text-white/70">
          chegou {dataHora.format(new Date(viagem.data_chegada))} ·{' '}
          <span className="tabular-nums">{km.format(viagem.km_chegada - viagem.km_saida)} km rodados</span>
        </p>
      )}
    </section>
  );

  return (
    <>
      <h1 className="text-3xl">{viagem.status === 'em_andamento' ? 'Finalizar viagem' : 'Viagem'}</h1>
      {resumo}
      {viagem.status === 'em_andamento' ? (
        <FormFinalizarViagem viagemId={viagem.id} kmSaida={viagem.km_saida} config={config} />
      ) : (
        <Link
          href="/m"
          className="inline-flex h-14 items-center justify-center rounded-lg border bg-card text-lg font-semibold shadow-xs"
        >
          Voltar ao início
        </Link>
      )}
    </>
  );
}
