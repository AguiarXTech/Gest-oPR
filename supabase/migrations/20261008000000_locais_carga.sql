-- Locais de carga do cliente (pedido de 2026-10-03): onde o caminhão busca a carga
-- (ex.: Cimento Liz), com o endereço. Ficam no cadastro do cliente; o motorista escolhe
-- o local ao iniciar a viagem. Sem valores: o motorista pode ler (só nome e endereço).

create table public.locais_carga (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  nome        text not null check (length(trim(nome)) >= 2),
  endereco    text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_locais_carga_updated_at before update on public.locais_carga
for each row execute function public.set_updated_at();
create trigger trg_locais_carga_auditoria after insert or update or delete on public.locais_carga
for each row execute function public.registrar_auditoria();

alter table public.locais_carga enable row level security;
create policy gestor_total on public.locais_carga for all to authenticated
  using (public.is_gestor()) with check (public.is_gestor());
create policy leitura_autenticado on public.locais_carga for select to authenticated
  using (public.papel_atual() is not null);

-- Onde a viagem carrega (null = não informado)
alter table public.viagens add column local_carga_id uuid references public.locais_carga(id);
