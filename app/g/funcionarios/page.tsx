import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatarCpf } from '@/lib/domain/cpf';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Funcionários · Gestão RPortugues' };

export default async function ListaFuncionarios() {
  const supabase = await createClient();
  const { data: funcionarios, error } = await supabase
    .from('funcionarios')
    .select('id, nome, cpf, cargo, telefone, ativo, profiles(papel)')
    .order('ativo', { ascending: false })
    .order('nome');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Funcionários</h1>
        <Link
          href="/g/funcionarios/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Novo funcionário
        </Link>
      </div>

      {error && <p className="text-destructive">Não foi possível carregar os funcionários. Recarregue a página.</p>}

      {funcionarios?.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhum funcionário cadastrado.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {funcionarios?.map((f) => (
          <li key={f.id}>
            <Link
              href={`/g/funcionarios/${f.id}`}
              className={cn('flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40', !f.ativo && 'opacity-60')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-lg font-semibold">{f.nome}</span>
                {!f.ativo ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">desativado</span>
                ) : (
                  !f.profiles && (
                    <span className="shrink-0 rounded-full border border-dashed px-2 py-0.5 text-xs">sem acesso</span>
                  )
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {[f.cargo, formatarCpf(f.cpf), f.telefone].filter(Boolean).join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
