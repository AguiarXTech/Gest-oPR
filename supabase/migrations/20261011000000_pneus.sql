-- Gestão de pneus (RF-30, pedido de 2026-10-03) — docs/04 §14.
-- Estoque, montados (caminhão ou carreta, por posição), em recapagem e descartados.
-- Cada operação é uma função (tudo ou nada): o estado do pneu e a montagem andam juntos.
-- Km da montagem é calculado no app (lib/domain/pneus.ts): hodômetro no caminhão, soma
-- das viagens na carreta. Só gestão: custo de pneu é custo do caminhão (Q6).

create type public.status_pneu as enum ('estoque', 'montado', 'em_recapagem', 'descartado');
create type public.condicao_pneu as enum ('novo', 'usado');

create table public.pneus (
  id                     uuid primary key default gen_random_uuid(),
  marca_fogo             text not null unique check (length(trim(marca_fogo)) >= 1),
  marca                  text,
  modelo                 text,
  medida                 text,
  dot                    text,
  condicao_entrada       public.condicao_pneu not null default 'novo',
  vida                   smallint not null default 0 check (vida >= 0),  -- nº de recapagens
  status                 public.status_pneu not null default 'estoque',
  valor_compra_centavos  bigint check (valor_compra_centavos >= 0),
  data_compra            date,
  fornecedor_id          uuid references public.fornecedores(id),
  motivo_descarte        text,
  descartado_em          date,
  observacoes            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint descarte_com_motivo check (status <> 'descartado' or motivo_descarte is not null)
);

create table public.montagens_pneu (
  id           uuid primary key default gen_random_uuid(),
  pneu_id      uuid not null references public.pneus(id) on delete cascade,
  caminhao_id  uuid references public.caminhoes(id),
  carreta_id   uuid references public.carretas(id),
  posicao      text not null check (length(trim(posicao)) >= 1),
  vida         smallint not null,               -- vida do pneu nesta montagem
  montado_em   timestamptz not null default now(),
  km_montagem  integer check (km_montagem >= 0), -- hodômetro (só caminhão)
  retirado_em  timestamptz,
  km_retirada  integer check (km_retirada >= 0),
  km_rodado    integer check (km_rodado >= 0),
  constraint um_veiculo check ((caminhao_id is null) <> (carreta_id is null)),
  constraint retirada_com_km check (retirado_em is null or km_rodado is not null)
);
create unique index montagem_aberta_por_pneu on public.montagens_pneu (pneu_id) where retirado_em is null;
create unique index posicao_ocupada_caminhao on public.montagens_pneu (caminhao_id, posicao)
  where retirado_em is null and caminhao_id is not null;
create unique index posicao_ocupada_carreta on public.montagens_pneu (carreta_id, posicao)
  where retirado_em is null and carreta_id is not null;

create table public.recapagens_pneu (
  id               uuid primary key default gen_random_uuid(),
  pneu_id          uuid not null references public.pneus(id) on delete cascade,
  fornecedor_id    uuid references public.fornecedores(id),
  enviado_em       date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  retornou_em      date,
  custo_centavos   bigint check (custo_centavos >= 0),
  vida_resultante  smallint,
  observacoes      text
);
create unique index recapagem_aberta_por_pneu on public.recapagens_pneu (pneu_id) where retornou_em is null;

