// Carretas (pedido de 2026-10-03): placa própria, puxada pelos cavalos. O truck não aparece
// aqui: é um caminhão inteiro, cadastrado só em Caminhões.
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatarPlaca } from '@/lib/domain/placa';
import { COMPOSICOES_CARRETA } from '@/lib/domain/veiculos';
import { urlsFotosCaminhoes } from '@/lib/supabase/fotosCaminhoes';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Carretas · Gestão RPortugues' };

export default async function ListaCarretas() {
  const supabase = await createClient();
  const [{ data: carretas, error }, { data: emViagem }] = await Promise.all([
    supabase
      .from('carretas')
      .select(
        'id, placa, apelido, composicao, carroceria, eixos, eixos_suspensos, ativo, foto_path',
      )
      .order('ativo', { ascending: false })
      .order('placa'),
    supabase
      .from('viagens')
      .select('carreta_id, caminhoes(placa)')
      .eq('status', 'em_andamento')
      .not('carreta_id', 'is', null),
  ]);

  const fotos = await urlsFotosCaminhoes(supabase, carretas ?? []);
  const puxadaPor = new Map((emViagem ?? []).map((v) => [v.carreta_id, v.caminhoes?.placa ?? '']));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Carretas</h1>
        <Link
          href="/g/carretas/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Nova carreta
        </Link>
      </div>

      {error && (
        <p className="text-destructive">
          Não foi possível carregar as carretas. Recarregue a página.
        </p>
      )}

      {carretas?.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhuma carreta cadastrada. Cadastre aqui as carretas puxadas pelos cavalos; o truck fica
          só em Caminhões.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {carretas?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/g/carretas/${c.id}`}
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
                {!c.ativo && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">desativada</span>
                )}
              </div>
              {c.apelido && <span className="font-medium">{c.apelido}</span>}
              <span className="text-sm text-muted-foreground">
                {[
                  COMPOSICOES_CARRETA.find((o) => o.valor === c.composicao)?.nome,
                  c.carroceria,
                  c.eixos !== null &&
                    `${c.eixos} eixos${c.eixos_suspensos ? ` (${c.eixos_suspensos} sobe)` : ''}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Sem detalhes'}
              </span>
              {puxadaPor.has(c.id) && (
                <span className="text-sm font-medium text-primary">
                  Em viagem com {formatarPlaca(puxadaPor.get(c.id) ?? '')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
