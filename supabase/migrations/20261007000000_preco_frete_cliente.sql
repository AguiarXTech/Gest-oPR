-- Preço do frete combinado com o cliente (pedido de 2026-10-03), com reajustes.
-- Reajuste = nova linha com a data de início; a viagem usa o preço do dia da saída.
-- O cliente marcado com frete_automatico tem o frete lançado sozinho quando o motorista
-- conclui a viagem (um por sentido com preço). A gestão corrige ou apaga se for diferente.

alter table public.clientes add column frete_automatico boolean not null default false;
-- um cliente só recebe o lançamento automático (hoje a empresa tem um cliente)
create unique index um_cliente_frete_automatico on public.clientes (frete_automatico) where frete_automatico;

create table public.precos_frete (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  sentido          public.sentido_frete not null,
  vigencia_inicio  date not null,
  valor_centavos   bigint not null check (valor_centavos > 0),
  created_at       timestamptz not null default now(),
  constraint um_preco_por_dia unique (cliente_id, sentido, vigencia_inicio)
);

create trigger trg_precos_frete_auditoria after insert or update or delete on public.precos_frete
for each row execute function public.registrar_auditoria();

-- valor de frete: só gestão (Q6)
alter table public.precos_frete enable row level security;
create policy gestor_total on public.precos_frete for all to authenticated
  using (public.is_gestor()) with check (public.is_gestor());

-- Mesma regra de lib/domain/precoFrete.ts (fretesAutomaticos). security definer: quem conclui
-- é o motorista, que não tem acesso a fretes nem a preços.
create function public.lancar_frete_automatico()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cliente uuid;
  v_data    date := (new.data_saida at time zone 'America/Sao_Paulo')::date;
  r         record;
begin
  if new.status <> 'concluida' or (tg_op = 'UPDATE' and old.status = 'concluida') then
    return new;
  end if;

  select id into v_cliente from public.clientes where frete_automatico and ativo limit 1;
  if v_cliente is null then
    return new;
  end if;

  for r in
    select distinct on (p.sentido) p.sentido, p.valor_centavos
      from public.precos_frete p
     where p.cliente_id = v_cliente and p.vigencia_inicio <= v_data
     order by p.sentido, p.vigencia_inicio desc
  loop
    insert into public.fretes (viagem_id, sentido, cliente_id, valor_frete_centavos, observacoes)
    values (new.id, r.sentido, v_cliente, r.valor_centavos, 'Lançado sozinho pelo preço combinado com o cliente')
    on conflict (viagem_id, sentido) do nothing;
  end loop;
  return new;
end $$;

create trigger trg_viagens_frete_automatico
after insert or update of status on public.viagens
for each row execute function public.lancar_frete_automatico();
