-- Teste: gestão remove viagem com motivo; motorista não; viagem em acerto não sai;
-- abastecimentos ficam sem viagem ou saem junto, conforme pedido.

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300);
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, km_chegada, data_chegada, status) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000, 1580, now(), 'concluida'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1580, 2160, now(), 'concluida');
insert into public.abastecimentos (id, viagem_id, caminhao_id, motorista_id, km, litros, valor_total_centavos, tanque_cheio, forma_pagamento) values
  ('ffffffff-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1300, 100, 60000, true, 'faturado'),
  ('ffffffff-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1900, 100, 60000, true, 'faturado');

-- ===== Motorista não remove =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$select public.remover_viagem('bbbbbbbb-0000-0000-0000-000000000001', 'teste')$$,
  '42501', null, 'motorista não remove viagem');

-- ===== Dono =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok($$select public.remover_viagem('bbbbbbbb-0000-0000-0000-000000000001', ' ')$$,
  'P0001', 'Escreva o motivo da remoção.', 'motivo é obrigatório');
select lives_ok($$select public.remover_viagem('bbbbbbbb-0000-0000-0000-000000000001', 'Viagem de teste')$$,
  'dono remove com motivo');
select is((select count(*) from public.viagens where id = 'bbbbbbbb-0000-0000-0000-000000000001')::int, 0, 'viagem saiu');
select is((select viagem_id from public.abastecimentos where id = 'ffffffff-0000-0000-0000-000000000001'), null::uuid,
  'abastecimento fica, sem viagem');
select is((select depois->>'motivo' from public.auditoria where registro_id = 'bbbbbbbb-0000-0000-0000-000000000001' and acao = 'REMOVEU'),
  'Viagem de teste', 'motivo registrado na auditoria');

select lives_ok($$select public.remover_viagem('bbbbbbbb-0000-0000-0000-000000000002', 'Criada errada', true)$$,
  'remove apagando os lançamentos');
select is((select count(*) from public.abastecimentos where id = 'ffffffff-0000-0000-0000-000000000002')::int, 0,
  'abastecimento da viagem saiu junto');

-- viagem em acerto não sai
reset role;
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, km_chegada, data_chegada, status) values
  ('bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 2160, 2740, now(), 'concluida');
insert into public.acertos (id, motorista_id, periodo_inicio, periodo_fim) values
  ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', current_date - 7, current_date);
update public.viagens set acerto_id = '99999999-0000-0000-0000-000000000001' where id = 'bbbbbbbb-0000-0000-0000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok($$select public.remover_viagem('bbbbbbbb-0000-0000-0000-000000000003', 'teste')$$,
  'P0001', null, 'viagem em acerto não sai');
select is((select count(*) from public.viagens where id = 'bbbbbbbb-0000-0000-0000-000000000003')::int, 1, 'continua lá');

select * from finish();
rollback;
