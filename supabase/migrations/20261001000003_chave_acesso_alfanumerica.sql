-- S2-1: chave de acesso (NFC-e, NF-e, CT-e, MDF-e) com CNPJ alfanumérico (NT 2025.001).
-- Formato: 6 dígitos (cUF + AAMM) + 14 caracteres [0-9A-Z] (CNPJ do emitente) + 24 dígitos.
-- Chaves só numéricas continuam válidas. O DV é conferido no app (lib/domain/nfce.ts).

alter table public.abastecimentos drop constraint abastecimentos_nfce_chave_check;
alter table public.abastecimentos add constraint abastecimentos_nfce_chave_check
  check (nfce_chave ~ '^[0-9]{6}[0-9A-Z]{14}[0-9]{24}$');

alter table public.fretes drop constraint fretes_cte_chave_check;
alter table public.fretes add constraint fretes_cte_chave_check
  check (cte_chave ~ '^[0-9]{6}[0-9A-Z]{14}[0-9]{24}$');

alter table public.fretes drop constraint fretes_mdfe_chave_check;
alter table public.fretes add constraint fretes_mdfe_chave_check
  check (mdfe_chave ~ '^[0-9]{6}[0-9A-Z]{14}[0-9]{24}$');
