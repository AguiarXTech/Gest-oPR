-- Controle de pedágio (pedido de 2026-10-03): os caminhões passam pela praça de Roças Novas
-- (BR-381) na ida e na volta; a cobrança é feita por câmera/placa num app que erra
-- (o dono já registrou R$ 600 de prejuízo). O app calcula o PREVISTO por passagem
-- (tarifa por eixo × eixos cobrados) e a gestão confere com o COBRADO.
-- Regra de eixos (Lei 13.103 art. 17 / Lei 13.711): vazio com eixo suspenso não paga esse eixo.

-- Quantos eixos o caminhão consegue suspender (vazio)
alter table public.caminhoes add column eixos_suspensos smallint not null default 0
  check (eixos_suspensos >= 0);
alter table public.caminhoes add constraint suspensos_menor_que_eixos
  check (eixos is null or eixos_suspensos < eixos);

-- Exceção por viagem (ex.: foi com reboque, ou não levantou o eixo)
alter table public.viagens
  add column eixos_ida   smallint check (eixos_ida > 0),
  add column eixos_volta smallint check (eixos_volta > 0);

create table public.pracas_pedagio (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  rodovia     text,
  ativa       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Histórico de tarifas: reajuste = nova linha (a viagem usa a tarifa da data dela)
create table public.tarifas_pedagio (
  id                    uuid primary key default gen_random_uuid(),
  praca_id              uuid not null references public.pracas_pedagio(id) on delete cascade,
  vigencia_inicio       date not null,
  tarifa_eixo_centavos  bigint not null check (tarifa_eixo_centavos > 0),
  created_at            timestamptz not null default now(),
  constraint uma_tarifa_por_dia unique (praca_id, vigencia_inicio)
);

-- O que o app de pagamento cobrou, por passagem (viagem × praça × sentido)
create type public.situacao_cobranca_pedagio as enum ('conferido', 'contestar', 'contestado', 'ressarcido');

create table public.cobrancas_pedagio (
  id                     uuid primary key default gen_random_uuid(),
  viagem_id              uuid not null references public.viagens(id) on delete cascade,
  praca_id               uuid not null references public.pracas_pedagio(id),
  sentido                public.sentido_frete not null,
  valor_cobrado_centavos bigint not null check (valor_cobrado_centavos >= 0),
  situacao               public.situacao_cobranca_pedagio not null default 'conferido',
  observacao             text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint uma_cobranca_por_passagem unique (viagem_id, praca_id, sentido)
);

do $$
declare t text;
begin
  foreach t in array array['pracas_pedagio', 'cobrancas_pedagio'] loop
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['pracas_pedagio', 'tarifas_pedagio', 'cobrancas_pedagio'] loop
    execute format('create trigger trg_%1$s_auditoria after insert or update or delete on public.%1$s
                    for each row execute function public.registrar_auditoria()', t);
    execute format('alter table public.%1$s enable row level security', t);
    -- custo do caminhão: só gestão (Q6)
    execute format('create policy gestor_total on public.%1$s for all to authenticated
                    using (public.is_gestor()) with check (public.is_gestor())', t);
  end loop;
end $$;

-- Os eixos da viagem mudam o custo do pedágio: só a gestão altera (motorista não).
create or replace function public.proteger_viagem_motorista()
returns trigger language plpgsql as $$
begin
  if public.contexto_privilegiado() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.motorista_id := public.funcionario_atual();
    new.status       := 'em_andamento';
    new.acerto_id    := null;
    new.eixos_ida    := null;
    new.eixos_volta  := null;
    return new;
  end if;

  -- UPDATE por motorista
  if new.motorista_id is distinct from old.motorista_id
  or new.acerto_id    is distinct from old.acerto_id
  or new.eixos_ida    is distinct from old.eixos_ida
  or new.eixos_volta  is distinct from old.eixos_volta then
    raise exception 'Motorista não pode alterar dados comerciais da viagem.';
  end if;

  if new.status not in ('em_andamento', 'concluida', 'cancelada') then
    raise exception 'Status inválido para motorista.';
  end if;
  return new;
end $$;
