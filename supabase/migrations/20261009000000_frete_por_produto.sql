-- O trecho carregado é definido pelo local do produto (pedido de 2026-10-03): Cimento Liz
-- em Vespasiano (região de BH) carrega na volta. O preço passa a ser de cada produto/local,
-- e o frete automático usa o que o motorista escolheu em "O que vai carregar?".
-- Produção ainda não tem preços nem locais: a troca não precisa migrar dados.

alter table public.locais_carga add column sentido public.sentido_frete not null default 'volta';
comment on column public.locais_carga.sentido is
  'Trecho carregado, pelo lugar do produto: região de BH = volta; região de SJE = ida';

delete from public.precos_frete;
alter table public.precos_frete drop constraint um_preco_por_dia;
alter table public.precos_frete drop column sentido;
alter table public.precos_frete drop column cliente_id;
alter table public.precos_frete
  add column local_carga_id uuid not null references public.locais_carga(id) on delete cascade;
alter table public.precos_frete
  add constraint um_preco_por_dia unique (local_carga_id, vigencia_inicio);

-- cada viagem traz o seu produto: mais de um cliente pode ter o frete automático
drop index public.um_cliente_frete_automatico;

-- Mesma regra de lib/domain/precoFrete.ts (freteAutomatico). security definer: quem conclui
-- é o motorista, que não tem acesso a fretes nem a preços.
create or replace function public.lancar_frete_automatico()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local  record;
  v_valor  bigint;
begin
  if new.status <> 'concluida' or (tg_op = 'UPDATE' and old.status = 'concluida')
     or new.local_carga_id is null then
    return new;
  end if;

  select l.cliente_id, l.sentido into v_local
    from public.locais_carga l
    join public.clientes c on c.id = l.cliente_id
   where l.id = new.local_carga_id and c.frete_automatico and c.ativo;
  if not found then
    return new;
  end if;

  select p.valor_centavos into v_valor
    from public.precos_frete p
   where p.local_carga_id = new.local_carga_id
     and p.vigencia_inicio <= (new.data_saida at time zone 'America/Sao_Paulo')::date
   order by p.vigencia_inicio desc
   limit 1;
  if v_valor is null then
    return new;
  end if;

  insert into public.fretes (viagem_id, sentido, cliente_id, valor_frete_centavos, observacoes)
  values (new.id, v_local.sentido, v_local.cliente_id, v_valor, 'Lançado sozinho pelo preço combinado do produto')
  on conflict (viagem_id, sentido) do nothing;
  return new;
end $$;
