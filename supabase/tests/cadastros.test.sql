-- Teste S1-6: clientes e fornecedores (matriz de permissões, docs/05) e CNPJ alfanumérico.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'm1@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'admin@teste.local');

insert into public.funcionarios (id, nome, cpf) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'M1', '11111111111');

insert into public.profiles (id, nome, papel, funcionario_id) values
  ('11111111-1111-1111-1111-111111111111', 'M1', 'motorista', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'Admin', 'admin', null);

-- ===== Como admin =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$insert into public.clientes (razao_social, cnpj) values ('Cliente Alfa', '12ABC34501DE35')$$,
  'admin cadastra cliente com CNPJ alfanumérico');
select lives_ok(
  $$insert into public.fornecedores (nome, cnpj, tipo) values ('Posto Teste', '11444777000161', 'posto')$$,
  'admin cadastra fornecedor com CNPJ numérico');
select throws_ok(
  $$insert into public.fornecedores (nome, cnpj) values ('Posto Ruim', '12abc34501de35')$$,
  '23514', null, 'CNPJ com minúsculas é recusado (o app normaliza antes)');
select throws_ok(
  $$insert into public.fornecedores (nome, cnpj) values ('Posto Ruim', '12ABC34501DEAB')$$,
  '23514', null, 'CNPJ com DV não numérico é recusado');
select lives_ok(
  $$update public.fornecedores set ativo = false where cnpj = '11444777000161'$$,
  'admin desativa fornecedor');

-- ===== Como motorista =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.clientes where cnpj = '12ABC34501DE35')::int, 0, 'motorista não vê clientes');
select is((select count(*) from public.fornecedores where cnpj = '11444777000161')::int, 1, 'motorista lê fornecedores');
select throws_ok(
  $$insert into public.fornecedores (nome, tipo) values ('Posto do Motorista', 'posto')$$,
  '42501', null, 'motorista não cadastra fornecedor');

update public.fornecedores set nome = 'alterado' where cnpj = '11444777000161';
reset role;
select is((select nome from public.fornecedores where cnpj = '11444777000161'), 'Posto Teste',
          'motorista não altera fornecedor');

select * from finish();
rollback;
