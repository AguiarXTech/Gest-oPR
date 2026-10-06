'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { ariaCampo, Campo } from '@/components/gestao/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Configuracoes } from '@/lib/domain/configuracoes';
import { alertaKmViagem, validarKmChegada } from '@/lib/domain/viagem';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { repetirSeFalharRede, traduzirErroBanco } from '@/lib/supabase/erros';
import {
  finalizarViagemSchema,
  type FinalizarViagemDados,
  type FinalizarViagemForm,
} from '@/lib/validations/viagem';

type Produto = { id: string; nome: string; endereco: string | null };
type Props = {
  viagemId: string;
  kmSaida: number;
  config: Configuracoes;
  /** Produtos dos clientes (Cimento Liz...): o que carregou define o frete. */
  produtos: Produto[];
};

const km = new Intl.NumberFormat('pt-BR');

export function FormFinalizarViagem({ viagemId, kmSaida, config, produtos }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  // km fora do normal do ciclo: avisa e pede um segundo toque para confirmar.
  const [aviso, setAviso] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [kmRodado, setKmRodado] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FinalizarViagemForm, unknown, FinalizarViagemDados>({
    resolver: zodResolver(finalizarViagemSchema),
    defaultValues: { km_chegada: '', local_carga_id: '' },
  });

  const salvar = useMutation({
    ...repetirSeFalharRede,
    mutationFn: async (alteracao: {
      status: 'concluida' | 'cancelada';
      km_chegada?: number;
      local_carga_id?: string | null;
    }) => {
      // status e produto juntos: o frete automático é lançado nesta mesma gravação
      const { error } = await supabase
        .from('viagens')
        .update({
          ...alteracao,
          data_chegada: alteracao.status === 'concluida' ? new Date().toISOString() : null,
        })
        .eq('id', viagemId)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: (_, alteracao) => {
      if (alteracao.status === 'cancelada') {
        router.replace('/m');
        router.refresh();
        return;
      }
      setKmRodado(alteracao.km_chegada! - kmSaida);
    },
  });

  const produtoId = useWatch({ control, name: 'local_carga_id' });

  function finalizar({ km_chegada, local_carga_id }: FinalizarViagemDados) {
    if (produtos.length > 0 && !produtoId) {
      setError('local_carga_id', { message: 'Escolha o que carregou (ou "Outra carga").' });
      return;
    }
    const erro = validarKmChegada(kmSaida, km_chegada);
    if (erro) {
      setError('km_chegada', { message: erro });
      return;
    }
    const alerta = alertaKmViagem(km_chegada - kmSaida, config);
    if (alerta && !aviso) {
      setAviso(alerta);
      return;
    }
    salvar.mutate({ status: 'concluida', km_chegada, local_carga_id });
  }

  if (kmRodado !== null) {
    return (
      <div className="flex flex-col gap-4">
        <section
          role="status"
          className="rounded-2xl border-2 border-sucesso bg-card p-5 shadow-xs"
        >
          <p className="text-2xl font-bold text-sucesso">✓ Viagem finalizada</p>
          <p className="text-lg">
            Rodou <span className="font-semibold tabular-nums">{km.format(kmRodado)} km</span>. Bom
            descanso!
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
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit(finalizar)} noValidate className="flex flex-col gap-5">
        <p className="text-muted-foreground">Finalize quando voltar e terminar de descarregar.</p>
        <Campo
          id="km_chegada"
          rotulo="Km do painel agora"
          erro={errors.km_chegada?.message}
          ajuda={`Saiu com ${km.format(kmSaida)} km`}
        >
          <Input
            {...register('km_chegada', { onChange: () => setAviso(null) })}
            {...ariaCampo('km_chegada', errors.km_chegada?.message, 'ajuda')}
            inputMode="numeric"
            autoComplete="off"
            className="h-14 text-2xl tabular-nums"
          />
        </Campo>

        {produtos.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-lg font-semibold">O que carregou?</legend>
            {[...produtos, { id: 'outro', nome: 'Outra carga', endereco: null }].map((p) => (
              <label
                key={p.id}
                className={cn(
                  'flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs',
                  produtoId === p.id && 'border-primary ring-2 ring-primary',
                )}
              >
                <input
                  type="radio"
                  value={p.id}
                  {...register('local_carga_id')}
                  className="sr-only"
                />
                <span className="flex flex-1 flex-col">
                  <span className="text-xl font-bold">{p.nome}</span>
                  {p.endereco && <span className="text-muted-foreground">{p.endereco}</span>}
                </span>
                {produtoId === p.id && <Check className="size-7 text-primary" aria-hidden />}
              </label>
            ))}
            {errors.local_carga_id && (
              <p className="font-medium text-destructive">{errors.local_carga_id.message}</p>
            )}
          </fieldset>
        )}

        {aviso && (
          <p role="alert" className="rounded-xl border border-alerta bg-alerta/10 p-4 font-medium">
            {aviso} Se estiver certo, toque em Finalizar de novo.
          </p>
        )}
        {salvar.isError && (
          <p role="alert" className="font-medium text-destructive">
            {traduzirErroBanco(salvar.error)}
          </p>
        )}

        <Button type="submit" size="xl" disabled={salvar.isPending} className="w-full">
          {salvar.isPending ? 'Salvando…' : aviso ? 'Confirmar e finalizar' : 'Finalizar viagem'}
        </Button>
      </form>

      <section className="flex flex-col gap-3 border-t pt-6">
        {cancelando ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 p-4">
            <p className="font-medium">Cancelar esta viagem? Use só se iniciou por engano.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setCancelando(false)}
              >
                Não
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={salvar.isPending}
                onClick={() => salvar.mutate({ status: 'cancelada' })}
              >
                Sim, cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setCancelando(true)}
            className="text-muted-foreground"
          >
            Iniciei por engano: cancelar viagem
          </Button>
        )}
      </section>
    </div>
  );
}
