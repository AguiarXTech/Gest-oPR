'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ariaCampo, Campo } from '@/components/gestao/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { repetirSeFalharRede, traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { gerarUuid, jaFoiSalvo } from '@/lib/uuid';
import {
  CATEGORIAS_PESSOAIS,
  despesaPessoalSchema,
  type DespesaPessoalDados,
  type DespesaPessoalForm,
} from '@/lib/validations/despesaPessoal';

export function FormDespesaPessoal() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [id, setId] = useState(gerarUuid);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DespesaPessoalForm, unknown, DespesaPessoalDados>({
    resolver: zodResolver(despesaPessoalSchema),
    defaultValues: { categoria: 'alimentacao', valor: '', data: hojeIso(), descricao: '' },
  });
  const categoria = useWatch({ control, name: 'categoria' });

  const salvar = useMutation({
    ...repetirSeFalharRede,
    mutationFn: async ({ valor, ...dados }: DespesaPessoalDados) => {
      // funcionario_id é preenchido pelo banco com quem está logado
      const { error } = await supabase.from('despesas_pessoais').insert({ ...dados, id, valor_centavos: valor, funcionario_id: '00000000-0000-0000-0000-000000000000' });
      if (error && !jaFoiSalvo(error)) throw error;
    },
    onSuccess: () => {
      reset({ categoria, valor: '', data: hojeIso(), descricao: '' });
      setId(gerarUuid());
      router.refresh();
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 font-semibold">Lançar despesa</legend>
        {Object.entries(CATEGORIAS_PESSOAIS).map(([valor, rotulo]) => (
          <label
            key={valor}
            className={cn(
              'flex min-h-12 cursor-pointer items-center justify-center rounded-xl border p-2 text-center font-semibold',
              categoria === valor && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            <input type="radio" value={valor} {...register('categoria')} className="sr-only" />
            {rotulo}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Campo id="valor" rotulo="Valor (R$)" erro={errors.valor?.message}>
          <Input {...register('valor')} {...ariaCampo('valor', errors.valor?.message)} inputMode="decimal" className="h-14 text-2xl tabular-nums" />
        </Campo>
        <Campo id="data" rotulo="Data" erro={errors.data?.message}>
          <Input {...register('data')} {...ariaCampo('data', errors.data?.message)} type="date" className="h-14 text-lg" />
        </Campo>
      </div>
      <Campo id="descricao" rotulo="Observação (opcional)">
        <Input {...register('descricao')} id="descricao" placeholder="Ex.: almoço em Itabira" />
      </Campo>
      {salvar.isError && <p role="alert" className="font-medium text-destructive">{traduzirErroBanco(salvar.error)}</p>}
      <Button type="submit" size="xl" disabled={salvar.isPending}>
        {salvar.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}

export function ApagarDespesaPessoal({ id }: { id: string }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const apagar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('despesas_pessoais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });
  return (
    <Button type="button" variant="ghost" size="icon" aria-label="Apagar despesa" disabled={apagar.isPending} onClick={() => apagar.mutate()}>
      <Trash2 aria-hidden />
    </Button>
  );
}