create trigger trg_pneus_updated_at before update on public.pneus
for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['pneus', 'montagens_pneu', 'recapagens_pneu'] loop
    execute format('create trigger trg_%1$s_auditoria after insert or update or delete on public.%1$s
                    for each row execute function public.registrar_auditoria()', t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('create policy gestor_total on public.%1$s for all to authenticated
                    using (public.is_gestor()) with check (public.is_gestor())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Operações (security invoker: a RLS de gestão vale; o motorista não chega aqui)
-- ---------------------------------------------------------------------
create function public.montar_pneu(
  p_pneu uuid, p_caminhao uuid, p_carreta uuid, p_posicao text, p_km_montagem integer default null)
returns void language plpgsql as $$
declare v public.pneus;
begin
  select * into v from public.pneus where id = p_pneu for update;
  if not found then raise exception 'Pneu não encontrado.'; end if;
  if v.status <> 'estoque' then raise exception 'Só dá para montar pneu que está no estoque.'; end if;
  if p_caminhao is not null and p_km_montagem is null then
    raise exception 'Informe o km do caminhão na montagem.';
  end if;
  insert into public.montagens_pneu (pneu_id, caminhao_id, carreta_id, posicao, vida, km_montagem)
  values (p_pneu, p_caminhao, p_carreta, trim(p_posicao), v.vida,
          case when p_caminhao is not null then p_km_montagem end);
  update public.pneus set status = 'montado' where id = p_pneu;
end $$;

-- destino: 'estoque', 'recapagem' ou 'descarte'
create function public.retirar_pneu(
  p_pneu uuid, p_km_rodado integer, p_km_retirada integer, p_destino text,
  p_fornecedor uuid default null, p_motivo text default null)
returns void language plpgsql as $$
declare m public.montagens_pneu;
begin
  select * into m from public.montagens_pneu where pneu_id = p_pneu and retirado_em is null for update;
  if not found then raise exception 'Este pneu não está montado.'; end if;
  if p_km_rodado is null or p_km_rodado < 0 then raise exception 'Km rodado inválido.'; end if;
  if p_destino = 'descarte' and length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escreva o motivo do descarte.';
  end if;

  update public.montagens_pneu
     set retirado_em = now(), km_rodado = p_km_rodado,
         km_retirada = case when m.caminhao_id is not null then p_km_retirada end
   where id = m.id;

  if p_destino = 'estoque' then
    update public.pneus set status = 'estoque' where id = p_pneu;
  elsif p_destino = 'recapagem' then
    insert into public.recapagens_pneu (pneu_id, fornecedor_id) values (p_pneu, p_fornecedor);
    update public.pneus set status = 'em_recapagem' where id = p_pneu;
  elsif p_destino = 'descarte' then
    update public.pneus
       set status = 'descartado', motivo_descarte = trim(p_motivo),
           descartado_em = (now() at time zone 'America/Sao_Paulo')::date
     where id = p_pneu;
  else
    raise exception 'Destino inválido.';
  end if;
end $$;

create function public.enviar_recapagem(p_pneu uuid, p_fornecedor uuid default null)
returns void language plpgsql as $$
declare v public.pneus;
begin
  select * into v from public.pneus where id = p_pneu for update;
  if not found then raise exception 'Pneu não encontrado.'; end if;
  if v.status <> 'estoque' then raise exception 'Só dá para mandar para recapagem pneu que está no estoque.'; end if;
  insert into public.recapagens_pneu (pneu_id, fornecedor_id) values (p_pneu, p_fornecedor);
  update public.pneus set status = 'em_recapagem' where id = p_pneu;
end $$;

create function public.retorno_recapagem(p_pneu uuid, p_custo_centavos bigint default null)
returns void language plpgsql as $$
declare v public.pneus; r public.recapagens_pneu;
begin
  select * into v from public.pneus where id = p_pneu for update;
  if not found or v.status <> 'em_recapagem' then raise exception 'Este pneu não está na recapagem.'; end if;
  select * into r from public.recapagens_pneu where pneu_id = p_pneu and retornou_em is null for update;
  update public.recapagens_pneu
     set retornou_em = (now() at time zone 'America/Sao_Paulo')::date,
         custo_centavos = p_custo_centavos, vida_resultante = v.vida + 1
   where id = r.id;
  update public.pneus set status = 'estoque', vida = v.vida + 1 where id = p_pneu;
end $$;

create function public.descartar_pneu(p_pneu uuid, p_motivo text)
returns void language plpgsql as $$
declare v public.pneus;
begin
  select * into v from public.pneus where id = p_pneu for update;
  if not found then raise exception 'Pneu não encontrado.'; end if;
  if v.status = 'montado' then raise exception 'Retire o pneu do veículo antes de descartar.'; end if;
  if v.status = 'descartado' then raise exception 'Este pneu já foi descartado.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escreva o motivo do descarte.'; end if;
  -- se estava na recapagem, fecha o envio sem vida nova
  update public.recapagens_pneu
     set retornou_em = (now() at time zone 'America/Sao_Paulo')::date, observacoes = 'Descartado na recapagem'
   where pneu_id = p_pneu and retornou_em is null;
  update public.pneus
     set status = 'descartado', motivo_descarte = trim(p_motivo),
         descartado_em = (now() at time zone 'America/Sao_Paulo')::date
   where id = p_pneu;
end $$;
