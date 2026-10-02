import { Download, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { STATUS_ACERTO } from '@/components/acerto/status';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarData, hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Acertos · Gestão RPortugues' };

/** aaaa-mm do mês passado (o acerto do mês costuma ser fechado no começo do seguinte). */
function mesAnterior() {
  const [ano, mes] = hojeIso().split('-').map(Number);
  return mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, '0')}`;
}

export default async function Acertos() {
  const supabase = await createClient();
  const { data: acertos } = await supabase
    .from('acertos')
    .select('id, periodo_inicio, periodo_fim, status, saldo_centavos, funcionarios(nome)')
    .order('periodo_fim', { ascending: false })
    .limit(100);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Acertos</h1>
        <Link
          href="/g/acertos/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="size-5" aria-hidden />
          Novo acerto
        </Link>
      </div>

      <form action="/g/exportar/acertos" className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3 shadow-xs">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Planilha para o contador (mês)
          <input type="month" name="competencia" required defaultValue={mesAnterior()} className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base" />
        </label>
        <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-lg border px-4 font-medium hover:bg-muted">
          <Download className="size-5" aria-hidden /> Baixar CSV
        </button>
      </form>

      {(acertos ?? []).length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Nenhum acerto ainda.</p>
      )}

      <ul className="flex flex-col gap-3">
        {(acertos ?? []).map((a) => (
          <li key={a.id}>
            <Link href={`/g/acertos/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40">
              <span className="flex flex-col">
                <span className="text-lg font-semibold">{a.funcionarios?.nome}</span>
                <span className="text-sm text-muted-foreground">
                  {formatarData(a.periodo_inicio)} a {formatarData(a.periodo_fim)}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className={cn('rounded-full px-2 py-0.5 text-sm font-medium', STATUS_ACERTO[a.status].classe)}>
                  {STATUS_ACERTO[a.status].rotulo}
                </span>
                {a.status !== 'rascunho' && <span className="font-semibold tabular-nums">{formatarBRL(a.saldo_centavos)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
