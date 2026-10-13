-- Teste: quem pagou e baixa do reembolso ao motorista (pedido de 2026-10-13).
-- Motorista lança manutenção que pagou; não consegue dar baixa; dono dá e desfaz baixa;
-- empresa pagou não aceita baixa; despesa em acerto fechado não aceita baixa;
-- manutenção da gestão paga por motorista também aceita baixa.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l, km_atual) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300, 1000);

-- ===== Motorista =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$insert into public.despesas_viagem (id, motorista_id, caminhao_id, tipo, valor_centavos, reembolsavel, pago_pelo_motorista)
    values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'manutencao', 11550, true, true),
           ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'manutencao', 90000, false, false)$$,
  'motorista lança manutenção que pagou e uma que a empresa pagou');
select is(
  (select reembolsado_em from public.despesas_viagem where id = 'dddddddd-0000-0000-0000-000000000001'), null::timestamptz,
  'despesa nasce sem baixa');
select throws_ok(
  $$update public.despesas_viagem set reembolsado_em = now() where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'P0001', 'Só a gestão dá baixa no reembolso.', 'motorista não dá baixa direto na tabela');
select throws_ok(
  $$select public.dar_baixa_reembolso('despesa', 'dddddddd-0000-0000-0000-000000000001')$$,
  '42501', null, 'motorista não usa a função de baixa');

-- ===== Dono =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$select public.dar_baixa_reembolso('despesa', 'dddddddd-0000-0000-0000-000000000001')$$,
  'dono dá baixa: pagou ao motorista');
select results_eq(
  $$select reembolsado_em is not null, reembolsado_por from public.despesas_viagem where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  $$values (true, '33333333-3333-3333-3333-333333333333'::uuid)$$,
  'baixa registra quando e quem');
select throws_ok(
  $$select public.dar_baixa_reembolso('despesa', 'dddddddd-0000-0000-0000-000000000001')$$,
  'P0001', null, 'não dá baixa duas vezes');
select lives_ok(
  $$select public.dar_baixa_reembolso('despesa', 'dddddddd-0000-0000-0000-000000000001', true)$$,
  'desfaz baixa marcada por engano');
select throws_ok(
  $$select public.dar_baixa_reembolso('despesa', 'dddddddd-0000-0000-0000-000000000002')$$,
  'P0001', null, 'empresa pagou: nada para dar baixa');

-- manutenção lançada pela gestão, paga pelo motorista
select lives_ok(
  $$insert into public.manutencoes (id, caminhao_id, km, descricao, valor_centavos, pago_por_funcionario_id)
    values ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 1000, 'Troca de óleo', 45000, 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'gestão lança manutenção que o motorista pagou');
select lives_ok(
  $$select public.dar_baixa_reembolso('manutencao', 'eeeeeeee-0000-0000-0000-000000000001')$$,
  'baixa na manutenção paga pelo motorista');

-- despesa já em acerto fechado: pagou no acerto, não aceita baixa
reset role;
insert into public.acertos (id, motorista_id, periodo_inicio, periodo_fim, status)
values ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 7, current_date, 'fechado');
update public.despesas_viagem set acerto_id = '99999999-0000-0000-0000-000000000001'
 where id = 'dddddddd-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok(
  $$select public.dar_baixa_reembolso('despesa', 'dddddddd-0000-0000-0000-000000000001')$$,
  'P0001', null, 'despesa em acerto fechado não aceita baixa (já paga no acerto)');

select * from finish();
rollback;
