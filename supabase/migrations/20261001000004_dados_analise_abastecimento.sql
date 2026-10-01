-- S2-5: dados para calcular km/L e anomalias logo depois de salvar um abastecimento
-- (docs/04 §4 e §5). O motorista só lê os PRÓPRIOS abastecimentos (RLS), mas a
-- medição depende do tanque cheio anterior do caminhão, que pode ser de outro motorista.
-- A função devolve só números operacionais (sem motorista, foto, nota ou posto) e
-- exige usuário ativo (papel_atual() não nulo).

create or replace function public.dados_analise_abastecimento(p_caminhao_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.papel_atual() is null then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'capacidade_tanque_l',
      (select capacidade_tanque_l from public.caminhoes where id = p_caminhao_id),
    -- últimos 60 abastecimentos do caminhão (bastam para a janela de consumo)
    'abastecimentos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'km', a.km, 'litros', a.litros,
               'tanque_cheio', a.tanque_cheio, 'data_hora', a.data_hora)
             order by a.km, a.data_hora)
        from (select id, km, litros, tanque_cheio, data_hora
                from public.abastecimentos
               where caminhao_id = p_caminhao_id
               order by km desc, data_hora desc
               limit 60) a), '[]'::jsonb),
    -- preço por litro (centavos) dos últimos 30 dias, de todos os caminhões
    'precos_litro_centavos', coalesce((
      select jsonb_agg(round(valor_total_centavos / litros))
        from public.abastecimentos
       where data_hora >= now() - interval '30 days'), '[]'::jsonb)
  );
end $$;

revoke all on function public.dados_analise_abastecimento(uuid) from public, anon;
grant execute on function public.dados_analise_abastecimento(uuid) to authenticated;
