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
  ('00000000-0000-0000-0000-0000000000f2', 'Motorista Teste 2', '00000000272', 'motorista', '2024-03-01', 195000, 'E'),
  ('00000000-0000-0000-0000-0000000000f3', 'Motorista Teste 3', '00000000353', 'motorista', '2025-02-15', 170000, 'D');

insert into public.clientes (id, razao_social, cnpj, prazo_pagamento_dias) values
  ('00000000-0000-0000-0000-0000000000a1', 'Cliente Exemplo Ltda', '11222333000181', 30);

-- Comissão: valor fixo por viagem (ciclo ida + volta), diferente por motorista (Q1). Valores fictícios.
insert into public.regras_comissao (funcionario_id, tipo, valor_centavos, vigencia_inicio) values
  ('00000000-0000-0000-0000-0000000000f1', 'valor_por_viagem', 15000, '2024-01-01'),
  ('00000000-0000-0000-0000-0000000000f2', 'valor_por_viagem', 16000, '2024-01-01'),
  ('00000000-0000-0000-0000-0000000000f3', 'valor_por_viagem', 14000, '2025-01-01');

-- Uma viagem concluída (ciclo SJE → BH → SJE) com o frete da volta, para as telas da gestão.
insert into public.viagens (id, caminhao_id, motorista_id, origem, destino, data_saida, data_chegada, km_saida, km_chegada, status) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1',
   'São João Evangelista - MG', 'Belo Horizonte - MG', now() - interval '3 days', now() - interval '1 day', 479420, 480000, 'concluida');
insert into public.fretes (viagem_id, sentido, cliente_id, valor_frete_centavos, peso_kg) values
  ('00000000-0000-0000-0000-0000000000b1', 'volta', '00000000-0000-0000-0000-0000000000a1', 450000, 14000);

insert into public.documentos (tipo, entidade, caminhao_id, vencimento) values
  ('cronotacografo', 'caminhao', '00000000-0000-0000-0000-0000000000c1', current_date + 10),
  ('seguro',         'caminhao', '00000000-0000-0000-0000-0000000000c2', current_date + 45);
insert into public.documentos (tipo, entidade, funcionario_id, vencimento) values
  ('toxicologico', 'funcionario', '00000000-0000-0000-0000-0000000000f1', current_date - 3);
