'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { formatarCpf } from '@/lib/domain/cpf';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import {
  CATEGORIAS_CNH,
  funcionarioSchema,
  type FuncionarioDados,
  type FuncionarioForm,
} from '@/lib/validations/funcionario';
import { ariaCampo, Campo } from './Campo';

type Funcionario = Tables<'funcionarios'>;

const reais = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function valoresIniciais(f?: Funcionario): FuncionarioForm {
  return {
    nome: f?.nome ?? '',
    cpf: f ? formatarCpf(f.cpf) : '',
    telefone: f?.telefone ?? '',
    cargo: f?.cargo ?? 'motorista',
    data_admissao: f?.data_admissao ?? '',
    salario_base_centavos: f?.salario_base_centavos != null ? reais.format(f.salario_base_centavos / 100) : '',
    cnh_numero: f?.cnh_numero ?? '',
    cnh_categoria: (f?.cnh_categoria ?? '') as FuncionarioForm['cnh_categoria'],
    pix_chave: f?.pix_chave ?? '',
    observacoes: f?.observacoes ?? '',
  };
}

const classeInput = 'h-11 text-base';

export function FormFuncionario({ funcionario }: { funcionario?: Funcionario }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FuncionarioForm, unknown, FuncionarioDados>({
    resolver: zodResolver(funcionarioSchema),
    defaultValues: valoresIniciais(funcionario),
  });

  const salvar = useMutation({
    mutationFn: async (dados: FuncionarioDados) => {
      if (funcionario) {
        const { error } = await supabase
          .from('funcionarios')
          .update(dados)
          .eq('id', funcionario.id)
          .select('id')
          .single();
        if (error) throw error;
        return funcionario.id;
      }
      const { data, error } = await supabase.from('funcionarios').insert(dados).select('id').single();
      if (error) throw error;
      return data.id;
    },
    // Depois de cadastrar, abre a ficha para já criar o acesso ao app.
    onSuccess: (id) => {
      router.push(funcionario ? '/g/funcionarios' : `/g/funcionarios/${id}`);
      router.refresh();
    },
  });

  const e = (campo: keyof FuncionarioForm) => errors[campo]?.message;

  return (
    <form onSubmit={handleSubmit((dados) => salvar.mutate(dados))} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="nome" rotulo="Nome completo *" erro={e('nome')}>
            <Input {...register('nome')} {...ariaCampo('nome', e('nome'))} autoComplete="off" className={classeInput} />
          </Campo>
        </div>
        <Campo id="cpf" rotulo="CPF *" erro={e('cpf')} ajuda="Também é o login no app">
          <Input
            {...register('cpf')}
            {...ariaCampo('cpf', e('cpf'), 'Também é o login no app')}
            inputMode="numeric"
            autoComplete="off"
            className={classeInput}
          />
        </Campo>
        <Campo id="telefone" rotulo="Telefone" erro={e('telefone')}>
          <Input {...register('telefone')} {...ariaCampo('telefone', e('telefone'))} type="tel" className={classeInput} />
        </Campo>
        <Campo id="cargo" rotulo="Cargo *" erro={e('cargo')}>
          <Input {...register('cargo')} {...ariaCampo('cargo', e('cargo'))} className={classeInput} />
        </Campo>
        <Campo id="data_admissao" rotulo="Data de admissão" erro={e('data_admissao')}>
          <Input
            {...register('data_admissao')}
            {...ariaCampo('data_admissao', e('data_admissao'))}
            type="date"
            className={classeInput}
          />
        </Campo>
        <Campo id="salario_base_centavos" rotulo="Salário-base (R$)" erro={e('salario_base_centavos')} ajuda="Ex.: 1.800,00">
          <Input
            {...register('salario_base_centavos')}
            {...ariaCampo('salario_base_centavos', e('salario_base_centavos'), 'Ex.: 1.800,00')}
            inputMode="decimal"
            className={classeInput}
          />
        </Campo>
        <Campo id="pix_chave" rotulo="Chave PIX" erro={e('pix_chave')}>
          <Input {...register('pix_chave')} {...ariaCampo('pix_chave', e('pix_chave'))} autoComplete="off" className={classeInput} />
        </Campo>
        <Campo id="cnh_numero" rotulo="Número da CNH" erro={e('cnh_numero')}>
          <Input
            {...register('cnh_numero')}
            {...ariaCampo('cnh_numero', e('cnh_numero'))}
            inputMode="numeric"
            autoComplete="off"
            className={classeInput}
          />
        </Campo>
        <Campo id="cnh_categoria" rotulo="Categoria da CNH" erro={e('cnh_categoria')}>
          <select
            {...register('cnh_categoria')}
            {...ariaCampo('cnh_categoria', e('cnh_categoria'))}
            className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            <option value="">—</option>
            {CATEGORIAS_CNH.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
        {salvar.isError && traduzirErroBanco(salvar.error, { '23505': 'Já existe um funcionário com este CPF.' })}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 text-base" onClick={() => router.push('/g/funcionarios')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending || salvar.isSuccess} className="h-11 text-base">
          {salvar.isPending ? 'Salvando…' : funcionario ? 'Salvar alterações' : 'Cadastrar funcionário'}
        </Button>
      </div>
    </form>
  );
}
