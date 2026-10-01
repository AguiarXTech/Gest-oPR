import type { Metadata } from 'next';
import { ApagarAdiantamento } from '@/components/gestao/ApagarAdiantamento';
import { FormAdiantamento } from '@/components/gestao/FormAdiantamento';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarData } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Adiantamentos · Gestão RPortugues' };

export default async function Adiantamentos() {
  const supabase = await createClient();
  const [{ data: motoristas }, { data: adiantamentos }] = await Promise.all([
    supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome'),
    supabase
      .from('adiantamentos')
      .select('id, data, valor_centavos, forma, observacao, funcionarios(nome), acertos(status)')
      .order('data', { ascending: false })
      .limit(100),
  ]);

  const pendentes = (adiantamentos ?? []).filter((a) => !a.acertos);
  const totalPendente = pendentes.reduce((t, a) => t + a.valor_centavos, 0);

  return (
    <>
      <h1 className="text-3xl">Adiantamentos</h1>
      <FormAdiantamento motoristas={motoristas ?? []} />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Lançados</h2>
          <p className="text-muted-foreground">
            Ainda sem acerto: <span className="font-semibold text-foreground tabular-nums">{formatarBRL(totalPendente)}</span>
          </p>
        </div>
        {(adiantamentos ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Nenhum adiantamento lançado.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card shadow-xs">
            {(adiantamentos ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 p-3">
                <span className="flex flex-col">
                  <span className="font-semibold">{a.funcionarios?.nome}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatarData(a.data)} · {a.forma}
                    {a.observacao && ` · ${a.observacao}`}
                    {a.acertos && ` · no acerto (${a.acertos.status})`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatarBRL(a.valor_centavos)}</span>
                  {!a.acertos && <ApagarAdiantamento id={a.id} />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
