// Abre o anexo de um documento: confere o gestor e redireciona para a URL assinada (10 min).
// GET /g/documentos/anexo?id=<documento>
import type { NextRequest } from 'next/server';
import { BUCKET_COMPROVANTES } from '@/lib/domain/comprovante';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const id = request.nextUrl.searchParams.get('id') ?? '';
  // RLS: gestor lê todos; motorista só os próprios documentos
  const { data: doc } = await supabase.from('documentos').select('arquivo_path').eq('id', id).maybeSingle();
  if (!doc?.arquivo_path) return new Response('Anexo não encontrado.', { status: 404 });

  const { data } = await supabase.storage.from(BUCKET_COMPROVANTES).createSignedUrl(doc.arquivo_path, 600);
  if (!data) return new Response('Não foi possível abrir o anexo.', { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
