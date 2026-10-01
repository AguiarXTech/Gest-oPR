'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarData, hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import {
  regraComissaoSchema,
  TIPOS_COMISSAO,
  type RegraComissaoDados,
  type RegraComissaoForm,
} from '@/lib/validations/regraComissao';
import { ariaCampo, Campo } from './Campo';

type Regra = Tables<'regras_comissao'>;

const MENSAGENS = {
  // exclusion constraint: vigências do mesmo motorista não podem se sobrepor
  '23P01': 'Já existe uma regra valendo nesse período. Encerre a regra atual um dia antes do início da nova.',
};

function descrever(r: Regra) {
  if (r.tipo === 'valor_por_viagem') return `${formatarBRL(r.valor_centavos ?? 0)} por viagem`;
  if (r.tipo === 'valor_por_km') return `${formatarBRL(r.valor_centavos ?? 0)} por km`;
  const base = `${String(r.percentual).replace('.', ',')}% do frete`;
  if (r.tipo === 'pct_frete_bruto') return base;
  const descontos = [r.deduz_pedagio && 'pedágio', r.deduz_combustivel && 'diesel'].filter(Boolean).join(' e ');
  return descontos ? `${base} menos ${descontos}` : base;
}

/** Regras de comissão do motorista com vigência (RF-14, S4-3). */
export function RegrasComissao({ funcionarioId, regras }: { funcionarioId: string; regras: Regra[] }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [nova, setNova] = useState(regras.length === 0);
  const [encerrarEm, setEncerrarEm] = useState(hojeIso());
  const aberta = regras.find((r) => r.vigencia_fim === null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RegraComissaoForm, unknown, RegraComissaoDados>({
    resolver: zodResolver(regraComissaoSchema),
    defaultValues: {
      tipo: 'valor_por_viagem',
      valor: '',
      percentual: '',
      deduz_pedagio: false,
      deduz_combustivel: false,
      apenas_com_frete: true,
      vigencia_inicio: hojeIso(),
      observacoes: '',
    },
  });
  const tipo = useWatch({ control, name: 'tipo' });

  const criar = useMutation({
    mutationFn: async (dados: RegraComissaoDados) => {
      const { error } = await supabase.from('regras_comissao').insert({ ...dados, funcionario_id: funcionarioId });
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      setNova(false);
      router.refresh();
    },
  });

  const encerrar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('regras_comissao').update({ vigencia_fim: encerrarEm }).eq('id', aberta!.id).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  const ehPercentual = tipo === 'pct_frete_bruto' || tipo === 'pct_frete_liquido';

  return (
    <div className="flex flex-col gap-4">
      {regras.length === 0 ? (
        <p className="font-medium text-alerta">Sem regra de comissão: o acerto deste motorista não fecha até cadastrar uma.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {regras.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 p-3">
              <span className="font-semibold tabular-nums">{descrever(r)}</span>
              <span className="text-sm text-muted-foreground">
                {r.vigencia_fim ? `de ${formatarData(r.vigencia_inicio)} a ${formatarData(r.vigencia_fim)}` : `valendo desde ${formatarData(r.vigencia_inicio)}`}
                {r.observacoes && ` · ${r.observacoes}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {aberta && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3 sm:flex-row sm:items-end">
          <Campo id="encerrar_em" rotulo="Encerrar a regra atual em (último dia)">
            <Input id="encerrar_em" type="date" value={encerrarEm} onChange={(e) => setEncerrarEm(e.target.value)} />
          </Campo>
          <Button type="button" variant="outline" size="lg" disabled={encerrar.isPending} onClick={() => encerrar.mutate()}>
            Encerrar regra
          </Button>
        </div>
      )}
      {encerrar.isError && <p className="font-medium text-destructive">{traduzirErroBanco(encerrar.error)}</p>}

      {nova ? (
        <form onSubmit={handleSubmit((d) => criar.mutate(d))} noValidate className="flex flex-col gap-4 rounded-xl border p-4">
          <h3 className="font-semibold">Nova regra</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="tipo" rotulo="Tipo">
              <select {...register('tipo')} id="tipo" className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base">
                {Object.entries(TIPOS_COMISSAO).map(([v, rotulo]) => (
                  <option key={v} value={v}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            {ehPercentual ? (
              <Campo id="percentual" rotulo="Percentual (%)" erro={errors.percentual?.message}>
                <Input {...register('percentual')} {...ariaCampo('percentual', errors.percentual?.message)} inputMode="decimal" />
              </Campo>
            ) : (
              <Campo id="valor" rotulo={tipo === 'valor_por_km' ? 'Valor por km (R$)' : 'Valor por viagem (R$)'} erro={errors.valor?.message}>
                <Input {...register('valor')} {...ariaCampo('valor', errors.valor?.message)} inputMode="decimal" />
              </Campo>
            )}
            <Campo id="vigencia_inicio" rotulo="Vale a partir de" erro={errors.vigencia_inicio?.message}>
              <Input {...register('vigencia_inicio')} {...ariaCampo('vigencia_inicio', errors.vigencia_inicio?.message)} type="date" />
            </Campo>
            <Campo id="observacoes_regra" rotulo="Observação">
              <Input {...register('observacoes')} id="observacoes_regra" />
            </Campo>
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" {...register('apenas_com_frete')} className="size-5 accent-[var(--primary)]" />
            Só paga se a viagem tiver frete
          </label>
          {tipo === 'pct_frete_liquido' && (
            <>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" {...register('deduz_pedagio')} className="size-5 accent-[var(--primary)]" />
                Descontar pedágio do frete
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" {...register('deduz_combustivel')} className="size-5 accent-[var(--primary)]" />
                Descontar diesel (rateado por km) do frete
              </label>
            </>
          )}
          {criar.isError && (
            <p role="alert" className="font-medium text-destructive">
              {traduzirErroBanco(criar.error, MENSAGENS)}
            </p>
          )}
          <div className="flex gap-2 sm:justify-end">
            {regras.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setNova(false)}>
                Cancelar
              </Button>
            )}
            <Button type="submit" size="lg" disabled={criar.isPending}>
              Salvar regra
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" size="lg" onClick={() => setNova(true)} className="self-start">
          Nova regra de comissão
        </Button>
      )}
    </div>
  );
}
