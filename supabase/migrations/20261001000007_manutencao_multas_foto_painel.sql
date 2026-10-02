-- Adições do piloto (pedido de 2026-10-01, ver docs/06-ROADMAP.md "Adições do piloto"):
-- 1) manutenção preventiva por km/tempo (RF-32), 2) multas com indicação de condutor (RF-35),
-- 3) foto do painel no abastecimento (antifraude do km).

create type public.tipo_manutencao as enum ('preventiva', 'corretiva');

-- ---------------------------------------------------------------------
-- Plano de manutenção: itens com intervalo por km e/ou por tempo, por caminhão
-- ---------------------------------------------------------------------
create table public.planos_manutencao (
  id              uuid primary key default gen_random_uuid(),
  caminhao_id     uuid not null references public.caminhoes(id),
  item            text not null,
  intervalo_km    integer check (intervalo_km > 0),
  intervalo_dias  integer check (intervalo_dias > 0),
  ultimo_km       integer check (ultimo_km >= 0),
  ultima_data     date,
  ativo           boolean not null default true,
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tem_intervalo check (intervalo_km is not null or intervalo_dias is not null)
);
create index planos_manutencao_caminhao on public.planos_manutencao (caminhao_id);

-- Manutenção feita (preventiva ou corretiva), com custo e oficina
create table public.manutencoes (
  id              uuid primary key default gen_random_uuid(),
  caminhao_id     uuid not null references public.caminhoes(id),
  data            date not null default current_date,
  km              integer not null check (km > 0),
  tipo            public.tipo_manutencao not null default 'preventiva',
  descricao       text not null,
  valor_centavos  bigint not null default 0 check (valor_centavos >= 0),
  fornecedor_id   uuid references public.fornecedores(id),
  arquivo_path    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index manutencoes_caminhao_data on public.manutencoes (caminhao_id, data);

-- Quais itens do plano uma manutenção cumpriu
create table public.manutencao_itens (
  manutencao_id  uuid not null references public.manutencoes(id) on delete cascade,
  plano_id       uuid not null references public.planos_manutencao(id) on delete cascade,
  primary key (manutencao_id, plano_id)
);

-- Cumprir um item atualiza o "último feito" do plano (se for a mais recente)
create or replace function public.atualizar_plano_manutencao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.planos_manutencao p
     set ultimo_km = m.km, ultima_data = m.data
    from public.manutencoes m
   where m.id = new.manutencao_id and p.id = new.plano_id
     and (p.ultima_data is null or m.data >= p.ultima_data);
  return new;
end $$;

create trigger trg_manutencao_itens_plano
after insert on public.manutencao_itens
for each row execute function public.atualizar_plano_manutencao();

-- km da manutenção também atualiza o km do caminhão (mesma função de viagens/abastecimentos)
create trigger trg_manutencoes_km_caminhao
after insert or update of km on public.manutencoes
for each row execute function public.atualizar_km_caminhao();

-- ---------------------------------------------------------------------
-- Multas
-- ---------------------------------------------------------------------
create table public.multas (
  id               uuid primary key default gen_random_uuid(),
  caminhao_id      uuid not null references public.caminhoes(id),
  funcionario_id   uuid references public.funcionarios(id),  -- quem dirigia (sugerido pela viagem)
  data_infracao    timestamptz not null,
  auto_numero      text,
  descricao        text,
  local            text,
  valor_centavos   bigint not null check (valor_centavos > 0),
  notificada_em    date,
  prazo_indicacao  date,
  indicado_em      date,
  pago_em          date,
  arquivo_path     text,
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index multas_caminhao on public.multas (caminhao_id, data_infracao);

-- ---------------------------------------------------------------------
-- Foto do painel (km) no abastecimento
-- ---------------------------------------------------------------------
alter table public.abastecimentos add column foto_painel_path text;

-- ---------------------------------------------------------------------
-- Triggers padrão, RLS (só gestor; motorista sem acesso) e configurações
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['planos_manutencao', 'manutencoes', 'multas'] loop
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
    execute format('create trigger trg_%1$s_auditoria after insert or update or delete on public.%1$s
                    for each row execute function public.registrar_auditoria()', t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('create policy gestor_total on public.%1$s for all to authenticated
                    using (public.is_gestor()) with check (public.is_gestor())', t);
  end loop;
end $$;

alter table public.manutencao_itens enable row level security;
create policy gestor_total on public.manutencao_itens for all to authenticated
  using (public.is_gestor()) with check (public.is_gestor());

insert into public.configuracoes (chave, valor, descricao) values
  ('manutencao_aviso_km',        '1000', 'Avisar manutenção quando faltar até este km'),
  ('manutencao_aviso_dias',      '15',   'Avisar manutenção quando faltar até estes dias'),
  ('multa_prazo_indicacao_dias', '30',   'Prazo para indicar o condutor, contado da notificação')
on conflict (chave) do nothing;
