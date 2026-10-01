-- S1-6: CNPJ alfanumérico (Receita Federal, emitido a partir de 07/2026).
-- Formato: 12 caracteres [0-9A-Z] + 2 dígitos verificadores numéricos.
-- CNPJs só numéricos continuam válidos. O DV é conferido no app (lib/domain/cnpj.ts).

alter table public.clientes drop constraint clientes_cnpj_check;
alter table public.clientes add constraint clientes_cnpj_check
  check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$');

alter table public.fornecedores drop constraint fornecedores_cnpj_check;
alter table public.fornecedores add constraint fornecedores_cnpj_check
  check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$');
