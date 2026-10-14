-- Teste: o motorista informa se a ida vai carregada ou vazia; a gestão pode corrigir.

begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'dono@teste.local');
insert into public.funcionarios (id, nome, cpf) values ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');
insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Dono', 'dono', null);
insert into public.caminhoes (id, placa, capacidade_tanque_l, eixos, eixos_suspensos) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300, 3, 1);

-- ===== Motorista =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida, ida_carregada)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000, false)$$,
  'motorista inicia a viagem dizendo que a ida vai vazia');
select is((select ida_carregada from public.viagens where id = 'bbbbbbbb-0000-0000-0000-000000000001'), false,
  'a resposta fica gravada (não é apagada pelo trigger)');
select lives_ok($$update public.viagens set ida_carregada = true where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'motorista corrige a resposta durante a viagem');

-- ===== Dono =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok($$update public.viagens set ida_carregada = false where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'gestão corrige se a ida foi carregada ou vazia');

select * from finish();
rollback;
