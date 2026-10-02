-- Pedido de 2026-10-02:
-- 1) Despesas pessoais do motorista (uso opcional, controle dele): alimentação, pernoite etc.
--    que a empresa NÃO reembolsa (Q5). São da vida pessoal: só o próprio motorista vê —
--    nem a gestão (LGPD, acesso mínimo). Não entram no acerto nem no resultado.
-- 2) Foto de cada caminhão no Storage, visível para qualquer usuário ativo.

create table public.despesas_pessoais (
  id              uuid primary key default gen_random_uuid(),
  funcionario_id  uuid not null references public.funcionarios(id),
  data            date not null default current_date,
  categoria       text not null check (categoria in ('alimentacao', 'pernoite', 'higiene', 'saude', 'outros')),
  valor_centavos  bigint not null check (valor_centavos > 0),
  descricao       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index despesas_pessoais_funcionario_data on public.despesas_pessoais (funcionario_id, data);

-- O dono do registro é sempre quem está logado (não dá para lançar em nome de outro)
create or replace function public.forcar_dono_despesa_pessoal()
returns trigger language plpgsql as $$
begin
  new.funcionario_id := public.funcionario_atual();
  if new.funcionario_id is null then
    raise exception 'Só quem tem cadastro de funcionário usa as despesas pessoais.';
  end if;
  return new;
end $$;

create trigger trg_despesas_pessoais_dono
before insert or update on public.despesas_pessoais
for each row execute function public.forcar_dono_despesa_pessoal();

create trigger trg_despesas_pessoais_updated_at before update on public.despesas_pessoais
for each row execute function public.set_updated_at();

alter table public.despesas_pessoais enable row level security;
-- Só o próprio (sem policy de gestor, de propósito)
create policy proprio_total on public.despesas_pessoais for all to authenticated
  using (funcionario_id = public.funcionario_atual())
  with check (funcionario_id = public.funcionario_atual());

-- ---------------------------------------------------------------------
-- Foto do caminhão: caminho comprovantes/caminhoes/{caminhao_id}/{uuid}.jpg
-- (o gestor já pode enviar em qualquer pasta; aqui só se libera a leitura)
-- ---------------------------------------------------------------------
alter table public.caminhoes add column foto_path text;

create policy fotos_caminhoes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = 'caminhoes'
    and public.papel_atual() is not null
  );
