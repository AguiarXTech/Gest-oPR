// Automação do relatório de abastecimento: o gatilho da planilha (Apps Script, ao mudar
// a planilha) chama este endereço, e a próxima leitura da página já traz os dados novos.
// POST /api/relatorio/atualizar com o cabeçalho x-segredo = RELATORIO_SEGREDO.
import { revalidateTag } from 'next/cache';
import { TAG_PLANILHA } from '@/lib/relatorio/planilha';

export async function POST(request: Request) {
  const segredo = process.env.RELATORIO_SEGREDO;
  if (!segredo || request.headers.get('x-segredo') !== segredo) {
    return Response.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 });
  }
  // expire 0: a próxima leitura busca a planilha de novo, sem servir a versão antiga
  revalidateTag(TAG_PLANILHA, { expire: 0 });
  return Response.json({ ok: true, em: new Date().toISOString() });
}
