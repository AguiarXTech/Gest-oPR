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
import { clienteSchema, type ClienteDados, type ClienteForm } from '@/lib/validations/cliente';
import { ariaCampo, Campo } from './Campo';
import { RodapeFormulario } from './RodapeFormulario';

type Cliente = Tables<'clientes'>;

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClienteForm, unknown, ClienteDados>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      razao_social: cliente?.razao_social ?? '',
      cnpj: cliente?.cnpj ? formatarCnpj(cliente.cnpj) : '',
      contato: cliente?.contato ?? '',
      prazo_pagamento_dias: cliente?.prazo_pagamento_dias != null ? String(cliente.prazo_pagamento_dias) : '',
    },
  });

  const salvar = useMutation({
    mutationFn: async (dados: ClienteDados) => {
      const { error } = cliente
        ? await supabase.from('clientes').update(dados).eq('id', cliente.id).select('id').single()
        : await supabase.from('clientes').insert(dados);
      if (error) throw error;
    },
    onSuccess: () => {
      router.push('/g/clientes');
      router.refresh();
    },
  });

  const e = (campo: keyof ClienteForm) => errors[campo]?.message;

  return (
    <form onSubmit={handleSubmit((dados) => salvar.mutate(dados))} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="razao_social" rotulo="Razão social *" erro={e('razao_social')}>
            <Input {...register('razao_social')} {...ariaCampo('razao_social', e('razao_social'))} className="h-11 text-base" />
          </Campo>
        </div>
        <Campo id="cnpj" rotulo="CNPJ" erro={e('cnpj')} ajuda="Aceita CNPJ só com números ou com letras">
          <Input
            {...register('cnpj')}
            {...ariaCampo('cnpj', e('cnpj'), 'Aceita CNPJ só com números ou com letras')}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 text-base uppercase"
          />
        </Campo>
        <Campo id="prazo_pagamento_dias" rotulo="Prazo de pagamento (dias)" erro={e('prazo_pagamento_dias')}>
          <Input
            {...register('prazo_pagamento_dias')}
            {...ariaCampo('prazo_pagamento_dias', e('prazo_pagamento_dias'))}
            inputMode="numeric"
            className="h-11 text-base"
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="contato" rotulo="Contato" erro={e('contato')} ajuda="Nome e telefone de quem atende">
            <Input
              {...register('contato')}
              {...ariaCampo('contato', e('contato'), 'Nome e telefone de quem atende')}
              className="h-11 text-base"
            />
          </Campo>
        </div>
      </div>

      <RodapeFormulario
        erro={salvar.isError ? traduzirErroBanco(salvar.error, { '23505': 'Já existe um cliente com este CNPJ.' }) : null}
        salvando={salvar.isPending}
        salvo={salvar.isSuccess}
        rotuloSalvar={cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
        voltarPara="/g/clientes"
      />
    </form>
  );
}
