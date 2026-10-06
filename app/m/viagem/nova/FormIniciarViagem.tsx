'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ariaCampo, Campo } from '@/components/gestao/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { repetirSeFalharRede, traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { gerarUuid, jaFoiSalvo } from '@/lib/uuid';
import {
  iniciarViagemSchema,
  type IniciarViagemDados,
  type IniciarViagemForm,
} from '@/lib/validations/viagem';

type Caminhao = {
  id: string;
  placa: string;
  apelido: string | null;
  tipo: 'truck' | 'cavalo';
  km_atual: number;
  fotoUrl?: string | null;
};
type Carreta = {
  id: string;
  placa: string;
  apelido: string | null;
  composicao?: string | null;
  carroceria?: string | null;
  fotoUrl?: string | null;
};

type Props = {
  funcionarioId: string;
  caminhoes: Caminhao[];
  carretas: Carreta[];
  caminhaoSugerido: string | null;
  carretaSugerida: string | null;
  rotaPadrao: { origem: string; destino: string };
};

const km = new Intl.NumberFormat('pt-BR');

function traduzir(erro: unknown) {
  const e = erro as { code?: string; message?: string };
  if (e?.code === '23505' && e.message?.includes('por_caminhao'))
    return 'Este caminhão já está em viagem com outro motorista.';
  if (e?.code === '23505' && e.message?.includes('por_carreta'))
    return 'Esta carreta já está em viagem com outro motorista.';
  if (e?.code === '23505' && e.message?.includes('por_motorista'))
    return 'Você já tem uma viagem em andamento.';
  return traduzirErroBanco(e);
}

export function FormIniciarViagem({
  funcionarioId,
  caminhoes,
  carretas,
  caminhaoSugerido,
  carretaSugerida,
  rotaPadrao,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [mudarRota, setMudarRota] = useState(false);
  // km abaixo do último registrado: avisa e pede um segundo toque para confirmar.
  const [avisoKm, setAvisoKm] = useState(false);
  // id gerado no celular: se a resposta se perder e o app repetir, não duplica (jaFoiSalvo)
  const [idViagem] = useState(gerarUuid);

  const sugerido = caminhoes.some((c) => c.id === caminhaoSugerido)
    ? caminhaoSugerido
    : caminhoes.length === 1
      ? caminhoes[0].id
      : '';

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<IniciarViagemForm, unknown, IniciarViagemDados>({
    resolver: zodResolver(iniciarViagemSchema),
    defaultValues: {
      caminhao_id: sugerido ?? '',
      carreta_id: carretas.some((c) => c.id === carretaSugerida) ? (carretaSugerida ?? '') : '',
      origem: rotaPadrao.origem,
      destino: rotaPadrao.destino,
      km_saida: '',
    },
  });

  const [caminhaoId, carretaId, kmDigitado, origem, destino] = useWatch({
    control,
    name: ['caminhao_id', 'carreta_id', 'km_saida', 'origem', 'destino'],
  });
  const caminhao = caminhoes.find((c) => c.id === caminhaoId);
  const ehCavalo = caminhao?.tipo === 'cavalo';

  const iniciar = useMutation({
    ...repetirSeFalharRede,
    mutationFn: async (dados: IniciarViagemDados) => {
      // motorista_id é forçado pelo trigger para o funcionário logado
      // truck é uma coisa só: nunca leva carreta, mesmo que tenha sobrado uma escolhida no formulário
      const carreta_id = ehCavalo ? dados.carreta_id : null;
      const { error } = await supabase
        .from('viagens')
        .insert({ ...dados, carreta_id, id: idViagem, motorista_id: funcionarioId });
      if (error && !jaFoiSalvo(error)) throw error;
    },
    onSuccess: () => {
      router.replace('/m');
      router.refresh();
    },
  });

  function enviar(dados: IniciarViagemDados) {
    if (ehCavalo && !carretaId) {
      setError('carreta_id', { message: 'Escolha a carreta (ou "Sem carreta").' });
      return;
    }
    if (caminhao && dados.km_saida < caminhao.km_atual && !avisoKm) {
      setAvisoKm(true); // mostra o aviso; o próximo toque confirma
      return;
    }
    iniciar.mutate(dados);
  }

  if (caminhoes.length === 0) {
    return (
      <p className="rounded-2xl border bg-card p-5 shadow-xs">
        Nenhum caminhão ativo cadastrado. Fale com o escritório.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-semibold">Qual caminhão?</legend>
        {caminhoes.map((c) => (
          <label
            key={c.id}
            className={cn(
              'flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs',
              caminhaoId === c.id && 'border-primary ring-2 ring-primary',
            )}
          >
            {c.fotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
              <img src={c.fotoUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
            )}
            <input
              type="radio"
              value={c.id}
              {...register('caminhao_id', { onChange: () => setAvisoKm(false) })}
              className="sr-only"
            />
            <span className="flex flex-1 flex-col">
              <span className="font-mono text-xl font-bold">{formatarPlaca(c.placa)}</span>
              <span className="text-muted-foreground">
                {c.apelido ? `${c.apelido} · ` : ''}
                <span className="tabular-nums">{km.format(c.km_atual)} km</span>
              </span>
            </span>
            {caminhaoId === c.id && <Check className="size-7 text-primary" aria-hidden />}
          </label>
        ))}
        {errors.caminhao_id && (
          <p className="font-medium text-destructive">{errors.caminhao_id.message}</p>
        )}
      </fieldset>

      {ehCavalo && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-lg font-semibold">Qual carreta?</legend>
          {[...carretas, { id: 'sem', placa: '', apelido: null, fotoUrl: null }].map((c) => (
            <label
              key={c.id}
              className={cn(
                'flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs',
                carretaId === c.id && 'border-primary ring-2 ring-primary',
              )}
            >
              {c.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
                <img src={c.fotoUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
              )}
              <input type="radio" value={c.id} {...register('carreta_id')} className="sr-only" />
              <span className="flex flex-1 flex-col">
                {c.id === 'sem' ? (
                  <span className="text-xl font-bold">Sem carreta</span>
                ) : (
                  <>
                    <span className="font-mono text-xl font-bold">{formatarPlaca(c.placa)}</span>
                    <span className="text-muted-foreground empty:hidden">
                      {[c.apelido, c.composicao, c.carroceria].filter(Boolean).join(' · ')}
                    </span>
                  </>
                )}
              </span>
              {carretaId === c.id && <Check className="size-7 text-primary" aria-hidden />}
            </label>
          ))}
          {errors.carreta_id && (
            <p className="font-medium text-destructive">{errors.carreta_id.message}</p>
          )}
        </fieldset>
      )}

      <Campo
        id="km_saida"
        rotulo="Km do painel agora"
        erro={errors.km_saida?.message}
        ajuda={caminhao ? `Último km registrado: ${km.format(caminhao.km_atual)}` : undefined}
      >
        <Input
          {...register('km_saida', { onChange: () => setAvisoKm(false) })}
          {...ariaCampo('km_saida', errors.km_saida?.message, caminhao ? 'ajuda' : undefined)}
          inputMode="numeric"
          autoComplete="off"
          className="h-14 text-2xl tabular-nums"
        />
      </Campo>

      {avisoKm && caminhao && (
        <p role="alert" className="rounded-xl border border-alerta bg-alerta/10 p-4 font-medium">
          O km digitado ({kmDigitado}) é menor que o último registrado para este caminhão (
          {km.format(caminhao.km_atual)}). Confira o painel. Se estiver certo, toque em Iniciar de
          novo.
        </p>
      )}

      <div className="rounded-2xl border bg-card p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setMudarRota((v) => !v)}
          aria-expanded={mudarRota}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
        >
          <span>
            <span className="block text-sm text-muted-foreground">Rota</span>
            <span className="font-semibold">
              {origem} → {destino} → volta
            </span>
          </span>
          <ChevronDown
            className={cn('size-5 shrink-0 transition-transform', mudarRota && 'rotate-180')}
            aria-hidden
          />
        </button>
        <div className={cn('mt-4 flex-col gap-4', mudarRota ? 'flex' : 'hidden')}>
          <Campo id="origem" rotulo="Saída" erro={errors.origem?.message}>
            <Input {...register('origem')} {...ariaCampo('origem', errors.origem?.message)} />
          </Campo>
          <Campo
            id="destino"
            rotulo="Destino (onde vira para voltar)"
            erro={errors.destino?.message}
          >
            <Input {...register('destino')} {...ariaCampo('destino', errors.destino?.message)} />
          </Campo>
        </div>
      </div>

      {iniciar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzir(iniciar.error)}
        </p>
      )}

      <Button
        type="submit"
        size="xl"
        disabled={iniciar.isPending || iniciar.isSuccess}
        className="w-full"
      >
        {iniciar.isPending ? 'Iniciando…' : avisoKm ? 'Confirmar e iniciar' : 'Iniciar viagem'}
      </Button>
    </form>
  );
}
