-- Carreta: marca e ano (pedido de 2026-10-03), para identificar no pátio e nos documentos.

alter table public.carretas
  add column marca text,
  add column ano   smallint check (ano between 1950 and 2100);
