'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';
import { pneuSchema, type PneuDados, type PneuForm } from '@/lib/validations/pneu';
import { ariaCampo, Campo } from './Campo';
import { RodapeFormulario } from './RodapeFormulario';

type Pneu = Tables<'pneus'>;
type Props = { pneu?: Pneu; fornecedores: { id: string; nome: string; tipo: string }[] };

const reais = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

export function FormPneu({ pneu, fornecedores }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PneuForm, unknown, PneuDados>({
    resolver: zodResolver(pneuSchema),
    defaultValues: {
      marca_fogo: pneu?.marca_fogo ?? '',
      marca: pneu?.marca ?? '',
      modelo: pneu?.modelo ?? '',
      medida: pneu?.medida ?? '',
      dot: pneu?.dot ?? '',
      condicao_entrada: pneu?.condicao_entrada ?? 'novo',
      valor_compra_centavos:
        pneu?.valor_compra_centavos != null ? reais.format(pneu.valor_compra_centavos / 100) : '',
      data_compra: pneu?.data_compra ?? hojeIso(),
      fornecedor_id: pneu?.fornecedor_id ?? '',
      observacoes: pneu?.observacoes ?? '',
    },
  });
  const condicao = useWatch({ control, name: 'condicao_entrada' });

  const salvar = useMutation({
    mutationFn: async (dados: PneuDados) => {
      if (pneu) {
        const { error } = await supabase
          .from('pneus')
          .update(dados)
          .eq('id', pneu.id)
          .select('id')
          .single();
        if (error) throw error;
        return pneu.id;
      }
      const { data, error } = await supabase.from('pneus').insert(dados).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      router.push(pneu ? `/g/pneus/${id}` : '/g/pneus');
      router.refresh();
    },
  });

  const e = (campo: keyof PneuForm) => errors[campo]?.message;

  return (
    <form
      onSubmit={handleSubmit((d) => salvar.mutate(d))}
      noValidate
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Como o pneu chegou *</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['novo', 'Novo', 'Conta o km desde novo'],
              ['usado', 'Usado', 'Km de antes não dá para calcular'],
            ] as const
          ).map(([valor, rotulo, ajuda]) => (
            <label
              key={valor}
              className={cn(
                'flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border bg-card p-3',
                condicao === valor && 'border-primary ring-2 ring-primary',
              )}
            >
              <input
                type="radio"
                value={valor}
                {...register('condicao_entrada')}
                className="sr-only"
              />
              <span className="text-lg font-semibold">{rotulo}</span>
              <span className="text-sm text-muted-foreground">{ajuda}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="marca_fogo"
          rotulo="Marca de fogo *"
          erro={e('marca_fogo')}
          ajuda="Número gravado no pneu"
        >
          <Input
            {...register('marca_fogo')}
            {...ariaCampo('marca_fogo', e('marca_fogo'), 'ajuda')}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 text-base uppercase"
          />
        </Campo>
        <Campo id="medida" rotulo="Medida" erro={e('medida')} ajuda="Ex.: 295/80 R22.5">
          <Input
            {...register('medida')}
            {...ariaCampo('medida', e('medida'), 'ajuda')}
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="marca" rotulo="Marca" erro={e('marca')} ajuda="Ex.: Michelin, Pirelli">
          <Input
            {...register('marca')}
            {...ariaCampo('marca', e('marca'), 'ajuda')}
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="modelo" rotulo="Modelo" erro={e('modelo')}>
          <Input
            {...register('modelo')}
            {...ariaCampo('modelo', e('modelo'))}
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="dot" rotulo="DOT" erro={e('dot')} ajuda="Semana e ano de fabricação, ex.: 3825">
          <Input
            {...register('dot')}
            {...ariaCampo('dot', e('dot'), 'ajuda')}
            inputMode="numeric"
            className="h-11 text-base"
          />
        </Campo>
        <Campo
          id="valor_compra_centavos"
          rotulo="Valor pago (R$)"
          erro={e('valor_compra_centavos')}
        >
          <Input
            {...register('valor_compra_centavos')}
            {...ariaCampo('valor_compra_centavos', e('valor_compra_centavos'))}
            inputMode="decimal"
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="data_compra" rotulo="Data da compra" erro={e('data_compra')}>
          <Input
            {...register('data_compra')}
            {...ariaCampo('data_compra', e('data_compra'))}
            type="date"
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="fornecedor_id" rotulo="Comprado de" erro={e('fornecedor_id')}>
          <select
            {...register('fornecedor_id')}
            {...ariaCampo('fornecedor_id', e('fornecedor_id'))}
            className={classeSelect}
          >
            <option value="">—</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo id="observacoes" rotulo="Observações" erro={e('observacoes')}>
        <textarea
          {...register('observacoes')}
          {...ariaCampo('observacoes', e('observacoes'))}
          rows={2}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Campo>

      <RodapeFormulario
        erro={
          salvar.isError
            ? traduzirErroBanco(salvar.error, {
                '23505': 'Já existe um pneu com essa marca de fogo.',
              })
            : null
        }
        salvando={salvar.isPending}
        salvo={salvar.isSuccess}
        rotuloSalvar={pneu ? 'Salvar alterações' : 'Cadastrar no estoque'}
        voltarPara={pneu ? `/g/pneus/${pneu.id}` : '/g/pneus'}
      />
    </form>
  );
}
