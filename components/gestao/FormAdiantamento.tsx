'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { gerarUuid, jaFoiSalvo } from '@/lib/uuid';
import {
  adiantamentoSchema,
  FORMAS_ADIANTAMENTO,
  type AdiantamentoDados,
  type AdiantamentoForm,
} from '@/lib/validations/adiantamento';
import { ariaCampo, Campo } from './Campo';

const classeSelect = 'h-11 rounded-lg border border-input bg-transparent px-2.5 text-base';

/** Lançamento de adiantamento ao motorista (RF-12). Só gestor (RLS). */
export function FormAdiantamento({ motoristas }: { motoristas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [id, setId] = useState(gerarUuid);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdiantamentoForm, unknown, AdiantamentoDados>({
    resolver: zodResolver(adiantamentoSchema),
    defaultValues: { motorista_id: '', data: hojeIso(), valor: '', forma: 'PIX', observacao: '' },
  });

  const salvar = useMutation({
    mutationFn: async ({ valor, ...dados }: AdiantamentoDados) => {
      const { error } = await supabase.from('adiantamentos').insert({ ...dados, id, valor_centavos: valor });
      if (error && !jaFoiSalvo(error)) throw error;
    },
    onSuccess: () => {
      reset({ motorista_id: '', data: hojeIso(), valor: '', forma: 'PIX', observacao: '' });
      setId(gerarUuid());
      router.refresh();
    },
  });

  const e = (campo: keyof AdiantamentoForm) => errors[campo]?.message;

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      <h2 className="text-lg font-semibold">Novo adiantamento</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="motorista_id" rotulo="Motorista *" erro={e('motorista_id')}>
          <select {...register('motorista_id')} {...ariaCampo('motorista_id', e('motorista_id'))} className={classeSelect}>
            <option value="">Escolha…</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="valor" rotulo="Valor (R$) *" erro={e('valor')}>
          <Input {...register('valor')} {...ariaCampo('valor', e('valor'))} inputMode="decimal" className="tabular-nums" />
        </Campo>
        <Campo id="data" rotulo="Data *" erro={e('data')}>
          <Input {...register('data')} {...ariaCampo('data', e('data'))} type="date" />
        </Campo>
        <Campo id="forma" rotulo="Forma *" erro={e('forma')}>
          <select {...register('forma')} {...ariaCampo('forma', e('forma'))} className={classeSelect}>
            {FORMAS_ADIANTAMENTO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="observacao" rotulo="Observação" erro={e('observacao')}>
            <Input {...register('observacao')} {...ariaCampo('observacao', e('observacao'))} />
          </Campo>
        </div>
      </div>
      {salvar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}
      {salvar.isSuccess && <p className="font-medium text-sucesso">✓ Adiantamento lançado</p>}
      <Button type="submit" size="lg" disabled={salvar.isPending} className="sm:self-end">
        {salvar.isPending ? 'Salvando…' : 'Lançar adiantamento'}
      </Button>
    </form>
  );
}
