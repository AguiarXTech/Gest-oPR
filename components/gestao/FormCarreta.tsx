'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { formatarPlaca } from '@/lib/domain/placa';
import { CARROCERIAS, COMPOSICOES_CARRETA, eixosSugeridos } from '@/lib/domain/veiculos';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { carretaSchema, type CarretaDados, type CarretaForm } from '@/lib/validations/carreta';
import { ariaCampo, Campo } from './Campo';

type Carreta = Tables<'carretas'>;

function valoresIniciais(c?: Carreta): CarretaForm {
  return {
    placa: c ? formatarPlaca(c.placa) : '',
    apelido: c?.apelido ?? '',
    // text com check no banco: o tipo gerado é string
    composicao: (c?.composicao ?? 'carreta') as CarretaForm['composicao'],
    carroceria: c?.carroceria ?? '',
    eixos: c?.eixos == null ? '' : String(c.eixos),
    eixos_suspensos: String(c?.eixos_suspensos ?? 0),
    observacoes: c?.observacoes ?? '',
  };
}

export function FormCarreta({ carreta }: { carreta?: Carreta }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CarretaForm, unknown, CarretaDados>({
    resolver: zodResolver(carretaSchema),
    defaultValues: valoresIniciais(carreta),
  });

  const salvar = useMutation({
    mutationFn: async (dados: CarretaDados) => {
      const { error } = carreta
        ? await supabase.from('carretas').update(dados).eq('id', carreta.id).select('id').single()
        : await supabase.from('carretas').insert(dados);
      if (error) throw error;
    },
    onSuccess: () => {
      router.push('/g/carretas');
      router.refresh();
    },
  });

  const e = (campo: keyof CarretaForm) => errors[campo]?.message;
  const carroceria = useWatch({ control, name: 'carroceria' });
  // valor antigo digitado à mão continua aparecendo até ser trocado
  const carroceriaAntiga =
    carroceria && !(CARROCERIAS as readonly string[]).includes(carroceria) ? carroceria : null;

  return (
    <form
      onSubmit={handleSubmit((dados) => salvar.mutate(dados))}
      noValidate
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="placa" rotulo="Placa da carreta *" erro={e('placa')} ajuda="ABC1234 ou ABC1D23">
          <Input
            {...register('placa')}
            {...ariaCampo('placa', e('placa'), 'ABC1234 ou ABC1D23')}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 text-base uppercase"
          />
        </Campo>
        <Campo id="apelido" rotulo="Apelido" erro={e('apelido')}>
          <Input
            {...register('apelido')}
            {...ariaCampo('apelido', e('apelido'))}
            className="h-11 text-base"
          />
        </Campo>
        <Campo
          id="composicao"
          rotulo="Composição *"
          erro={e('composicao')}
          ajuda="Preenche os eixos sozinho; dá para corrigir"
        >
          <select
            {...register('composicao', {
              onChange: (ev: React.ChangeEvent<HTMLSelectElement>) => {
                const eixos = eixosSugeridos(ev.target.value);
                if (eixos === null) return;
                setValue('eixos', String(eixos));
                if (Number(getValues('eixos_suspensos')) >= eixos) setValue('eixos_suspensos', '0');
              },
            })}
            {...ariaCampo('composicao', e('composicao'), 'ajuda')}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            {COMPOSICOES_CARRETA.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="carroceria" rotulo="Carroceria" erro={e('carroceria')}>
          <select
            {...register('carroceria')}
            {...ariaCampo('carroceria', e('carroceria'))}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            <option value="">Escolha…</option>
            {CARROCERIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {carroceriaAntiga && <option value={carroceriaAntiga}>{carroceriaAntiga}</option>}
          </select>
        </Campo>
        <Campo id="eixos" rotulo="Eixos da carreta (sem o cavalo)" erro={e('eixos')}>
          <Input
            {...register('eixos')}
            {...ariaCampo('eixos', e('eixos'))}
            inputMode="numeric"
            className="h-11 text-base"
          />
        </Campo>
        <Campo
          id="eixos_suspensos"
          rotulo="Eixos que sobem (vazio)"
          erro={e('eixos_suspensos')}
          ajuda="Para calcular o pedágio da ida vazia"
        >
          <Input
            {...register('eixos_suspensos')}
            {...ariaCampo(
              'eixos_suspensos',
              e('eixos_suspensos'),
              'Para calcular o pedágio da ida vazia',
            )}
            inputMode="numeric"
            className="h-11 text-base"
          />
        </Campo>
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
        {salvar.isError &&
          traduzirErroBanco(salvar.error, { '23505': 'Já existe uma carreta com essa placa.' })}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base"
          onClick={() => router.push('/g/carretas')}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={salvar.isPending || salvar.isSuccess}
          className="h-11 text-base"
        >
          {salvar.isPending ? 'Salvando…' : carreta ? 'Salvar alterações' : 'Cadastrar carreta'}
        </Button>
      </div>
    </form>
  );
}
