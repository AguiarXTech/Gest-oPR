'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { freteSchema, type FreteDados, type FreteForm } from '@/lib/validations/frete';
import { ariaCampo, Campo } from './Campo';

type Frete = Tables<'fretes'>;
type Props = {
  viagemId: string;
  sentido: 'ida' | 'volta';
  frete: Frete | null;
  clientes: { id: string; razao_social: string }[];
  /** Viagem em acerto fechado: só leitura (o banco também bloqueia). */
  bloqueado: boolean;
};

const reais = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FormFrete({ viagemId, sentido, frete, clientes, bloqueado }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [aberto, setAberto] = useState(Boolean(frete) || sentido === 'volta');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const p = `${sentido}-`; // ids únicos: dois formulários na mesma página

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FreteForm, unknown, FreteDados>({
    resolver: zodResolver(freteSchema),
    defaultValues: {
      cliente_id: frete?.cliente_id ?? (clientes.length === 1 ? clientes[0].id : ''),
      valor: frete ? reais.format(frete.valor_frete_centavos / 100) : '',
      peso_kg: frete?.peso_kg != null ? String(frete.peso_kg).replace('.', ',') : '',
      cte_chave: frete?.cte_chave ?? '',
      mdfe_chave: frete?.mdfe_chave ?? '',
      observacoes: frete?.observacoes ?? '',
    },
  });

  const salvar = useMutation({
    mutationFn: async ({ valor, ...dados }: FreteDados) => {
      const linha = { ...dados, valor_frete_centavos: valor };
      const { error } = frete
        ? await supabase.from('fretes').update(linha).eq('id', frete.id).select('id').single()
        : await supabase.from('fretes').insert({ ...linha, viagem_id: viagemId, sentido });
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('fretes').delete().eq('id', frete!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmandoExclusao(false);
      setAberto(false);
      router.refresh();
    },
  });

  const titulo = sentido === 'volta' ? 'Frete da volta (BH → SJE)' : 'Frete da ida (SJE → BH)';

  if (!aberto) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-dashed p-4">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-muted-foreground">A ida normalmente vai vazia. Lance só se levou carga.</p>
        {!bloqueado && (
          <Button type="button" variant="outline" size="lg" onClick={() => setAberto(true)} className="self-start">
            Lançar frete da ida
          </Button>
        )}
      </section>
    );
  }

  const e = (campo: keyof FreteForm) => errors[campo]?.message;
  const erroGeral = salvar.isError ? salvar.error : excluir.isError ? excluir.error : null;

  return (
    <form
      onSubmit={handleSubmit((d) => salvar.mutate(d))}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6"
    >
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <fieldset disabled={bloqueado} className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${p}cliente_id`} rotulo="Cliente" erro={e('cliente_id')}>
          <select
            {...register('cliente_id')}
            {...ariaCampo(`${p}cliente_id`, e('cliente_id'))}
            className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            <option value="">—</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razao_social}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={`${p}valor`} rotulo="Valor do frete (R$) *" erro={e('valor')}>
          <Input {...register('valor')} {...ariaCampo(`${p}valor`, e('valor'))} inputMode="decimal" className="tabular-nums" />
        </Campo>
        <Campo id={`${p}cte_chave`} rotulo="Chave do CT-e" erro={e('cte_chave')}>
          <Input {...register('cte_chave')} {...ariaCampo(`${p}cte_chave`, e('cte_chave'))} inputMode="numeric" autoComplete="off" className="font-mono text-sm" />
        </Campo>
        <Campo id={`${p}mdfe_chave`} rotulo="Chave do MDF-e" erro={e('mdfe_chave')}>
          <Input {...register('mdfe_chave')} {...ariaCampo(`${p}mdfe_chave`, e('mdfe_chave'))} inputMode="numeric" autoComplete="off" className="font-mono text-sm" />
        </Campo>
        <Campo id={`${p}peso_kg`} rotulo="Peso (kg)" erro={e('peso_kg')}>
          <Input {...register('peso_kg')} {...ariaCampo(`${p}peso_kg`, e('peso_kg'))} inputMode="decimal" className="tabular-nums" />
        </Campo>
        <Campo id={`${p}observacoes`} rotulo="Observação" erro={e('observacoes')}>
          <Input {...register('observacoes')} {...ariaCampo(`${p}observacoes`, e('observacoes'))} />
        </Campo>
      </fieldset>

      {bloqueado && <p className="text-sm text-muted-foreground">Viagem em acerto fechado: para alterar, o dono reabre o acerto.</p>}
      {erroGeral && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(erroGeral, { '23505': 'Esta viagem já tem esse frete.' })}
        </p>
      )}
      {salvar.isSuccess && !isDirty && <p className="font-medium text-sucesso">✓ Frete salvo</p>}

      {!bloqueado && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {frete ? (
            confirmandoExclusao ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmandoExclusao(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" disabled={excluir.isPending} onClick={() => excluir.mutate()}>
                  Sim, apagar frete
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmandoExclusao(true)} className="text-destructive">
                <Trash2 aria-hidden /> Apagar frete
              </Button>
            )
          ) : sentido === 'ida' ? (
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Ida vazia (não lançar)
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : frete ? 'Salvar alterações' : 'Lançar frete'}
          </Button>
        </div>
      )}
    </form>
  );
}
