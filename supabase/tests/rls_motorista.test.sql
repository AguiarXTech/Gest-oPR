-- Teste de RLS: motorista só enxerga e altera o que é dele.
-- Rodar com: npm run db:test  (supabase test db)
-- Observação: a inserção em auth.users usa colunas mínimas; se a versão local
-- do Supabase exigir mais colunas, ajuste aqui (não altere as migrations).

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Usuários
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

insert into public.caminhoes (id, placa, capacidade_tanque_l) values
  ('cccccccc-0000-0000-0000-000000000001', 'TST1A11', 300),
  ('cccccccc-0000-0000-0000-000000000002', 'TST2B22', 300);

-- Viagem do M2 (criada como postgres)
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, km_saida)
values ('bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002',
        'aaaaaaaa-0000-0000-0000-000000000002', 'SJE', 'BH', 1000);
insert into public.fretes (viagem_id, sentido, valor_frete_centavos)
values ('bbbbbbbb-0000-0000-0000-000000000002', 'volta', 450000);

-- ===== Como motorista M1 =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.viagens)::int, 0, 'M1 não vê viagem do M2');
select is((select count(*) from public.funcionarios)::int, 1, 'M1 vê só o próprio cadastro');
select is((select count(*) from public.clientes)::int, 0, 'Motorista não vê clientes');

-- M1 cria viagem tentando se passar por M2: trigger sobrescreve
insert into public.viagens (caminhao_id, motorista_id, origem, destino, km_saida)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'SJE', 'BH', 5000);

select is((select motorista_id from public.viagens limit 1),
          'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'motorista_id forçado para o próprio');
select is((select count(*) from public.fretes)::int, 0, 'motorista não vê fretes');

-- abastecimento com a mesma chave duas vezes
insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, nfce_chave)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 5200, 150, 90000,
        '31260911222333000181650010000012341000012345');
select throws_ok(
  $$insert into public.abastecimentos (caminhao_id, motorista_id, km, litros, valor_total_centavos, nfce_chave)
    values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 5300, 10, 6000,
            '31260911222333000181650010000012341000012345')$$,
  '23505', null, 'chave NFC-e duplicada é bloqueada');

-- motorista não consegue marcar como conferido
select throws_ok(
  $$update public.abastecimentos set conferido = true$$,
  'P0001', null, 'motorista não confere o próprio abastecimento');

-- ===== Como dono =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

-- conta só as viagens dos caminhões de teste (o seed tem as suas)
select is((select count(*) from public.viagens where caminhao_id in ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002'))::int,
          2, 'dono vê todas as viagens');
select ok((select count(*) from public.auditoria) > 0, 'auditoria registrou alterações');

select * from finish();
rollback;
