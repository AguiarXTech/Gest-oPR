import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { TIPOS_FORNECEDOR } from '@/lib/validations/fornecedor';

export const metadata: Metadata = { title: 'Fornecedores · Gestão Frota' };

export default async function ListaFornecedores() {
  const supabase = await createClient();
  const { data: fornecedores, error } = await supabase
    .from('fornecedores')
    .select('id, nome, cnpj, tipo, cidade, ativo')
    .order('ativo', { ascending: false })
    .order('nome');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Fornecedores</h1>
        <Link
          href="/g/fornecedores/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Novo fornecedor
        </Link>
      </div>

      {error && <p className="text-destructive">Não foi possível carregar os fornecedores. Recarregue a página.</p>}

      {fornecedores?.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Nenhum fornecedor cadastrado. Comece pelos postos onde os caminhões abastecem.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fornecedores?.map((f) => (
          <li key={f.id}>
            <Link
              href={`/g/fornecedores/${f.id}`}
              className={cn('flex flex-col gap-1 rounded-xl border p-4 hover:bg-muted', !f.ativo && 'opacity-60')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-lg font-semibold">{f.nome}</span>
                {!f.ativo && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">desativado</span>}
              </div>
              <span className="text-sm text-muted-foreground">
                {[TIPOS_FORNECEDOR[f.tipo], f.cidade, f.cnpj && formatarCnpj(f.cnpj)].filter(Boolean).join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
