-- Teste S4-8: criar acerto, transições e bloqueio dos itens (docs/04 §7, docs/05).

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'admin@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'Admin', 'admin', null),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l) values ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300);

-- dentro do período (setembro) e fora dele (outubro)
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, km_chegada, data_saida, data_chegada, status) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000, 1580, '2026-09-10 10:00-03', '2026-09-11 18:00-03', 'concluida'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1580, 2160, '2026-10-02 10:00-03', '2026-10-03 18:00-03', 'concluida');
insert into public.fretes (viagem_id, sentido, valor_frete_centavos) values ('bbbbbbbb-0000-0000-0000-000000000001', 'volta', 450000);
insert into public.abastecimentos (id, caminhao_id, motorista_id, km, litros, valor_total_centavos, data_hora) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1300, 100, 60000, '2026-09-30 23:30-03');
insert into public.adiantamentos (id, motorista_id, data, valor_centavos) values
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-09-15', 50000);

-- ===== Como admin =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok($$select public.criar_acerto('aaaaaaaa-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30')$$, 'admin cria acerto de setembro');
select is((select count(*) from public.viagens where acerto_id is not null)::int, 1, 'só a viagem de setembro entra');
select isnt((select acerto_id from public.abastecimentos where id = 'eeeeeeee-0000-0000-0000-000000000001'), null,
            'abastecimento de 30/09 23:30 (Brasília) entra no período');
select isnt((select acerto_id from public.adiantamentos where id = 'ffffffff-0000-0000-0000-000000000001'), null, 'adiantamento entra');

select throws_ok(
  $$update public.acertos set status = 'fechado' where motorista_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'P0001', null, 'fechar sem regra_snapshot é recusado');
select lives_ok(
  $$update public.acertos set status = 'fechado', regra_snapshot = '{}'::jsonb, total_comissao_centavos = 15000, saldo_centavos = -35000
     where motorista_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'admin fecha o acerto');
select throws_ok(
  $$update public.viagens set km_chegada = 1600 where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'P0001', null, 'viagem acertada não pode ser alterada');
select throws_ok(
  $$update public.fretes set valor_frete_centavos = 1 where viagem_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'P0001', null, 'frete de viagem acertada não pode ser alterado');
select throws_ok(
  $$delete from public.adiantamentos where id = 'ffffffff-0000-0000-0000-000000000001'$$,
  'P0001', null, 'adiantamento acertado não pode ser apagado');
select throws_ok(
  $$update public.acertos set status = 'rascunho' where motorista_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'P0001', null, 'admin NÃO reabre acerto');

-- ===== Motorista vê o próprio acerto fechado =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.acertos)::int, 1, 'motorista vê o próprio acerto fechado');
select throws_ok($$select public.criar_acerto('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-01', '2026-10-31')$$,
  '42501', null, 'motorista não cria acerto');

-- ===== Dono reabre e exclui o rascunho =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$update public.acertos set status = 'rascunho' where motorista_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'dono reabre o acerto');
delete from public.acertos where motorista_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*) from public.viagens where acerto_id is not null)::int, 0, 'excluir o rascunho desvincula os itens');

select * from finish();
rollback;
