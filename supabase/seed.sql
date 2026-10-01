-- Seed de desenvolvimento (projeto gestao-frota-dev). NUNCA rodar em produção.
-- As configurações padrão ficam na migration 20260926000001_configuracoes_padrao.sql.
-- Usuários de login NÃO são criados aqui: use `npm run dev:users`
-- (script em scripts/criar-usuarios-dev.ts, via auth.admin.createUser).

-- Dados fictícios
insert into public.caminhoes (id, placa, apelido, marca, modelo, ano, eixos, configuracao_eixos, capacidade_tanque_l, km_atual) values
  ('00000000-0000-0000-0000-0000000000c1', 'ABC1D23', 'Caminhão 1', 'Marca X', 'Modelo Y', 2015, 3, 'truck', 300, 480000),
  ('00000000-0000-0000-0000-0000000000c2', 'DEF4G56', 'Caminhão 2', 'Marca X', 'Modelo Y', 2018, 3, 'truck', 300, 350000),
  ('00000000-0000-0000-0000-0000000000c3', 'GHI7J89', 'Caminhão 3', 'Marca Z', 'Modelo W', 2012, 2, 'toco',  275, 610000);

insert into public.funcionarios (id, nome, cpf, cargo, data_admissao, salario_base_centavos, cnh_categoria) values
  ('00000000-0000-0000-0000-0000000000f1', 'Motorista Teste 1', '00000000191', 'motorista', '2024-01-10', 180000, 'E'),
  ('00000000-0000-0000-0000-0000000000f2', 'Motorista Teste 2', '00000000272', 'motorista', '2024-03-01', 180000, 'E'),
  ('00000000-0000-0000-0000-0000000000f3', 'Motorista Teste 3', '00000000353', 'motorista', '2025-02-15', 180000, 'D');

insert into public.clientes (id, razao_social, cnpj, prazo_pagamento_dias) values
  ('00000000-0000-0000-0000-0000000000a1', 'Cliente Exemplo Ltda', '11222333000181', 30);

insert into public.regras_comissao (funcionario_id, tipo, percentual, vigencia_inicio) values
  ('00000000-0000-0000-0000-0000000000f1', 'pct_frete_bruto', 12.00, '2024-01-01'),
  ('00000000-0000-0000-0000-0000000000f2', 'pct_frete_bruto', 12.00, '2024-01-01'),
  ('00000000-0000-0000-0000-0000000000f3', 'pct_frete_bruto', 12.00, '2025-01-01');

insert into public.documentos (tipo, entidade, caminhao_id, vencimento) values
  ('cronotacografo', 'caminhao', '00000000-0000-0000-0000-0000000000c1', current_date + 10),
  ('seguro',         'caminhao', '00000000-0000-0000-0000-0000000000c2', current_date + 45);
insert into public.documentos (tipo, entidade, funcionario_id, vencimento) values
  ('toxicologico', 'funcionario', '00000000-0000-0000-0000-0000000000f1', current_date - 3);
