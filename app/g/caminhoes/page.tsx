import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatarPlaca } from '@/lib/domain/placa';
import { urlsFotosCaminhoes } from '@/lib/supabase/fotosCaminhoes';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Caminhões · Gestão RPortugues' };

const numero = new Intl.NumberFormat('pt-BR');

export default async function ListaCaminhoes() {
  const supabase = await createClient();
  const { data: caminhoes, error } = await supabase
    .from('caminhoes')
    .select(
      'id, placa, apelido, tipo, marca, modelo, ano, configuracao_eixos, capacidade_tanque_l, km_atual, ativo, foto_path',
    )
    .order('ativo', { ascending: false })
    .order('placa');

  const fotos = await urlsFotosCaminhoes(supabase, caminhoes ?? []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Caminhões</h1>
        <Link
          href="/g/caminhoes/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Novo caminhão
        </Link>
      </div>

      {error && (
        <p className="text-destructive">
          Não foi possível carregar os caminhões. Recarregue a página.
        </p>
      )}

      {caminhoes?.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhum caminhão cadastrado.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {caminhoes?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/g/caminhoes/${c.id}`}
              className={cn(
                'flex flex-col gap-1 overflow-hidden rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40',
                !c.ativo && 'opacity-60',
              )}
            >
              {fotos.get(c.id) && (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
                <img
                  src={fotos.get(c.id)}
                  alt=""
                  className="-mx-4 -mt-4 mb-2 aspect-[16/9] w-[calc(100%+2rem)] max-w-none object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-semibold">{formatarPlaca(c.placa)}</span>
                <span className="flex gap-1">
                  {c.tipo === 'cavalo' && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">cavalo</span>
                  )}
                  {!c.ativo && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">desativado</span>
                  )}
                </span>
              </div>
              {c.apelido && <span className="font-medium">{c.apelido}</span>}
              <span className="text-sm text-muted-foreground">
                {[c.marca, c.modelo, c.ano, c.configuracao_eixos].filter(Boolean).join(' · ') ||
                  'Sem detalhes'}
              </span>
              <span className="text-sm text-muted-foreground">
                {numero.format(c.km_atual)} km
                {c.capacidade_tanque_l !== null &&
                  ` · tanque ${numero.format(c.capacidade_tanque_l)} L`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
