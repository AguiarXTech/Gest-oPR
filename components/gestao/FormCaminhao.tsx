'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { caminhaoSchema, type CaminhaoDados, type CaminhaoForm } from '@/lib/validations/caminhao';
import { ariaCampo, Campo } from './Campo';

type Caminhao = Tables<'caminhoes'>;

const paraTexto = (v: number | string | null) => (v === null ? '' : String(v));

function valoresIniciais(c?: Caminhao): CaminhaoForm {
  return {
    placa: c ? formatarPlaca(c.placa) : '',
    apelido: c?.apelido ?? '',
    marca: c?.marca ?? '',
    modelo: c?.modelo ?? '',
    ano: paraTexto(c?.ano ?? null),
    eixos: paraTexto(c?.eixos ?? null),
    configuracao_eixos: c?.configuracao_eixos ?? '',
    eixos_suspensos: String(c?.eixos_suspensos ?? 0),
    capacidade_tanque_l: paraTexto(c?.capacidade_tanque_l ?? null).replace('.', ','),
    km_atual: paraTexto(c?.km_atual ?? null),
    observacoes: c?.observacoes ?? '',
  };
}

export function FormCaminhao({ caminhao }: { caminhao?: Caminhao }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const editando = Boolean(caminhao);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CaminhaoForm, unknown, CaminhaoDados>({
    resolver: zodResolver(caminhaoSchema),
    defaultValues: valoresIniciais(caminhao),
  });

  const salvar = useMutation({
    mutationFn: async (dados: CaminhaoDados) => {
      if (caminhao) {
        // km_atual não é enviado na edição: o trigger o mantém a partir das viagens/abastecimentos.
        const alteracoes: Partial<CaminhaoDados> = { ...dados };
        delete alteracoes.km_atual;
        const { error } = await supabase
          .from('caminhoes')
          .update(alteracoes)
          .eq('id', caminhao.id)
          .select('id')
          .single();
        if (error) throw error;
      } else {
        const { error } = await supabase.from('caminhoes').insert(dados);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      router.push('/g/caminhoes');
      router.refresh();
    },
  });

  const e = (campo: keyof CaminhaoForm) => errors[campo]?.message;

  return (
    <form onSubmit={handleSubmit((dados) => salvar.mutate(dados))} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="placa" rotulo="Placa *" erro={e('placa')} ajuda="ABC1234 ou ABC1D23">
          <Input
            {...register('placa')}
            {...ariaCampo('placa', e('placa'), 'ABC1234 ou ABC1D23')}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 text-base uppercase"
          />
        </Campo>
        <Campo id="apelido" rotulo="Apelido" erro={e('apelido')} ajuda="Como a família chama o caminhão">
          <Input
            {...register('apelido')}
            {...ariaCampo('apelido', e('apelido'), 'Como a família chama o caminhão')}
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="marca" rotulo="Marca" erro={e('marca')}>
          <Input {...register('marca')} {...ariaCampo('marca', e('marca'))} className="h-11 text-base" />
        </Campo>
        <Campo id="modelo" rotulo="Modelo" erro={e('modelo')}>
          <Input {...register('modelo')} {...ariaCampo('modelo', e('modelo'))} className="h-11 text-base" />
        </Campo>
        <Campo id="ano" rotulo="Ano" erro={e('ano')}>
          <Input {...register('ano')} {...ariaCampo('ano', e('ano'))} inputMode="numeric" className="h-11 text-base" />
        </Campo>
        <Campo id="eixos" rotulo="Eixos" erro={e('eixos')}>
          <Input {...register('eixos')} {...ariaCampo('eixos', e('eixos'))} inputMode="numeric" className="h-11 text-base" />
        </Campo>
        <Campo id="eixos_suspensos" rotulo="Eixos que sobem (vazio)" erro={e('eixos_suspensos')} ajuda="Para calcular o pedágio da ida vazia">
          <Input
            {...register('eixos_suspensos')}
            {...ariaCampo('eixos_suspensos', e('eixos_suspensos'), 'Para calcular o pedágio da ida vazia')}
            inputMode="numeric"
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="configuracao_eixos" rotulo="Configuração" erro={e('configuracao_eixos')} ajuda="Ex.: toco, truck, cavalo 6x2">
          <Input
            {...register('configuracao_eixos')}
            {...ariaCampo('configuracao_eixos', e('configuracao_eixos'), 'Ex.: toco, truck, cavalo 6x2')}
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="capacidade_tanque_l" rotulo="Capacidade do tanque (litros) *" erro={e('capacidade_tanque_l')}>
          <Input
            {...register('capacidade_tanque_l')}
            {...ariaCampo('capacidade_tanque_l', e('capacidade_tanque_l'))}
            inputMode="decimal"
            className="h-11 text-base"
          />
        </Campo>
        {editando ? (
          <Campo id="km_atual" rotulo="Km atual" ajuda="Atualizado sozinho pelas viagens e abastecimentos.">
            <Input
              {...register('km_atual')}
              {...ariaCampo('km_atual', undefined, 'Atualizado sozinho pelas viagens e abastecimentos.')}
              readOnly
              className="h-11 bg-muted text-base"
            />
          </Campo>
        ) : (
          <Campo id="km_atual" rotulo="Km atual do painel *" erro={e('km_atual')}>
            <Input
              {...register('km_atual')}
              {...ariaCampo('km_atual', e('km_atual'))}
              inputMode="numeric"
              className="h-11 text-base"
            />
          </Campo>
        )}
      </div>

      <Campo id="observacoes" rotulo="Observações" erro={e('observacoes')}>
        <textarea
          {...register('observacoes')}
          {...ariaCampo('observacoes', e('observacoes'))}
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Campo>

      <p aria-live="polite" className="text-sm font-medium text-destructive empty:hidden">
        {salvar.isError && traduzirErroBanco(salvar.error, { '23505': 'Já existe um caminhão com essa placa.' })}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 text-base" onClick={() => router.push('/g/caminhoes')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending || salvar.isSuccess} className="h-11 text-base">
          {salvar.isPending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar caminhão'}
        </Button>
      </div>
    </form>
  );
}
