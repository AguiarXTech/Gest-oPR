-- Teste S1-5: funcionário desativado não lê nada; perfil acompanha nome e ativo.

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

insert into public.viagens (caminhao_id, motorista_id, origem, destino, km_saida)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 1000);

-- ===== Dono renomeia e desativa o funcionário =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

update public.funcionarios set nome = 'M1 Silva' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select nome from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
          'M1 Silva', 'nome do perfil acompanha o cadastro');

update public.funcionarios set ativo = false where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select ativo from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
          false, 'perfil desativado junto com o funcionário');

-- ===== Como o motorista desativado =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(public.papel_atual(), null, 'desativado fica sem papel');
select is((select count(*) from public.viagens)::int, 0, 'desativado não vê as próprias viagens');
select is((select count(*) from public.funcionarios)::int, 0, 'desativado não vê o próprio cadastro');
select is((select count(*) from public.caminhoes)::int, 0, 'desativado não vê caminhões');
select is((select count(*) from public.configuracoes)::int, 0, 'desativado não vê configurações');
select throws_ok(
  $$insert into public.viagens (caminhao_id, motorista_id, origem, destino, km_saida)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'SJE', 'BH', 2000)$$,
  '42501', null, 'desativado não cria viagem');

-- ===== Dono reativa =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
update public.funcionarios set ativo = true where id = 'aaaaaaaa-0000-0000-0000-000000000001';

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(public.papel_atual(), 'motorista'::public.papel_usuario, 'reativado volta a ter papel');
select is((select count(*) from public.viagens)::int, 1, 'reativado volta a ver a própria viagem');

select * from finish();
rollback;
