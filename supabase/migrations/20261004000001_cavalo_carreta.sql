-- Cavalo × carreta (pedido de 2026-10-03), parte 2.
-- O cavalo e a carreta têm placas próprias, e o mesmo cavalo puxa carretas diferentes.
-- `caminhoes` continua sendo o veículo com motor (truck ou cavalo); a carreta é um
-- cadastro à parte, escolhido em cada viagem. O truck segue sendo uma coisa só.

alter table public.caminhoes add column tipo public.tipo_veiculo not null default 'truck';

create table public.carretas (
  id               uuid primary key default gen_random_uuid(),
  placa            text not null unique check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  apelido          text,
  tipo             text,                 -- ex.: 'carreta 3 eixos', 'bitrem', 'graneleira'
  eixos            smallint check (eixos between 1 and 9),
  eixos_suspensos  smallint not null default 0 check (eixos_suspensos >= 0),
  ativo            boolean not null default true,
  foto_path        text,
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint suspensos_menor_que_eixos check (eixos is null or eixos_suspensos < eixos)
);

-- Qual carreta foi na viagem (null = truck, ou cavalo rodando sem carreta)
alter table public.viagens add column carreta_id uuid references public.carretas(id);
create unique index viagem_em_andamento_por_carreta on public.viagens (carreta_id)
  where status = 'em_andamento' and carreta_id is not null;

-- Documentos da carreta (CRLV, licenciamento, seguro...)
alter table public.documentos add column carreta_id uuid references public.carretas(id);
alter table public.documentos drop constraint entidade_consistente;
alter table public.documentos add constraint entidade_consistente check (
  (entidade = 'empresa'     and caminhao_id is null and funcionario_id is null and carreta_id is null) or
  (entidade = 'caminhao'    and caminhao_id is not null and funcionario_id is null and carreta_id is null) or
  (entidade = 'funcionario' and funcionario_id is not null and caminhao_id is null and carreta_id is null) or
  (entidade = 'carreta'     and carreta_id is not null and caminhao_id is null and funcionario_id is null)
);

drop view public.vw_documentos_status;
create view public.vw_documentos_status
with (security_invoker = true) as
select distinct on (d.entidade, d.tipo, coalesce(d.caminhao_id, d.funcionario_id, d.carreta_id))
  d.*,
  (d.vencimento - (now() at time zone 'America/Sao_Paulo')::date) as dias_para_vencer
from public.documentos d
order by d.entidade, d.tipo, coalesce(d.caminhao_id, d.funcionario_id, d.carreta_id), d.vencimento desc;

-- Triggers padrão e RLS: gestão total; leitura para usuário ativo (o motorista escolhe a carreta)
create trigger trg_carretas_updated_at before update on public.carretas
for each row execute function public.set_updated_at();
create trigger trg_carretas_auditoria after insert or update or delete on public.carretas
for each row execute function public.registrar_auditoria();

alter table public.carretas enable row level security;
create policy gestor_total on public.carretas for all to authenticated
  using (public.is_gestor()) with check (public.is_gestor());
create policy leitura_autenticado on public.carretas for select to authenticated
  using (public.papel_atual() is not null);

-- Fotos: carretas em comprovantes/carretas/{id}/..., mesma leitura das fotos dos caminhões
drop policy fotos_caminhoes_select on storage.objects;
create policy fotos_caminhoes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] in ('caminhoes', 'carretas')
    and public.papel_atual() is not null
  );
