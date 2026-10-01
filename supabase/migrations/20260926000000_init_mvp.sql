-- =====================================================================
-- Gestão Frota — Migration inicial (MVP / Fase 1)
-- Referências: docs/03-MODELO-DE-DADOS.md, docs/04-REGRAS-DE-NEGOCIO.md,
--              docs/05-PERMISSOES-E-LGPD.md
-- Convenções: dinheiro em centavos (bigint), km inteiro, litros numeric(10,3)
-- =====================================================================

set search_path to public, extensions;

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('dono', 'admin', 'motorista');
create type public.status_viagem as enum ('planejada', 'em_andamento', 'concluida', 'cancelada');
create type public.tipo_despesa as enum (
  'pedagio', 'alimentacao', 'pernoite', 'chapa', 'borracharia',
  'manutencao', 'estacionamento', 'lavagem', 'outros'
);
create type public.forma_pagamento_abastecimento as enum ('motorista', 'cartao_empresa', 'faturado');
create type public.status_acerto as enum ('rascunho', 'fechado', 'pago');
create type public.tipo_comissao as enum ('pct_frete_bruto', 'pct_frete_liquido', 'valor_por_viagem', 'valor_por_km');
create type public.tipo_documento as enum (
  'crlv', 'licenciamento', 'ipva', 'seguro', 'rntrc', 'cronotacografo',
  'certificado_digital', 'cnh', 'toxicologico', 'outro'
);
create type public.entidade_documento as enum ('empresa', 'caminhao', 'funcionario');
create type public.tipo_fornecedor as enum ('posto', 'oficina', 'recapadora', 'loja', 'outro');

-- ---------------------------------------------------------------------
-- UTIL: updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- CADASTROS
-- ---------------------------------------------------------------------
create table public.funcionarios (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  cpf                    text not null unique check (cpf ~ '^\d{11}$'),
  telefone               text,
  cargo                  text not null default 'motorista',
  data_admissao          date,
  data_demissao          date,
  salario_base_centavos  bigint check (salario_base_centavos >= 0),
  cnh_numero             text,
  cnh_categoria          text,
  pix_chave              text,
  ativo                  boolean not null default true,
  observacoes            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nome            text not null,
  papel           public.papel_usuario not null,
  funcionario_id  uuid unique references public.funcionarios(id),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint motorista_tem_funcionario
    check (papel <> 'motorista' or funcionario_id is not null)
);

