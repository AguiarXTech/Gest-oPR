import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Clientes · Gestão RPortugues' };

export default async function ListaClientes() {
  const supabase = await createClient();
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, razao_social, cnpj, contato, prazo_pagamento_dias, ativo')
    .order('ativo', { ascending: false })
    .order('razao_social');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Clientes</h1>
        <Link
          href="/g/clientes/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Novo cliente
        </Link>
      </div>

      {error && <p className="text-destructive">Não foi possível carregar os clientes. Recarregue a página.</p>}

      {clientes?.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Nenhum cliente cadastrado.</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clientes?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/g/clientes/${c.id}`}
              className={cn('flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40', !c.ativo && 'opacity-60')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-lg font-semibold">{c.razao_social}</span>
                {!c.ativo && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">desativado</span>}
              </div>
              <span className="text-sm text-muted-foreground">
                {[
                  c.cnpj && formatarCnpj(c.cnpj),
                  c.prazo_pagamento_dias != null && `paga em ${c.prazo_pagamento_dias} dias`,
                  c.contato,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Sem detalhes'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
