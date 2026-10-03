-- Documentos para o motorista (pedido de 2026-10-03): somente a própria CNH e os documentos
-- do cavalo e da carreta da viagem em andamento (para mostrar na fiscalização). Terminou a
-- viagem, os documentos do veículo saem da tela dele. Antes ele via todos os documentos
-- pessoais (inclusive as datas do toxicológico); agora só a CNH.

drop policy motorista_select on public.documentos;
create policy motorista_select on public.documentos for select to authenticated using (
  (entidade = 'funcionario' and tipo = 'cnh' and funcionario_id = public.funcionario_atual())
  or (entidade = 'caminhao' and caminhao_id in (
        select v.caminhao_id from public.viagens v
         where v.motorista_id = public.funcionario_atual() and v.status = 'em_andamento'))
  or (entidade = 'carreta' and carreta_id in (
        select v.carreta_id from public.viagens v
         where v.motorista_id = public.funcionario_atual() and v.status = 'em_andamento'))
);

-- Anexo (PDF/foto do CRLV, da CNH...): o motorista abre o arquivo do documento que ele pode
-- ver. A subconsulta respeita a RLS acima, então só passa o que está liberado para ele.
create policy documentos_anexo_motorista on storage.objects for select to authenticated using (
  bucket_id = 'comprovantes'
  and (storage.foldername(objects.name))[1] = 'documentos'
  and exists (select 1 from public.documentos d where d.arquivo_path = objects.name)
);
