// Despesas pessoais (pedido de 2026-10-02): controle opcional do próprio motorista.
// Só ele vê (RLS sem policy de gestor); não entram no acerto nem no resultado.
import { Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { competencia } from '@/lib/domain/resultado';
import { formatarData } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIAS_PESSOAIS } from '@/lib/validations/despesaPessoal';
import { ApagarDespesaPessoal, FormDespesaPessoal } from './FormDespesaPessoal';

export const metadata: Metadata = { title: 'Minhas despesas · Gestão RPortugues' };

function mesAtual() {
  return competencia(new Date().toISOString());
}

export default async function DespesasPessoais() {
  const supabase = await createClient();
  const mes = mesAtual();
  const { data } = await supabase
    .from('despesas_pessoais')
    .select('id, data, categoria, valor_centavos, descricao')
    .gte('data', `${mes}-01`)
    .order('data', { ascending: false });
  const doMes = data ?? [];
  const total = doMes.reduce((t, d) => t + d.valor_centavos, 0);
  const porCategoria = Object.entries(CATEGORIAS_PESSOAIS)
    .map(([c, rotulo]) => ({ rotulo, valor: doMes.filter((d) => d.categoria === c).reduce((t, d) => t + d.valor_centavos, 0) }))
    .filter((c) => c.valor > 0);

  return (
    <>
      <div>
        <h1 className="text-3xl">Minhas despesas</h1>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden /> Só você vê. Não entra no acerto.
        </p>
      </div>

      <section className="flex flex-col gap-1 rounded-2xl bg-grafite p-5 text-white shadow-xs">
        <p className="text-sm text-white/70">Gasto neste mês</p>
        <p className="text-3xl font-bold tabular-nums">{formatarBRL(total)}</p>
        {porCategoria.map((c) => (
          <p key={c.rotulo} className="flex justify-between text-white/80 tabular-nums">
            <span>{c.rotulo}</span>
            <span>{formatarBRL(c.valor)}</span>
          </p>
        ))}
      </section>

      <FormDespesaPessoal />

      <ul className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs">
        {doMes.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 p-3">
            <span className="flex flex-col">
              <span className="font-medium">{CATEGORIAS_PESSOAIS[d.categoria as keyof typeof CATEGORIAS_PESSOAIS] ?? d.categoria}</span>
              <span className="text-sm text-muted-foreground">
                {formatarData(d.data)}
                {d.descricao && ` · ${d.descricao}`}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold tabular-nums">{formatarBRL(d.valor_centavos)}</span>
              <ApagarDespesaPessoal id={d.id} />
            </span>
          </li>
        ))}
        {doMes.length === 0 && <li className="p-3 text-muted-foreground">Nada lançado neste mês.</li>}
      </ul>
    </>
  );
}
