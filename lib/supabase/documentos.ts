import { ORDEM_STATUS, statusDocumento, diasParaVencer } from '@/lib/domain/documentos';
import { hojeIso } from '@/lib/formatar';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * Situação atual: para cada (entidade, tipo, dono) vale o documento com o vencimento mais
 * recente (renovação = novo registro; o anterior fica como histórico, regras §9).
 */
export async function carregarSituacaoDocumentos(supabase: Cliente) {
  const [config, { data }] = await Promise.all([
    obterConfiguracoes(),
    supabase
      .from('documentos')
      .select('id, tipo, entidade, caminhao_id, funcionario_id, numero, emissao, vencimento, arquivo_path, observacoes, caminhoes(placa), funcionarios(nome)')
      .order('vencimento', { ascending: false }),
  ]);

  const hoje = hojeIso();
  const atuais = new Map<string, NonNullable<typeof data>[number]>();
  const historico: NonNullable<typeof data> = [];
  for (const d of data ?? []) {
    const chave = `${d.entidade}|${d.tipo}|${d.caminhao_id ?? d.funcionario_id ?? ''}`;
    if (atuais.has(chave)) historico.push(d);
    else atuais.set(chave, d);
  }

  const situacao = [...atuais.values()]
    .map((d) => ({
      ...d,
      status: statusDocumento(d.vencimento, hoje, config.alertaDocumentosDias),
      dias: diasParaVencer(d.vencimento, hoje),
    }))
    .sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || a.dias - b.dias);

  return { situacao, historico };
}