create table public.caminhoes (
  id                   uuid primary key default gen_random_uuid(),
  placa                text not null unique check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  apelido              text,
  marca                text,
  modelo               text,
  ano                  smallint,
  eixos                smallint check (eixos between 2 and 9),
  configuracao_eixos   text,                    -- ex.: 'toco', 'truck', 'cavalo 6x2' (Q9)
  capacidade_tanque_l  numeric(7,1) check (capacidade_tanque_l > 0),
  km_atual             integer not null default 0 check (km_atual >= 0),
  ativo                boolean not null default true,
  observacoes          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.clientes (
  id                     uuid primary key default gen_random_uuid(),
  razao_social           text not null,
  cnpj                   text unique check (cnpj ~ '^\d{14}$'),
  contato                text,
  prazo_pagamento_dias   smallint,
  ativo                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.fornecedores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text unique check (cnpj ~ '^\d{14}$'),
  tipo        public.tipo_fornecedor not null default 'posto',
  cidade      text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HELPERS DE AUTORIZAÇÃO (security definer: leem profiles sem RLS)
-- ---------------------------------------------------------------------
create or replace function public.papel_atual()
returns public.papel_usuario
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid() and ativo
$$;

create or replace function public.funcionario_atual()
returns uuid
language sql stable security definer set search_path = public as $$
  select funcionario_id from public.profiles where id = auth.uid() and ativo
$$;

create or replace function public.is_gestor()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.papel_atual() in ('dono', 'admin'), false)
$$;

-- NÃO é security definer de propósito: current_user precisa refletir o papel
-- real (postgres/seed, service_role/server actions, authenticated/app).
create or replace function public.contexto_privilegiado()
returns boolean
language sql stable as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role')
      or public.is_gestor()
$$;

-- ---------------------------------------------------------------------
-- OPERAÇÃO
-- ---------------------------------------------------------------------
create table public.acertos (
  id                              uuid primary key default gen_random_uuid(),
  motorista_id                    uuid not null references public.funcionarios(id),
  periodo_inicio                  date not null,
  periodo_fim                     date not null,
  status                          public.status_acerto not null default 'rascunho',
  total_frete_centavos            bigint not null default 0,
  total_comissao_centavos         bigint not null default 0,
  total_reembolsos_centavos       bigint not null default 0,
  total_adiantamentos_centavos    bigint not null default 0,
  saldo_centavos                  bigint not null default 0,
  regra_snapshot                  jsonb,
  fechado_em                      timestamptz,
  fechado_por                     uuid references auth.users(id),
  pago_em                         date,
  forma_pagamento                 text,
  observacoes                     text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint periodo_valido check (periodo_fim >= periodo_inicio)
);

create table public.viagens (
  id                     uuid primary key default gen_random_uuid(),
  caminhao_id            uuid not null references public.caminhoes(id),
  motorista_id           uuid not null references public.funcionarios(id),
  cliente_id             uuid references public.clientes(id),
  origem                 text not null,
  destino                text not null,
  data_saida             timestamptz not null default now(),
  data_chegada           timestamptz,
  km_saida               integer not null check (km_saida >= 0),
  km_chegada             integer,
  valor_frete_centavos   bigint check (valor_frete_centavos >= 0),  -- null = não informado (bloqueia acerto)
  peso_kg                numeric(10,1),
  cte_chave              text check (cte_chave ~ '^\d{44}$'),
  mdfe_chave             text check (mdfe_chave ~ '^\d{44}$'),
  status                 public.status_viagem not null default 'em_andamento',
  acerto_id              uuid references public.acertos(id) on delete set null,
  observacoes            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint km_chegada_valido check (km_chegada is null or km_chegada >= km_saida),
  constraint concluida_tem_chegada check (status <> 'concluida' or (km_chegada is not null and data_chegada is not null))
);
create unique index viagem_em_andamento_por_motorista on public.viagens (motorista_id) where status = 'em_andamento';
create unique index viagem_em_andamento_por_caminhao  on public.viagens (caminhao_id)  where status = 'em_andamento';
create index viagens_caminhao_data on public.viagens (caminhao_id, data_saida);
create index viagens_motorista_data on public.viagens (motorista_id, data_saida);

create table public.abastecimentos (
  id                     uuid primary key default gen_random_uuid(),
  viagem_id              uuid references public.viagens(id) on delete set null,
  caminhao_id            uuid not null references public.caminhoes(id),
  motorista_id           uuid not null references public.funcionarios(id),
  data_hora              timestamptz not null default now(),
  km                     integer not null check (km > 0),
  litros                 numeric(10,3) not null check (litros > 0),
  valor_total_centavos   bigint not null check (valor_total_centavos > 0),
  tanque_cheio           boolean not null default true,
  forma_pagamento        public.forma_pagamento_abastecimento not null default 'motorista',
  fornecedor_id          uuid references public.fornecedores(id),
  posto_nome             text,
  nfce_chave             text unique check (nfce_chave ~ '^\d{44}$'),
  nfce_url               text,
  foto_path              text,
  conferido              boolean not null default false,
  conferido_por          uuid references auth.users(id),
  comentario_gestor      text,
  acerto_id              uuid references public.acertos(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index abastecimentos_caminhao_km on public.abastecimentos (caminhao_id, km, data_hora);
create index abastecimentos_motorista_data on public.abastecimentos (motorista_id, data_hora);

create table public.despesas_viagem (
  id                uuid primary key default gen_random_uuid(),
  viagem_id         uuid references public.viagens(id) on delete set null,
  caminhao_id       uuid references public.caminhoes(id),
  motorista_id      uuid not null references public.funcionarios(id),
  tipo              public.tipo_despesa not null,
  data              date not null default current_date,
  valor_centavos    bigint not null check (valor_centavos > 0),
  reembolsavel      boolean not null default true,
  descricao         text,
  foto_path         text,
  conferido         boolean not null default false,
  conferido_por     uuid references auth.users(id),
  comentario_gestor text,
  acerto_id         uuid references public.acertos(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index despesas_viagem_idx on public.despesas_viagem (viagem_id);
create index despesas_motorista_data on public.despesas_viagem (motorista_id, data);

create table public.adiantamentos (
  id               uuid primary key default gen_random_uuid(),
  motorista_id     uuid not null references public.funcionarios(id),
  viagem_id        uuid references public.viagens(id) on delete set null,
  data             date not null default current_date,
  valor_centavos   bigint not null check (valor_centavos > 0),
  forma            text,                       -- pix, dinheiro...
  observacao       text,
  acerto_id        uuid references public.acertos(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index adiantamentos_motorista_data on public.adiantamentos (motorista_id, data);

create table public.regras_comissao (
  id                  uuid primary key default gen_random_uuid(),
  funcionario_id      uuid not null references public.funcionarios(id),
  tipo                public.tipo_comissao not null,
  percentual          numeric(5,2) check (percentual >= 0 and percentual <= 100),
  valor_centavos      bigint check (valor_centavos >= 0),
  deduz_pedagio       boolean not null default false,
  deduz_combustivel   boolean not null default false,
  apenas_com_frete    boolean not null default true,
  vigencia_inicio     date not null,
  vigencia_fim        date,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint vigencia_valida check (vigencia_fim is null or vigencia_fim >= vigencia_inicio),
  constraint parametro_por_tipo check (
    (tipo in ('pct_frete_bruto', 'pct_frete_liquido') and percentual is not null)
    or (tipo in ('valor_por_viagem', 'valor_por_km') and valor_centavos is not null)
  ),
  constraint sem_sobreposicao_vigencia exclude using gist (
    funcionario_id with =,
    daterange(vigencia_inicio, vigencia_fim, '[]') with &&
  )
);

create table public.documentos (
  id               uuid primary key default gen_random_uuid(),
  tipo             public.tipo_documento not null,
  entidade         public.entidade_documento not null,
  caminhao_id      uuid references public.caminhoes(id),
  funcionario_id   uuid references public.funcionarios(id),
  numero           text,
  emissao          date,
  vencimento       date not null,
  arquivo_path     text,
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint entidade_consistente check (
    (entidade = 'empresa'     and caminhao_id is null and funcionario_id is null) or
    (entidade = 'caminhao'    and caminhao_id is not null and funcionario_id is null) or
    (entidade = 'funcionario' and funcionario_id is not null and caminhao_id is null)
  )
);
create index documentos_vencimento on public.documentos (vencimento);

create table public.configuracoes (
  chave       text primary key,
  valor       jsonb not null,
  descricao   text,
  updated_at  timestamptz not null default now()
);

create table public.auditoria (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  registro_id  uuid,
  acao         text not null,
  usuario_id   uuid,
  antes        jsonb,
  depois       jsonb,
  criado_em    timestamptz not null default now()
);
create index auditoria_registro on public.auditoria (tabela, registro_id);

-- ---------------------------------------------------------------------
-- TRIGGERS: updated_at
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'funcionarios','profiles','caminhoes','clientes','fornecedores','acertos',
    'viagens','abastecimentos','despesas_viagem','adiantamentos',
    'regras_comissao','documentos','configuracoes'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- TRIGGERS: proteção de campos quando quem escreve é motorista
-- ---------------------------------------------------------------------
create or replace function public.proteger_viagem_motorista()
returns trigger language plpgsql as $$
begin
  if public.contexto_privilegiado() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.motorista_id         := public.funcionario_atual();
    new.status               := 'em_andamento';
    new.acerto_id            := null;
    new.valor_frete_centavos := null;
    new.cliente_id           := null;
    new.cte_chave            := null;
    new.mdfe_chave           := null;
    return new;
  end if;

  -- UPDATE por motorista
  if new.motorista_id         is distinct from old.motorista_id
  or new.acerto_id            is distinct from old.acerto_id
  or new.valor_frete_centavos is distinct from old.valor_frete_centavos
  or new.cliente_id           is distinct from old.cliente_id
  or new.cte_chave            is distinct from old.cte_chave
  or new.mdfe_chave           is distinct from old.mdfe_chave then
    raise exception 'Motorista não pode alterar dados comerciais da viagem.';
  end if;

  if new.status not in ('em_andamento', 'concluida', 'cancelada') then
    raise exception 'Status inválido para motorista.';
  end if;
  return new;
end $$;

create trigger trg_viagens_protecao
before insert or update on public.viagens
for each row execute function public.proteger_viagem_motorista();

create or replace function public.proteger_lancamento_motorista()
returns trigger language plpgsql as $$
begin
  if public.contexto_privilegiado() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.motorista_id      := public.funcionario_atual();
    new.acerto_id         := null;
    new.conferido         := false;
    new.conferido_por     := null;
    new.comentario_gestor := null;
    return new;
  end if;

  if new.motorista_id      is distinct from old.motorista_id
  or new.acerto_id         is distinct from old.acerto_id
  or new.conferido         is distinct from old.conferido
  or new.conferido_por     is distinct from old.conferido_por
  or new.comentario_gestor is distinct from old.comentario_gestor then
    raise exception 'Motorista não pode alterar campos de conferência/acerto.';
  end if;
  return new;
end $$;

create trigger trg_abastecimentos_protecao
before insert or update on public.abastecimentos
for each row execute function public.proteger_lancamento_motorista();

create trigger trg_despesas_protecao
before insert or update on public.despesas_viagem
for each row execute function public.proteger_lancamento_motorista();

-- ---------------------------------------------------------------------
-- TRIGGERS: bloqueio de itens vinculados a acerto fechado/pago
-- ---------------------------------------------------------------------
create or replace function public.bloquear_item_acertado()
returns trigger language plpgsql as $$
declare
  v_status public.status_acerto;
begin
  if old.acerto_id is not null then
    select status into v_status from public.acertos where id = old.acerto_id;
    if v_status in ('fechado', 'pago') then
      raise exception 'Registro vinculado a acerto % (%). Reabra o acerto para alterar.',
        old.acerto_id, v_status;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['viagens','abastecimentos','despesas_viagem','adiantamentos'] loop
    execute format(
      'create trigger trg_%1$s_bloqueio_acerto before update or delete on public.%1$s
       for each row execute function public.bloquear_item_acertado()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- TRIGGER: máquina de estados do acerto
-- ---------------------------------------------------------------------
create or replace function public.validar_transicao_acerto()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'Só é possível excluir acerto em rascunho.';
    end if;
    return old;
  end if;

  if old.status = 'rascunho' then
    -- rascunho: livre (totais preenchidos pela aplicação), mas só sai para 'fechado'
    if new.status = 'pago' then
      raise exception 'Feche o acerto antes de marcá-lo como pago.';
    end if;
    if new.status = 'fechado' then
      if new.regra_snapshot is null then
        raise exception 'Acerto fechado exige regra_snapshot.';
      end if;
      new.fechado_em  := coalesce(new.fechado_em, now());
      new.fechado_por := coalesce(new.fechado_por, auth.uid());
    end if;
    return new;
  end if;

  -- reabrir: somente dono (ou contexto de banco)
  if new.status = 'rascunho' then
    if current_user in ('postgres', 'supabase_admin', 'service_role')
       or public.papel_atual() = 'dono' then
      new.fechado_em := null;
      new.fechado_por := null;
      new.pago_em := null;
      return new;
    end if;
    raise exception 'Somente o dono pode reabrir um acerto.';
  end if;

  -- fechado -> pago: só muda campos de pagamento/observação
  if old.status = 'fechado' and new.status in ('fechado', 'pago') then
    if new.total_comissao_centavos      <> old.total_comissao_centavos
    or new.total_reembolsos_centavos    <> old.total_reembolsos_centavos
    or new.total_adiantamentos_centavos <> old.total_adiantamentos_centavos
    or new.saldo_centavos               <> old.saldo_centavos
    or new.regra_snapshot is distinct from old.regra_snapshot
    or new.motorista_id <> old.motorista_id
    or new.periodo_inicio <> old.periodo_inicio
    or new.periodo_fim <> old.periodo_fim then
      raise exception 'Acerto fechado não pode ter valores alterados. Reabra-o.';
    end if;
    if new.status = 'pago' and new.pago_em is null then
      raise exception 'Informe a data de pagamento (pago_em).';
    end if;
    return new;
  end if;

  if old.status = 'pago' then
    raise exception 'Acerto pago é imutável. Reabra-o (somente dono).';
  end if;

  raise exception 'Transição de acerto inválida: % -> %', old.status, new.status;
end $$;

create trigger trg_acertos_transicao
before update or delete on public.acertos
for each row execute function public.validar_transicao_acerto();

-- ---------------------------------------------------------------------
-- TRIGGER: auditoria
-- ---------------------------------------------------------------------
create or replace function public.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, antes, depois)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'viagens','abastecimentos','despesas_viagem','adiantamentos','acertos',
    'regras_comissao','funcionarios','caminhoes','documentos','profiles'
  ] loop
    execute format(
      'create trigger trg_%1$s_auditoria after insert or update or delete on public.%1$s
       for each row execute function public.registrar_auditoria()', t);
  end loop;
end $$;

-- configuracoes usa "chave" (text) como PK e não tem "id": função própria.
create or replace function public.registrar_auditoria_config()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, antes, depois)
  values (tg_table_name, null, tg_op, auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_configuracoes_auditoria
after insert or update or delete on public.configuracoes
for each row execute function public.registrar_auditoria_config();

-- ---------------------------------------------------------------------
-- TRIGGER: mantém caminhoes.km_atual (motorista não tem UPDATE em caminhoes)
-- ---------------------------------------------------------------------
create or replace function public.atualizar_km_caminhao()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_km integer;
begin
  if tg_table_name = 'viagens' then
    v_km := greatest(new.km_saida, coalesce(new.km_chegada, 0));
  else
    v_km := new.km;
  end if;
  update public.caminhoes
     set km_atual = v_km
   where id = new.caminhao_id and km_atual < v_km;
  return new;
end $$;

create trigger trg_viagens_km_caminhao
after insert or update of km_saida, km_chegada on public.viagens
for each row execute function public.atualizar_km_caminhao();

create trigger trg_abastecimentos_km_caminhao
after insert or update of km on public.abastecimentos
for each row execute function public.atualizar_km_caminhao();

-- ---------------------------------------------------------------------
-- VIEWS (security_invoker: respeitam a RLS de quem consulta)
-- ---------------------------------------------------------------------
create view public.vw_viagens_resumo
with (security_invoker = true) as
select
  v.*,
  (v.km_chegada - v.km_saida) as km_rodado,
  coalesce((select sum(d.valor_centavos) from public.despesas_viagem d
            where d.viagem_id = v.id and d.tipo = 'pedagio'), 0)  as pedagio_centavos,
  coalesce((select sum(d.valor_centavos) from public.despesas_viagem d
            where d.viagem_id = v.id and d.tipo <> 'pedagio'), 0) as outras_despesas_centavos,
  coalesce((select sum(a.valor_total_centavos) from public.abastecimentos a
            where a.viagem_id = v.id), 0)                         as abastecimentos_vinculados_centavos
from public.viagens v;

create view public.vw_documentos_status
with (security_invoker = true) as
select distinct on (d.entidade, d.tipo, coalesce(d.caminhao_id, d.funcionario_id))
  d.*,
  (d.vencimento - (now() at time zone 'America/Sao_Paulo')::date) as dias_para_vencer
from public.documentos d
order by d.entidade, d.tipo, coalesce(d.caminhao_id, d.funcionario_id), d.vencimento desc;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.funcionarios     enable row level security;
alter table public.profiles         enable row level security;
alter table public.caminhoes        enable row level security;
alter table public.clientes         enable row level security;
alter table public.fornecedores     enable row level security;
alter table public.acertos          enable row level security;
alter table public.viagens          enable row level security;
alter table public.abastecimentos   enable row level security;
alter table public.despesas_viagem  enable row level security;
alter table public.adiantamentos    enable row level security;
alter table public.regras_comissao  enable row level security;
alter table public.documentos       enable row level security;
alter table public.configuracoes    enable row level security;
alter table public.auditoria        enable row level security;

-- Gestor (dono/admin): acesso total às tabelas de negócio
do $$
declare t text;
begin
  foreach t in array array[
    'funcionarios','caminhoes','clientes','fornecedores','acertos','viagens',
    'abastecimentos','despesas_viagem','adiantamentos','regras_comissao',
    'documentos','configuracoes'
  ] loop
    execute format(
      'create policy gestor_total on public.%1$s for all to authenticated
       using (public.is_gestor()) with check (public.is_gestor())', t);
  end loop;
end $$;

-- profiles: cada um vê o próprio; gestor vê todos. Escrita só via service_role.
create policy perfil_proprio on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_gestor());

-- funcionarios: motorista vê só o próprio registro
create policy motorista_ve_proprio on public.funcionarios for select to authenticated
  using (id = public.funcionario_atual());

-- caminhoes / fornecedores / configuracoes: leitura para qualquer autenticado ativo
create policy leitura_autenticado on public.caminhoes for select to authenticated
  using (public.papel_atual() is not null);
create policy leitura_autenticado on public.fornecedores for select to authenticated
  using (public.papel_atual() is not null);
create policy leitura_autenticado on public.configuracoes for select to authenticated
  using (public.papel_atual() is not null);

-- viagens
create policy motorista_select on public.viagens for select to authenticated
  using (motorista_id = public.funcionario_atual());
create policy motorista_insert on public.viagens for insert to authenticated
  with check (motorista_id = public.funcionario_atual() and status = 'em_andamento');
create policy motorista_update on public.viagens for update to authenticated
  using (motorista_id = public.funcionario_atual() and status = 'em_andamento' and acerto_id is null)
  with check (motorista_id = public.funcionario_atual());

-- abastecimentos e despesas
create policy motorista_select on public.abastecimentos for select to authenticated
  using (motorista_id = public.funcionario_atual());
create policy motorista_insert on public.abastecimentos for insert to authenticated
  with check (motorista_id = public.funcionario_atual());
create policy motorista_update on public.abastecimentos for update to authenticated
  using (motorista_id = public.funcionario_atual() and not conferido and acerto_id is null)
  with check (motorista_id = public.funcionario_atual());
create policy motorista_delete on public.abastecimentos for delete to authenticated
  using (motorista_id = public.funcionario_atual() and not conferido and acerto_id is null);

create policy motorista_select on public.despesas_viagem for select to authenticated
  using (motorista_id = public.funcionario_atual());
create policy motorista_insert on public.despesas_viagem for insert to authenticated
  with check (motorista_id = public.funcionario_atual());
create policy motorista_update on public.despesas_viagem for update to authenticated
  using (motorista_id = public.funcionario_atual() and not conferido and acerto_id is null)
  with check (motorista_id = public.funcionario_atual());
create policy motorista_delete on public.despesas_viagem for delete to authenticated
  using (motorista_id = public.funcionario_atual() and not conferido and acerto_id is null);

-- adiantamentos, regras de comissão: motorista só lê os próprios
create policy motorista_select on public.adiantamentos for select to authenticated
  using (motorista_id = public.funcionario_atual());
create policy motorista_select on public.regras_comissao for select to authenticated
  using (funcionario_id = public.funcionario_atual());

-- acertos: motorista vê os próprios já fechados/pagos
create policy motorista_select on public.acertos for select to authenticated
  using (motorista_id = public.funcionario_atual() and status in ('fechado', 'pago'));

-- documentos: motorista vê os próprios (CNH, toxicológico: só datas)
create policy motorista_select on public.documentos for select to authenticated
  using (funcionario_id = public.funcionario_atual());

-- auditoria: somente gestor lê; ninguém escreve diretamente
create policy gestor_le on public.auditoria for select to authenticated
  using (public.is_gestor());

-- clientes: somente gestor (policy gestor_total já criada)

-- ---------------------------------------------------------------------
-- STORAGE: bucket privado de comprovantes
-- caminho: {funcionario_id}/{yyyy}/{mm}/{uuid}.jpg
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy comprovantes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'comprovantes'
    and (public.is_gestor() or (storage.foldername(name))[1] = public.funcionario_atual()::text)
  );

create policy comprovantes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (public.is_gestor() or (storage.foldername(name))[1] = public.funcionario_atual()::text)
  );

create policy comprovantes_delete_gestor on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and public.is_gestor());
