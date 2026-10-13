'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarPlaca } from '@/lib/domain/placa';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { gerarUuid, jaFoiSalvo } from '@/lib/uuid';
import { manutencaoSchema, type ManutencaoDados, type ManutencaoForm } from '@/lib/validations/manutencao';
import { ariaCampo, Campo } from './Campo';

type Props = {
  caminhoes: { id: string; placa: string; km_atual: number }[];
  planos: { id: string; caminhao_id: string; item: string }[];
  oficinas: { id: string; nome: string }[];
  aoSalvar: () => void;
};

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

/** Registrar uma manutenção feita; marcar os itens do plano cumpridos atualiza o "último feito". */
export function FormManutencao({ caminhoes, planos, oficinas, aoSalvar }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [id] = useState(gerarUuid);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ManutencaoForm, unknown, ManutencaoDados>({
    resolver: zodResolver(manutencaoSchema),
    defaultValues: { caminhao_id: '', data: hojeIso(), km: '', tipo: 'preventiva', descricao: '', valor: '', fornecedor_id: '', itens: [] },
  });
  const [caminhaoId, itens] = useWatch({ control, name: ['caminhao_id', 'itens'] });
  const doCaminhao = planos.filter((p) => p.caminhao_id === caminhaoId);

  const salvar = useMutation({
    mutationFn: async ({ itens: cumpridos, valor, ...dados }: ManutencaoDados) => {
      const { error } = await supabase.from('manutencoes').insert({ ...dados, id, valor_centavos: valor });
      if (error && !jaFoiSalvo(error)) throw error;
      if (cumpridos.length > 0) {
        // upsert: se a resposta se perder e repetir, não duplica o vínculo
        const { error: e2 } = await supabase
          .from('manutencao_itens')
          .upsert(cumpridos.map((plano_id) => ({ manutencao_id: id, plano_id })), { onConflict: 'manutencao_id,plano_id', ignoreDuplicates: true });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      router.refresh();
      aoSalvar();
    },
  });

  const e = (c: keyof ManutencaoForm) => errors[c]?.message;

  return (
    <form onSubmit={handleSubmit((d) => salvar.mutate(d))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="m_caminhao" rotulo="Caminhão *" erro={e('caminhao_id')}>
          <select
            {...register('caminhao_id', {
              onChange: (ev) => {
                const c = caminhoes.find((x) => x.id === ev.target.value);
                if (c) setValue('km', String(c.km_atual));
                setValue('itens', []);
              },
            })}
            {...ariaCampo('m_caminhao', e('caminhao_id'))}
            className={classeSelect}
          >
            <option value="">Escolha…</option>
            {caminhoes.map((c) => (
              <option key={c.id} value={c.id}>
                {formatarPlaca(c.placa)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="m_tipo" rotulo="Tipo">
          <select {...register('tipo')} id="m_tipo" className={classeSelect}>
            <option value="preventiva">Preventiva (programada)</option>
            <option value="corretiva">Corretiva (quebrou)</option>
          </select>
        </Campo>
        <Campo id="m_data" rotulo="Data *" erro={e('data')}>
          <Input {...register('data')} {...ariaCampo('m_data', e('data'))} type="date" />
        </Campo>
        <Campo id="m_km" rotulo="Km do painel *" erro={e('km')}>
          <Input {...register('km')} {...ariaCampo('m_km', e('km'))} inputMode="numeric" className="tabular-nums" />
        </Campo>
        <Campo id="m_valor" rotulo="Valor (R$)" erro={e('valor')}>
          <Input {...register('valor')} {...ariaCampo('m_valor', e('valor'))} inputMode="decimal" className="tabular-nums" />
        </Campo>
        <Campo id="m_oficina" rotulo="Oficina">
          <select {...register('fornecedor_id')} id="m_oficina" className={classeSelect}>
            <option value="">—</option>
            {oficinas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="m_descricao" rotulo="O que foi feito *" erro={e('descricao')}>
            <Input {...register('descricao')} {...ariaCampo('m_descricao', e('descricao'))} placeholder="Ex.: troca de óleo e filtros" />
          </Campo>
        </div>
      </div>

      {doCaminhao.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-medium">Itens do plano feitos nesta manutenção</legend>
          {doCaminhao.map((p) => (
            <label key={p.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={itens.includes(p.id)}
                onChange={(ev) => setValue('itens', ev.target.checked ? [...itens, p.id] : itens.filter((x) => x !== p.id))}
                className="size-5 accent-[var(--primary)]"
              />
              {p.item}
            </label>
          ))}
        </fieldset>
      )}

      {salvar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(salvar.error)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={salvar.isPending} className="sm:self-end">
        {salvar.isPending ? 'Salvando…' : 'Salvar manutenção'}
      </Button>
    </form>
  );
}
