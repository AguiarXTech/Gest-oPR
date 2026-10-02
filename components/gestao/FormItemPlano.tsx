'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { itemPlanoSchema, type ItemPlanoDados, type ItemPlanoForm } from '@/lib/validations/manutencao';
import { ariaCampo, Campo } from './Campo';

type Props = { caminhoes: { id: string; placa: string }[]; aoSalvar: () => void };

/** Novo item do plano (ex.: troca de óleo a cada 20.000 km ou 6 meses). */
export function FormItemPlano({ caminhoes, aoSalvar }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ItemPlanoForm, unknown, ItemPlanoDados>({
    resolver: zodResolver(itemPlanoSchema),
    defaultValues: { caminhao_id: '', todos: true, item: '', intervalo_km: '', intervalo_dias: '', ultimo_km: '', ultima_data: '', observacoes: '' },
  });
  const todos = useWatch({ control, name: 'todos' });

  const salvar = useMutation({
    mutationFn: async ({ todos: paraTodos, caminhao_id, ...item }: ItemPlanoDados) => {
      const alvos = paraTodos ? caminhoes.map((c) => c.id) : [caminhao_id];
      const { error } = await supabase.from('planos_manutencao').insert(alvos.map((id) => ({ ...item, caminhao_id: id })));
      if (error) throw error;
    },
    onSuccess: () => {
      router.refresh();
      aoSalvar();
    },
  });

  const e = (c: keyof ItemPlanoForm) => errors[c]?.message;

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-4">
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" {...register('todos')} className="size-5 accent-[var(--primary)]" />
        Para todos os caminhões
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {!todos && (
          <Campo id="p_caminhao" rotulo="Caminhão *" erro={e('caminhao_id')}>
            <select {...register('caminhao_id')} {...ariaCampo('p_caminhao', e('caminhao_id'))} className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base">
              <option value="">Escolha…</option>
              {caminhoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatarPlaca(c.placa)}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo id="p_item" rotulo="Item *" erro={e('item')}>
          <Input {...register('item')} {...ariaCampo('p_item', e('item'))} placeholder="Ex.: Troca de óleo do motor" />
        </Campo>
        <Campo id="p_km" rotulo="A cada (km)" erro={e('intervalo_km')} ajuda="Ex.: 20.000">
          <Input {...register('intervalo_km')} {...ariaCampo('p_km', e('intervalo_km'), 'Ex.: 20.000')} inputMode="numeric" />
        </Campo>
        <Campo id="p_dias" rotulo="Ou a cada (dias)" erro={e('intervalo_dias')} ajuda="Ex.: 180 (6 meses)">
          <Input {...register('intervalo_dias')} {...ariaCampo('p_dias', e('intervalo_dias'), 'Ex.: 180 (6 meses)')} inputMode="numeric" />
        </Campo>
        <Campo id="p_ultimo_km" rotulo="Feito pela última vez com (km)" erro={e('ultimo_km')} ajuda="Para o app já calcular a próxima">
          <Input {...register('ultimo_km')} {...ariaCampo('p_ultimo_km', e('ultimo_km'), 'Para o app já calcular a próxima')} inputMode="numeric" />
        </Campo>
        <Campo id="p_ultima_data" rotulo="Em (data)" erro={e('ultima_data')}>
          <Input {...register('ultima_data')} {...ariaCampo('p_ultima_data', e('ultima_data'))} type="date" />
        </Campo>
      </div>
      {todos && <p className="text-sm text-muted-foreground">Copia o item para cada caminhão. Depois ajuste o &quot;feito pela última vez&quot; de cada um registrando a manutenção.</p>}
      {salvar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={salvar.isPending} className="sm:self-end">
        Salvar item
      </Button>
    </form>
  );
}
