-- Teste: cavalo × carreta. Carreta com cadastro próprio, escolhida na viagem; uma carreta
-- não fica em duas viagens em andamento; documentos da carreta.

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'm2@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'M2', '22222222222');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'M2', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l, tipo, eixos) values
  ('cccccccc-0000-0000-0000-000000000001', 'CAV1A11', 500, 'cavalo', 2),
  ('cccccccc-0000-0000-0000-000000000002', 'CAV2B22', 500, 'cavalo', 3);

-- ===== Dono =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$insert into public.carretas (id, placa, composicao, carroceria, eixos, eixos_suspensos) values ('dddddddd-0000-0000-0000-000000000001', 'CAR1C11', 'carreta', 'Vanderléia', 3, 1)$$,
  'gestor cadastra a carreta com placa própria');
select throws_ok($$insert into public.carretas (placa, eixos, eixos_suspensos) values ('CAR9Z99', 2, 2)$$,
  '23514', null, 'eixos suspensos menores que os eixos');
select throws_ok($$insert into public.carretas (placa, composicao) values ('CAR7X77', 'treminhao')$$,
  '23514', null, 'composição só carreta, bitrem ou rodotrem');
select lives_ok(
  $$insert into public.documentos (tipo, entidade, carreta_id, vencimento) values ('crlv', 'carreta', 'dddddddd-0000-0000-0000-000000000001', '2027-03-31')$$,
  'documento da carreta');
select throws_ok(
  $$insert into public.documentos (tipo, entidade, carreta_id, caminhao_id, vencimento)
    values ('crlv', 'carreta', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', '2027-03-31')$$,
  '23514', null, 'documento da carreta não pode ser também do caminhão');

-- ===== M1 sai com o cavalo 1 + carreta 1 =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.carretas)::int, 1, 'motorista vê as carretas para escolher');
select lives_ok(
  $$insert into public.viagens (caminhao_id, carreta_id, motorista_id, origem, destino, km_saida)
    values ('cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000)$$,
  'motorista inicia viagem com cavalo + carreta');
select throws_ok($$insert into public.carretas (placa) values ('CAR8Y88')$$, '42501', null, 'motorista não cadastra carreta');

-- ===== M2 tenta a mesma carreta com outro cavalo =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$insert into public.viagens (caminhao_id, carreta_id, motorista_id, origem, destino, km_saida)
    values ('cccccccc-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'SJE', 'BH', 1000)$$,
  '23505', null, 'carreta já está em outra viagem em andamento');
select lives_ok(
  $$insert into public.viagens (caminhao_id, motorista_id, origem, destino, km_saida)
    values ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'SJE', 'BH', 1000)$$,
  'cavalo pode sair sem carreta');

select * from finish();
rollback;
