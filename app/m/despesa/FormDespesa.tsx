'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FotoComprovante } from '@/components/camera/FotoComprovante';
import { ariaCampo, Campo } from '@/components/gestao/Campo';
import { apagarRascunho, lerRascunho, salvarRascunho } from '@/components/motorista/rascunho';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { createClient } from '@/lib/supabase/client';
import { repetirSeFalharRede, traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { gerarUuid, jaFoiSalvo } from '@/lib/uuid';
import { despesaSchema, TIPOS_DESPESA, type DespesaDados, type DespesaForm } from '@/lib/validations/despesa';

type Props = { funcionarioId: string; viagem: { id: string; caminhao_id: string } | null };
type Rascunho = { id: string; valores: DespesaForm };

const RASCUNHO = 'despesa';

/** Data de hoje no horário de Brasília, no formato do <input type="date">. */
function hoje() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function FormDespesa({ funcionarioId, viagem }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [inicial] = useState<Rascunho>(() => {
    const r = lerRascunho<Rascunho>(RASCUNHO);
    return {
      id: r?.id ?? gerarUuid(),
      valores: { tipo: 'pedagio', valor: '', data: hoje(), descricao: '', foto_path: '', ...r?.valores },
    };
  });
  const [salvo, setSalvo] = useState<{ tipo: string; valor: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<DespesaForm, unknown, DespesaDados>({
    resolver: zodResolver(despesaSchema),
    defaultValues: inicial.valores,
  });

  const valores = useWatch({ control }) as DespesaForm;
  useEffect(() => {
    if (!salvo) salvarRascunho<Rascunho>(RASCUNHO, { id: inicial.id, valores });
  }, [valores, inicial.id, salvo]);

  const salvar = useMutation({
    ...repetirSeFalharRede,
    mutationFn: async ({ valor, ...dados }: DespesaDados) => {
      const { error } = await supabase.from('despesas_viagem').insert({
        ...dados,
        id: inicial.id,
        valor_centavos: valor,
        motorista_id: funcionarioId, // o trigger força o funcionário logado
        viagem_id: viagem?.id ?? null,
        caminhao_id: viagem?.caminhao_id ?? null,
      });
      if (error && !jaFoiSalvo(error)) throw error;
      return { tipo: TIPOS_DESPESA[dados.tipo], valor };
    },
    onSuccess: (r) => {
      apagarRascunho(RASCUNHO);
      setSalvo(r);
    },
  });

  if (salvo) {
    return (
      <div className="flex flex-col gap-4">
        <section role="status" className="rounded-2xl border-2 border-sucesso bg-card p-5 shadow-xs">
          <p className="text-2xl font-bold text-sucesso">✓ Despesa salva</p>
          <p className="text-lg">
            {salvo.tipo}: <span className="font-semibold tabular-nums">{formatarBRL(salvo.valor)}</span>
          </p>
        </section>
        <Button
          size="xl"
          onClick={() => {
            router.replace('/m');
            router.refresh();
          }}
        >
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-semibold">O que foi?</legend>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TIPOS_DESPESA).map(([valor, rotulo]) => (
            <label
              key={valor}
              className={cn(
                'flex min-h-14 cursor-pointer items-center justify-center rounded-xl border bg-card p-2 text-center text-base font-semibold shadow-xs',
                valores.tipo === valor && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              <input type="radio" value={valor} {...register('tipo')} className="sr-only" />
              {rotulo}
            </label>
          ))}
        </div>
        {errors.tipo && <p className="font-medium text-destructive">{errors.tipo.message}</p>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Campo id="valor" rotulo="Valor (R$)" erro={errors.valor?.message}>
          <Input {...register('valor')} {...ariaCampo('valor', errors.valor?.message)} inputMode="decimal" autoComplete="off" className="h-14 text-2xl tabular-nums" />
        </Campo>
        <Campo id="data" rotulo="Data" erro={errors.data?.message}>
          <Input {...register('data')} {...ariaCampo('data', errors.data?.message)} type="date" className="h-14 text-lg" />
        </Campo>
      </div>

      <Campo id="descricao" rotulo="Observação (opcional)" erro={errors.descricao?.message}>
        <Input {...register('descricao')} {...ariaCampo('descricao', errors.descricao?.message)} placeholder="Ex.: pedágio de Itabira" />
      </Campo>

      <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-xs">
        <FotoComprovante
          funcionarioId={funcionarioId}
          caminho={valores.foto_path || null}
          onChange={(c) => setValue('foto_path', c ?? '', { shouldValidate: Boolean(c) })}
          rotulo="Foto do comprovante"
        />
        {errors.foto_path && <p className="font-medium text-destructive">{errors.foto_path.message}</p>}
      </section>

      {!viagem && <p className="text-sm text-muted-foreground">Sem viagem em andamento: a despesa fica sem viagem ligada.</p>}

      {salvar.isError && (
        <div role="alert" className="flex flex-col gap-1 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">Não enviado.</p>
          <p>{traduzirErroBanco(salvar.error)}</p>
          <p className="text-sm text-muted-foreground">Os dados continuam guardados neste celular. Toque em Salvar de novo.</p>
        </div>
      )}

      <Button type="submit" size="xl" disabled={salvar.isPending} className="w-full">
        {salvar.isPending ? 'Salvando…' : salvar.isError ? 'Tentar de novo' : 'Salvar despesa'}
      </Button>
    </form>
  );
}
