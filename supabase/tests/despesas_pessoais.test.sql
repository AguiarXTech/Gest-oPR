-- Teste: despesas pessoais são só do próprio motorista (nem o gestor vê);
-- dono que também é motorista usa a área do motorista; foto do caminhão.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'm2@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'M2', '22222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Dono', '33333333333');
-- o dono também é funcionário (motorista da própria empresa)
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'M2', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', 'aaaaaaaa-0000-0000-0000-000000000003');
insert into public.caminhoes (id, placa, capacidade_tanque_l) values ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300);

-- ===== M1 =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$insert into public.despesas_pessoais (funcionario_id, categoria, valor_centavos)
    values ('aaaaaaaa-0000-0000-0000-000000000002', 'alimentacao', 3500)$$,
  'M1 lança despesa pessoal (mesmo tentando em nome do M2)');
select is((select funcionario_id from public.despesas_pessoais limit 1), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
          'o dono do registro é forçado para o M1');

-- ===== M2 =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.despesas_pessoais)::int, 0, 'M2 não vê as despesas pessoais do M1');

-- ===== Dono =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is((select count(*) from public.despesas_pessoais)::int, 0, 'nem o dono vê as despesas pessoais dos motoristas');
select lives_ok(
  $$insert into public.despesas_pessoais (funcionario_id, categoria, valor_centavos) values (null, 'pernoite', 8000)$$,
  'dono que é motorista lança a própria despesa pessoal');
select is((select count(*) from public.despesas_pessoais)::int, 1, 'e vê só a dele');
select is(public.funcionario_atual(), 'aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'dono-motorista tem funcionário vinculado');
select lives_ok(
  $$insert into public.viagens (caminhao_id, motorista_id, origem, destino, km_saida)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'SJE', 'BH', 1000)$$,
  'dono-motorista inicia a própria viagem');
select lives_ok(
  $$update public.caminhoes set foto_path = 'caminhoes/cccccccc-0000-0000-0000-000000000001/x.jpg'
    where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'gestor grava a foto do caminhão');

select * from finish();
rollback;
