'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
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

const produtoVazio = () => ({
  produto: '',
  local: '',
  sentido: 'volta' as const,
  valor_frete: '',
  vigencia_inicio: hojeIso(),
});

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  // Cliente novo já sai com os produtos e o frete de cada um (pedido de 2026-10-03); na
  // edição, isso fica no quadro "O que carrega, onde e o frete" da tela do cliente.
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CadastroClienteForm, unknown, CadastroClienteDados>({
    resolver: zodResolver(cadastroClienteSchema),
    defaultValues: {
      razao_social: cliente?.razao_social ?? '',
      cnpj: cliente?.cnpj ? formatarCnpj(cliente.cnpj) : '',
      contato: cliente?.contato ?? '',
      prazo_pagamento_dias:
        cliente?.prazo_pagamento_dias != null ? String(cliente.prazo_pagamento_dias) : '',
      produtos: cliente ? [] : [produtoVazio()],
      frete_automatico: !cliente,
    },
  });

  const produtos = useFieldArray({ control, name: 'produtos' });

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
      for (const p of d.produtos) {
        // o trecho vem do lugar do produto; o preço é do produto
        const { data: local, error: e2 } = await supabase
          .from('locais_carga')
          .insert({
            cliente_id: novo.id,
            nome: p.produto ?? '',
            endereco: p.local,
            sentido: p.sentido,
          })
          .select('id')
          .single();
        if (e2) throw e2;
        if (p.valor_frete !== null) {
          const { error: e3 } = await supabase.from('precos_frete').insert({
            local_carga_id: local.id,
            vigencia_inicio: p.vigencia_inicio,
            valor_centavos: p.valor_frete,
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

  const e = (campo: Exclude<keyof CadastroClienteForm, 'produtos' | 'frete_automatico'>) =>
    errors[campo]?.message;
  const ep = (i: number, campo: keyof CadastroClienteForm['produtos'][number]) =>
    errors.produtos?.[i]?.[campo]?.message;

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
        <fieldset className="flex flex-col gap-4 rounded-2xl border p-4">
          <legend className="px-1 text-lg font-semibold">Produtos que carrega e o frete</legend>
          <p className="-mt-2 text-sm text-muted-foreground">
            Um cartão por produto. O lugar do produto define o trecho carregado. O motorista escolhe
            o produto ao iniciar a viagem.
          </p>

          {produtos.fields.map((campo, i) => {
            const id = (nome: string) => `produtos-${i}-${nome}`;
            return (
              <div key={campo.id} className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">Produto {i + 1}</h3>
                  {produtos.fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11"
                      onClick={() => produtos.remove(i)}
                      aria-label={`Remover produto ${i + 1}`}
                    >
                      <Trash2 aria-hidden /> Remover
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id={id('produto')}
                    rotulo="Produto"
                    erro={ep(i, 'produto')}
                    ajuda="Ex.: Cimento Liz"
                  >
                    <Input
                      {...register(`produtos.${i}.produto`)}
                      {...ariaCampo(id('produto'), ep(i, 'produto'), 'ajuda')}
                      className="h-11 text-base"
                    />
                  </Campo>
                  <Campo
                    id={id('local')}
                    rotulo="Local (cidade)"
                    erro={ep(i, 'local')}
                    ajuda="Ex.: Vespasiano - MG"
                  >
                    <Input
                      {...register(`produtos.${i}.local`)}
                      {...ariaCampo(id('local'), ep(i, 'local'), 'ajuda')}
                      className="h-11 text-base"
                    />
                  </Campo>
                  <Campo id={id('sentido')} rotulo="Onde fica" ajuda="Define o trecho carregado">
                    <select
                      {...register(`produtos.${i}.sentido`)}
                      {...ariaCampo(id('sentido'), undefined, 'ajuda')}
                      className={classeSelect}
                    >
                      <option value="volta">{REGIAO_DO_TRECHO.volta}</option>
                      <option value="ida">{REGIAO_DO_TRECHO.ida}</option>
                    </select>
                  </Campo>
                  <Campo
                    id={id('valor_frete')}
                    rotulo="Frete por viagem (R$)"
                    erro={ep(i, 'valor_frete')}
                    ajuda="Ex.: 5.080,00"
                  >
                    <Input
                      {...register(`produtos.${i}.valor_frete`)}
                      {...ariaCampo(id('valor_frete'), ep(i, 'valor_frete'), 'ajuda')}
                      inputMode="decimal"
                      className="h-11 text-base"
                    />
                  </Campo>
                  <Campo
                    id={id('vigencia_inicio')}
                    rotulo="Frete vale a partir de"
                    erro={ep(i, 'vigencia_inicio')}
                  >
                    <Input
                      {...register(`produtos.${i}.vigencia_inicio`)}
                      {...ariaCampo(id('vigencia_inicio'), ep(i, 'vigencia_inicio'))}
                      type="date"
                      className="h-11 text-base"
                    />
                  </Campo>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="self-start"
            onClick={() => produtos.append(produtoVazio())}
          >
            <Plus aria-hidden /> Adicionar outro produto
          </Button>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 border-t pt-4">
            <input
              type="checkbox"
              {...register('frete_automatico')}
              className="mt-1 size-5 shrink-0"
            />
            <span>
              <span className="block font-medium">Lançar o frete sozinho</span>
              <span className="text-sm text-muted-foreground">
                Quando o motorista concluir a viagem, entra o frete do produto que ele escolheu. O
                motorista não vê o valor. Reajuste depois na tela do cliente.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      <RodapeFormulario
        erro={
          salvar.isError
            ? traduzirErroBanco(salvar.error, {
                '23505': 'Já existe um cliente com este CNPJ.',
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
