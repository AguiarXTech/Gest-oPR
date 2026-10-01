'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import {
  fornecedorSchema,
  TIPOS_FORNECEDOR,
  type FornecedorDados,
  type FornecedorForm,
} from '@/lib/validations/fornecedor';
import { ariaCampo, Campo } from './Campo';
import { RodapeFormulario } from './RodapeFormulario';

type Fornecedor = Tables<'fornecedores'>;

export function FormFornecedor({ fornecedor }: { fornecedor?: Fornecedor }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FornecedorForm, unknown, FornecedorDados>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      nome: fornecedor?.nome ?? '',
      cnpj: fornecedor?.cnpj ? formatarCnpj(fornecedor.cnpj) : '',
      tipo: fornecedor?.tipo ?? 'posto',
      cidade: fornecedor?.cidade ?? '',
    },
  });

  const salvar = useMutation({
    mutationFn: async (dados: FornecedorDados) => {
      const { error } = fornecedor
        ? await supabase.from('fornecedores').update(dados).eq('id', fornecedor.id).select('id').single()
        : await supabase.from('fornecedores').insert(dados);
      if (error) throw error;
    },
    onSuccess: () => {
      router.push('/g/fornecedores');
      router.refresh();
    },
  });

  const e = (campo: keyof FornecedorForm) => errors[campo]?.message;

  return (
    <form onSubmit={handleSubmit((dados) => salvar.mutate(dados))} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="nome" rotulo="Nome *" erro={e('nome')} ajuda="Ex.: Posto Trevo Guanhães">
            <Input
              {...register('nome')}
              {...ariaCampo('nome', e('nome'), 'Ex.: Posto Trevo Guanhães')}
              className="h-11 text-base"
            />
          </Campo>
        </div>
        <Campo id="tipo" rotulo="Tipo *" erro={e('tipo')}>
          <select
            {...register('tipo')}
            {...ariaCampo('tipo', e('tipo'))}
            className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            {Object.entries(TIPOS_FORNECEDOR).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="cidade" rotulo="Cidade" erro={e('cidade')}>
          <Input {...register('cidade')} {...ariaCampo('cidade', e('cidade'))} className="h-11 text-base" />
        </Campo>
        <Campo id="cnpj" rotulo="CNPJ" erro={e('cnpj')} ajuda="Aceita CNPJ só com números ou com letras">
          <Input
            {...register('cnpj')}
            {...ariaCampo('cnpj', e('cnpj'), 'Aceita CNPJ só com números ou com letras')}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 text-base uppercase"
          />
        </Campo>
      </div>

      <RodapeFormulario
        erro={
          salvar.isError ? traduzirErroBanco(salvar.error, { '23505': 'Já existe um fornecedor com este CNPJ.' }) : null
        }
        salvando={salvar.isPending}
        salvo={salvar.isSuccess}
        rotuloSalvar={fornecedor ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        voltarPara="/g/fornecedores"
      />
    </form>
  );
}
