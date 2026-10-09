// Lê a planilha do relatório de abastecimento (Google Sheets exportado como CSV).
// Cache de 60 s com a tag abaixo: a página se atualiza sozinha a cada minuto e, quando a
// planilha avisa (gatilho do Apps Script → /api/relatorio/atualizar), na hora.
import 'server-only';
import {
  lerPlanilhaAbastecimentos,
  type LinhaAbastecimento,
} from '@/lib/domain/relatorioAbastecimento';

export const TAG_PLANILHA = 'planilha-abastecimentos';

export type LeituraPlanilha =
  | { estado: 'ok'; linhas: LinhaAbastecimento[]; ignoradas: number; lidaEm: string }
  | { estado: 'sem_configuracao' }
  | { estado: 'erro'; mensagem: string };

export async function lerPlanilhaRelatorio(): Promise<LeituraPlanilha> {
  const url = process.env.RELATORIO_PLANILHA_CSV_URL;
  if (!url) return { estado: 'sem_configuracao' };
  try {
    const resposta = await fetch(url, { next: { revalidate: 60, tags: [TAG_PLANILHA] } });
    if (!resposta.ok)
      return { estado: 'erro', mensagem: `A planilha respondeu ${resposta.status}.` };
    const { linhas, ignoradas } = lerPlanilhaAbastecimentos(await resposta.text());
    // a data da resposta do Google é a hora em que a planilha foi lida (fica no cache junto)
    const lidaEm = new Date(resposta.headers.get('date') ?? Date.now()).toISOString();
    return { estado: 'ok', linhas, ignoradas, lidaEm };
  } catch {
    return {
      estado: 'erro',
      mensagem: 'Não foi possível ler a planilha. Verifique a internet ou o link.',
    };
  }
}
