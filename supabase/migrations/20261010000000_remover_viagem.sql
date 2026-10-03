-- Remover viagem com motivo (pedido de 2026-10-03): ex.: viagem de teste, criada errada,
-- duplicada. Só gestão. O motivo e a viagem como estava ficam na auditoria (acao REMOVEU),
-- além do DELETE que o trigger já registra. Fretes e cobranças de pedágio saem junto
-- (cascade). Abastecimentos e despesas da viagem: apagados junto, se pedido; senão ficam
-- sem viagem (continuam no diesel do mês). Viagem em acerto não sai: tire do acerto antes.

create function public.remover_viagem(p_viagem uuid, p_motivo text, p_apagar_lancamentos boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.viagens;
begin
  if not public.is_gestor() then
    raise exception 'Só dono ou administração pode remover viagem.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Escreva o motivo da remoção.';
  end if;

  select * into v from public.viagens where id = p_viagem for update;
  if not found then
    raise exception 'Viagem não encontrada.';
  end if;
  if v.acerto_id is not null then
    raise exception 'Esta viagem está num acerto. Tire do acerto (ou reabra) antes de remover.';
  end if;

  insert into public.auditoria (tabela, registro_id, acao, usuario_id, antes, depois)
  values ('viagens', v.id, 'REMOVEU', auth.uid(), to_jsonb(v),
          jsonb_build_object('motivo', trim(p_motivo), 'apagou_lancamentos', p_apagar_lancamentos));

  if p_apagar_lancamentos then
    delete from public.abastecimentos where viagem_id = v.id;
    delete from public.despesas_viagem where viagem_id = v.id;
  end if;
  delete from public.viagens where id = v.id;
end $$;

revoke all on function public.remover_viagem(uuid, text, boolean) from public, anon;
grant execute on function public.remover_viagem(uuid, text, boolean) to authenticated;
