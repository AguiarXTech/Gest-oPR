'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/lib/database.types';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { REGIAO_DO_TRECHO } from '@/lib/domain/precoFrete';
import { hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import {
  cadastroClienteSchema,
  type CadastroClienteDados,
  type CadastroClienteForm,
} from '@/lib/validations/cliente';
import { ariaCampo, Campo } from './Campo';
import { RodapeFormulario } from './RodapeFormulario';

type Cliente = Tables<'clientes'>;

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  // Cliente novo já sai com o frete e a carga (pedido de 2026-10-03); na edição, essas
  // partes ficam nos quadros "Preço do frete" e "O que carrega e onde" da tela do cliente.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroClienteForm, unknown, CadastroClienteDados>({
    resolver: zodResolver(cadastroClienteSchema),
    defaultValues: {
      razao_social: cliente?.razao_social ?? '',
      cnpj: cliente?.cnpj ? formatarCnpj(cliente.cnpj) : '',
      contato: cliente?.contato ?? '',
      prazo_pagamento_dias:
        cliente?.prazo_pagamento_dias != null ? String(cliente.prazo_pagamento_dias) : '',
      produto: '',
      local: '',
      valor_frete: '',
      sentido: 'volta',
      vigencia_inicio: hojeIso(),
      frete_automatico: !cliente,
    },
  });

  const salvar = useMutation({
    mutationFn: async (d: CadastroClienteDados) => {
      const dados = {
        razao_social: d.razao_social,
        cnpj: d.cnpj,
        contato: d.contato,
        prazo_pagamento_dias: d.prazo_pagamento_dias,
      };
      if (cliente) {
        const { error } = await supabase
          .from('clientes')
          .update(dados)
          .eq('id', cliente.id)
          .select('id')
          .single();
        if (error) throw error;
        return cliente.id;
      }
      const { data: novo, error } = await supabase
        .from('clientes')
        .insert({ ...dados, frete_automatico: d.frete_automatico })
        .select('id')
        .single();
      if (error) throw error;
      if (d.produto) {
        // o trecho vem do lugar do produto; o preço é do produto
        const { data: local, error: e2 } = await supabase
          .from('locais_carga')
          .insert({ cliente_id: novo.id, nome: d.produto, endereco: d.local, sentido: d.sentido })
          .select('id')
          .single();
        if (e2) throw e2;
        if (d.valor_frete !== null) {
          const { error: e3 } = await supabase.from('precos_frete').insert({
            local_carga_id: local.id,
            vigencia_inicio: d.vigencia_inicio,
            valor_centavos: d.valor_frete,
          });
          if (e3) throw e3;
        }
      }
      return novo.id;
    },
    onSuccess: (id) => {
      // cliente novo: abre a tela dele, com o preço e a carga já à mostra
      router.push(cliente ? '/g/clientes' : `/g/clientes/${id}`);
      router.refresh();
    },
  });

  const e = (campo: keyof CadastroClienteForm) => errors[campo]?.message;

  return (
    <form
      onSubmit={handleSubmit((dados) => salvar.mutate(dados))}
      noValidate
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="razao_social" rotulo="Razão social *" erro={e('razao_social')}>
            <Input
              {...register('razao_social')}
              {...ariaCampo('razao_social', e('razao_social'))}
              className="h-11 text-base"
            />
          </Campo>
        </div>
        <Campo
          id="cnpj"
          rotulo="CNPJ"
          erro={e('cnpj')}
          ajuda="Aceita CNPJ só com números ou com letras"
        >
          <Input
            {...register('cnpj')}
            {...ariaCampo('cnpj', e('cnpj'), 'Aceita CNPJ só com números ou com letras')}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 text-base uppercase"
          />
        </Campo>
        <Campo
          id="prazo_pagamento_dias"
          rotulo="Prazo de pagamento (dias)"
          erro={e('prazo_pagamento_dias')}
        >
          <Input
            {...register('prazo_pagamento_dias')}
            {...ariaCampo('prazo_pagamento_dias', e('prazo_pagamento_dias'))}
            inputMode="numeric"
            className="h-11 text-base"
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo
            id="contato"
            rotulo="Contato"
            erro={e('contato')}
            ajuda="Nome e telefone de quem atende"
          >
            <Input
              {...register('contato')}
              {...ariaCampo('contato', e('contato'), 'Nome e telefone de quem atende')}
              className="h-11 text-base"
            />
          </Campo>
        </div>
      </div>

      {!cliente && (
        <>
          <fieldset className="flex flex-col gap-4 rounded-2xl border p-4">
            <legend className="px-1 text-lg font-semibold">O que carrega e onde</legend>
            <p className="-mt-2 text-sm text-muted-foreground">
              O motorista escolhe isso ao iniciar a viagem. Dá para adicionar outros depois.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="produto" rotulo="Produto" erro={e('produto')} ajuda="Ex.: Cimento Liz">
                <Input
                  {...register('produto')}
                  {...ariaCampo('produto', e('produto'), 'ajuda')}
                  className="h-11 text-base"
                />
              </Campo>
              <Campo
                id="local"
                rotulo="Local (cidade)"
                erro={e('local')}
                ajuda="Ex.: Vespasiano - MG"
              >
                <Input
                  {...register('local')}
                  {...ariaCampo('local', e('local'), 'ajuda')}
                  className="h-11 text-base"
                />
              </Campo>
              <Campo id="sentido" rotulo="Onde fica" ajuda="Define o trecho carregado">
                <select
                  {...register('sentido')}
                  {...ariaCampo('sentido', undefined, 'ajuda')}
                  className={classeSelect}
                >
                  <option value="volta">{REGIAO_DO_TRECHO.volta}</option>
                  <option value="ida">{REGIAO_DO_TRECHO.ida}</option>
                </select>
              </Campo>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-2xl border p-4">
            <legend className="px-1 text-lg font-semibold">Frete do produto</legend>
            <p className="-mt-2 text-sm text-muted-foreground">
              Reajuste depois: na tela do cliente, toque em Reajustar preço no produto.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="valor_frete"
                rotulo="Valor por viagem (R$)"
                erro={e('valor_frete')}
                ajuda="Ex.: 5.080,00"
              >
                <Input
                  {...register('valor_frete')}
                  {...ariaCampo('valor_frete', e('valor_frete'), 'ajuda')}
                  inputMode="decimal"
                  className="h-11 text-base"
                />
              </Campo>
              <Campo id="vigencia_inicio" rotulo="Vale a partir de" erro={e('vigencia_inicio')}>
                <Input
                  {...register('vigencia_inicio')}
                  {...ariaCampo('vigencia_inicio', e('vigencia_inicio'))}
                  type="date"
                  className="h-11 text-base"
                />
              </Campo>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                {...register('frete_automatico')}
                className="mt-1 size-5 shrink-0"
              />
              <span>
                <span className="block font-medium">Lançar o frete sozinho</span>
                <span className="text-sm text-muted-foreground">
                  Quando o motorista concluir a viagem. O motorista não vê o valor.
                </span>
              </span>
            </label>
          </fieldset>
        </>
      )}

      <RodapeFormulario
        erro={
          salvar.isError
            ? traduzirErroBanco(salvar.error, {
                '23505':
                  'Já existe um cliente com este CNPJ, ou outro cliente já lança o frete sozinho.',
              })
            : null
        }
        salvando={salvar.isPending}
        salvo={salvar.isSuccess}
        rotuloSalvar={cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
        voltarPara="/g/clientes"
      />
    </form>
  );
}
