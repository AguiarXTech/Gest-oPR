// Gestão de pneus (RF-30, pedido de 2026-10-03): estoque, montados nos cavalos/trucks e
// carretas, na recapagem e descartados. No estoque: novo, recapado ou usado, com o km.
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ESTILO_SITUACAO, linhasKmPneu, ROTULO_SITUACAO } from '@/components/gestao/pneuTexto';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData, formatarKm } from '@/lib/formatar';
import { carregarPneus, type PneuCarregado } from '@/lib/supabase/pneus';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pneus · Gestão RPortugues' };

function Etiqueta({ p }: { p: PneuCarregado }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-sm font-semibold',
        ESTILO_SITUACAO[p.situacao],
      )}
    >
      {ROTULO_SITUACAO[p.situacao]}
      {p.situacao === 'recapado' && ` ${p.vida}×`}
    </span>
  );
}

function CartaoPneu({ p, extra }: { p: PneuCarregado; extra?: React.ReactNode }) {
  return (
    <li>
      <Link
        href={`/g/pneus/${p.id}`}
        className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-xs hover:border-primary/40"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-mono text-lg font-bold">{p.marca_fogo}</span>
          <Etiqueta p={p} />
        </span>
        <span className="text-sm text-muted-foreground">
          {[p.marca, p.modelo, p.medida].filter(Boolean).join(' · ') || 'Sem detalhes'}
        </span>
        {linhasKmPneu(p).map((l) => (
          <span key={l} className="text-sm tabular-nums">
            {l}
          </span>
        ))}
        {extra}
      </Link>
    </li>
  );
}

export default async function Pneus() {
  const supabase = await createClient();
  const { pneus, caminhoes, carretas } = await carregarPneus(supabase);

  const estoque = pneus.filter((p) => p.status === 'estoque');
  const montados = pneus.filter((p) => p.status === 'montado');
  const recapagem = pneus.filter((p) => p.status === 'em_recapagem');
  const descartados = pneus.filter((p) => p.status === 'descartado');

  const ordemSituacao = { novo: 0, recapado: 1, usado: 2 } as const;
  const estoqueOrdenado = [...estoque].sort(
    (a, b) => ordemSituacao[a.situacao] - ordemSituacao[b.situacao],
  );

  // montados agrupados por veículo (caminhões/cavalos primeiro, depois carretas)
  const veiculos = [
    ...caminhoes.map((c) => ({
      id: c.id,
      placa: c.placa,
      apelido: c.apelido,
      tipo: c.tipo === 'cavalo' ? 'Cavalo' : 'Caminhão',
    })),
    ...carretas.map((c) => ({ id: c.id, placa: c.placa, apelido: c.apelido, tipo: 'Carreta' })),
  ]
    .map((v) => ({
      ...v,
      pneus: montados
        .filter((p) => p.montagemAtual?.veiculo.id === v.id)
        .sort((a, b) =>
          (a.montagemAtual?.posicao ?? '').localeCompare(b.montagemAtual?.posicao ?? ''),
        ),
    }))
    .filter((v) => v.pneus.length > 0);

  const contagem = [
    ['Estoque', estoque.length, '#estoque'],
    ['Montados', montados.length, '#montados'],
    ['Na recapagem', recapagem.length, '#recapagem'],
  ] as const;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Pneus</h1>
        <Link
          href="/g/pneus/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Novo pneu
        </Link>
      </div>

      <nav className="grid grid-cols-3 gap-2" aria-label="Resumo dos pneus">
        {contagem.map(([rotulo, n, href]) => (
          <a
            key={rotulo}
            href={href}
            className="flex flex-col rounded-xl border bg-card p-3 shadow-xs hover:border-primary/40"
          >
            <span className="text-2xl font-bold tabular-nums">{n}</span>
            <span className="text-sm text-muted-foreground">{rotulo}</span>
          </a>
        ))}
      </nav>

      <section id="estoque" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-xl font-semibold">Estoque</h2>
        {estoque.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pneu no estoque.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {estoqueOrdenado.map((p) => (
              <CartaoPneu key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      <section id="montados" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-xl font-semibold">Montados</h2>
        {veiculos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pneu montado.</p>
        ) : (
          veiculos.map((v) => (
            <div key={v.id} className="flex flex-col gap-2">
              <h3 className="font-semibold">
                {v.tipo} <span className="font-mono">{formatarPlaca(v.placa)}</span>
                {v.apelido && (
                  <span className="font-normal text-muted-foreground"> · {v.apelido}</span>
                )}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {v.pneus.map((p) => (
                  <CartaoPneu
                    key={p.id}
                    p={p}
                    extra={
                      <span className="text-sm font-medium tabular-nums">
                        Posição {p.montagemAtual?.posicao} · {formatarKm(p.montagemAtual?.km ?? 0)}{' '}
                        nesta montagem
                      </span>
                    }
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section id="recapagem" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-xl font-semibold">Na recapagem</h2>
        {recapagem.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pneu na recapagem.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recapagem.map((p) => (
              <CartaoPneu
                key={p.id}
                p={p}
                extra={
                  <span className="text-sm font-medium">
                    {p.recapagemAtual?.fornecedores?.nome ?? 'Recapadora não informada'} · desde{' '}
                    {p.recapagemAtual ? formatarData(p.recapagemAtual.enviado_em) : '—'}
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </section>

      {descartados.length > 0 && (
        <details className="rounded-xl border bg-card p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">
            Descartados ({descartados.length})
          </summary>
          <ul className="mt-2 flex flex-col divide-y">
            {descartados.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/g/pneus/${p.id}`}
                  className="flex min-h-11 justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    <span className="font-mono font-semibold">{p.marca_fogo}</span> ·{' '}
                    {p.motivo_descarte}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {p.descartado_em ? formatarData(p.descartado_em) : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
