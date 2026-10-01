'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

type Props = {
  tabela: 'abastecimentos' | 'despesas_viagem';
  id: string;
  conferido: boolean;
  comentario: string | null;
  /** Só despesas: entra no reembolso do acerto? */
  reembolsavel?: boolean;
  /** Item em acerto fechado: só leitura (o banco também bloqueia). */
  bloqueado: boolean;
};

/** Conferência do gestor (RF-13): marcar conferido, comentar e, na despesa, decidir o reembolso. */
export function Conferencia({ tabela, id, conferido, comentario, reembolsavel, bloqueado }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [texto, setTexto] = useState(comentario ?? '');

  const salvar = useMutation({
    mutationFn: async (alteracao: { conferido?: boolean; reembolsavel?: boolean }) => {
      const { data } = await supabase.auth.getUser();
      const linha = {
        comentario_gestor: texto.trim() || null,
        ...(alteracao.conferido !== undefined && {
          conferido: alteracao.conferido,
          conferido_por: alteracao.conferido ? (data.user?.id ?? null) : null,
        }),
      };
      const { error } =
        tabela === 'abastecimentos'
          ? await supabase.from('abastecimentos').update(linha).eq('id', id).select('id').single()
          : await supabase
              .from('despesas_viagem')
              .update({ ...linha, ...(alteracao.reembolsavel !== undefined && { reembolsavel: alteracao.reembolsavel }) })
              .eq('id', id)
              .select('id')
              .single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  if (bloqueado) {
    return (
      <section className="rounded-2xl border bg-card p-4 shadow-xs">
        <p className="font-semibold">{conferido ? '✓ Conferido' : 'Não conferido'}</p>
        {comentario && <p className="text-muted-foreground">Comentário: {comentario}</p>}
        <p className="text-sm text-muted-foreground">Em acerto fechado: para alterar, o dono reabre o acerto.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      <h2 className="text-lg font-semibold">Conferência</h2>
      <p className={conferido ? 'font-semibold text-sucesso' : 'font-semibold text-alerta'}>
        {conferido ? '✓ Conferido' : 'Ainda não conferido'}
      </p>

      {reembolsavel !== undefined && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">Reembolsar ao motorista no acerto?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              [true, 'Sim, reembolsar'],
              [false, 'Não reembolsar'],
            ].map(([valor, rotulo]) => (
              <Button
                key={String(valor)}
                type="button"
                variant={reembolsavel === valor ? 'default' : 'outline'}
                size="lg"
                aria-pressed={reembolsavel === valor}
                disabled={salvar.isPending}
                onClick={() => salvar.mutate({ reembolsavel: valor as boolean })}
              >
                {rotulo as string}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comentario" className="text-base">
          Comentário (o motorista não vê)
        </Label>
        <textarea
          id="comentario"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {salvar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {conferido ? (
          <Button type="button" variant="outline" size="lg" disabled={salvar.isPending} onClick={() => salvar.mutate({ conferido: false })}>
            Desfazer conferência
          </Button>
        ) : (
          <Button type="button" size="lg" disabled={salvar.isPending} onClick={() => salvar.mutate({ conferido: true })}>
            Marcar como conferido
          </Button>
        )}
        <Button type="button" variant="ghost" size="lg" disabled={salvar.isPending || texto === (comentario ?? '')} onClick={() => salvar.mutate({})}>
          Salvar comentário
        </Button>
      </div>
    </section>
  );
}
