-- Q1/Q3 respondidas em 2026-10-01 (docs/01-PRD.md):
-- - Viagem = CICLO: o motorista inicia ao sair de SJE e finaliza na volta, depois
--   de descarregar. A duração varia (às vezes sai sábado e descarrega segunda).
-- - A volta (BH → SJE) é sempre carregada; a ida vai vazia na maioria das vezes.
-- - A comissão é um valor fixo por ciclo (regras_comissao.tipo = 'valor_por_viagem').
-- Os dados comerciais saem de `viagens` e vão para `fretes` (0 a 2 por viagem:
-- no máximo um de ida e um de volta). Só o gestor lê e lança fretes.

create type public.sentido_frete as enum ('ida', 'volta');

create table public.fretes (
  id                    uuid primary key default gen_random_uuid(),
  viagem_id             uuid not null references public.viagens(id) on delete cascade,
  sentido               public.sentido_frete not null,
  cliente_id            uuid references public.clientes(id),
  valor_frete_centavos  bigint not null check (valor_frete_centavos >= 0),
  peso_kg               numeric(10,1) check (peso_kg > 0),
  cte_chave             text check (cte_chave ~ '^\d{44}$'),
  mdfe_chave            text check (mdfe_chave ~ '^\d{44}$'),
  observacoes           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint um_frete_por_sentido unique (viagem_id, sentido)
);

-- Fretes já lançados (só existem no DEV) viram frete de volta, o trecho sempre carregado.
insert into public.fretes (viagem_id, sentido, cliente_id, valor_frete_centavos, peso_kg, cte_chave, mdfe_chave)
select id, 'volta', cliente_id, valor_frete_centavos, peso_kg, cte_chave, mdfe_chave
  from public.viagens
 where valor_frete_centavos is not null;

-- ---------------------------------------------------------------------
-- viagens: remove os campos comerciais (a view depende de v.*)
-- ---------------------------------------------------------------------
drop view public.vw_viagens_resumo;

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
    return new;
  end if;

  -- UPDATE por motorista
  if new.motorista_id is distinct from old.motorista_id
  or new.acerto_id    is distinct from old.acerto_id then
    raise exception 'Motorista não pode alterar dados comerciais da viagem.';
  end if;

  if new.status not in ('em_andamento', 'concluida', 'cancelada') then
    raise exception 'Status inválido para motorista.';
  end if;
  return new;
end $$;

alter table public.viagens
  drop column cliente_id,
  drop column valor_frete_centavos,
  drop column peso_kg,
  drop column cte_chave,
  drop column mdfe_chave;

comment on column public.viagens.origem  is 'Base de saída do ciclo (padrão: São João Evangelista - MG).';
comment on column public.viagens.destino is 'Ponto de virada do ciclo (padrão: Belo Horizonte - MG). A viagem termina de volta à origem.';

-- Resumo por viagem. security_invoker: o motorista enxerga fretes = 0 (sem acesso a fretes).
create view public.vw_viagens_resumo
with (security_invoker = true) as
select
  v.*,
  (v.km_chegada - v.km_saida) as km_rodado,
  coalesce((select sum(f.valor_frete_centavos) from public.fretes f
            where f.viagem_id = v.id), 0)                         as frete_total_centavos,
  (select count(*) from public.fretes f where f.viagem_id = v.id) as quantidade_fretes,
  coalesce((select sum(d.valor_centavos) from public.despesas_viagem d
            where d.viagem_id = v.id and d.tipo = 'pedagio'), 0)  as pedagio_centavos,
  coalesce((select sum(d.valor_centavos) from public.despesas_viagem d
            where d.viagem_id = v.id and d.tipo <> 'pedagio'), 0) as outras_despesas_centavos,
  coalesce((select sum(a.valor_total_centavos) from public.abastecimentos a
            where a.viagem_id = v.id), 0)                         as abastecimentos_vinculados_centavos
from public.viagens v;

-- ---------------------------------------------------------------------
-- fretes: triggers
-- ---------------------------------------------------------------------
create trigger trg_fretes_updated_at before update on public.fretes
for each row execute function public.set_updated_at();

create trigger trg_fretes_auditoria after insert or update or delete on public.fretes
for each row execute function public.registrar_auditoria();

-- Frete de viagem que está em acerto fechado/pago não pode ser lançado, alterado nem apagado.
create or replace function public.bloquear_frete_acertado()
returns trigger language plpgsql as $$
declare
  v_viagens uuid[];
  v_acerto  uuid;
  v_status  public.status_acerto;
begin
  v_viagens := case tg_op
    when 'INSERT' then array[new.viagem_id]
    when 'DELETE' then array[old.viagem_id]
    else array[old.viagem_id, new.viagem_id]
  end;

  select a.id, a.status into v_acerto, v_status
    from public.viagens v
    join public.acertos a on a.id = v.acerto_id
   where v.id = any (v_viagens) and a.status in ('fechado', 'pago')
   limit 1;

  if v_acerto is not null then
    raise exception 'Registro vinculado a acerto % (%). Reabra o acerto para alterar.', v_acerto, v_status;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger trg_fretes_bloqueio_acerto
before insert or update or delete on public.fretes
for each row execute function public.bloquear_frete_acertado();

-- ---------------------------------------------------------------------
-- fretes: RLS (só gestor; motorista não tem policy = sem acesso)
-- ---------------------------------------------------------------------
alter table public.fretes enable row level security;

create policy gestor_total on public.fretes for all to authenticated
  using (public.is_gestor()) with check (public.is_gestor());
