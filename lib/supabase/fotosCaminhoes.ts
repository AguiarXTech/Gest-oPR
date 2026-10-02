import { BUCKET_COMPROVANTES } from '@/lib/domain/comprovante';
import type { createClient } from '@/lib/supabase/server';

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** URLs assinadas (10 min) das fotos dos caminhões, por id do caminhão. Uma chamada só. */
export async function urlsFotosCaminhoes(supabase: Cliente, caminhoes: readonly { id: string; foto_path: string | null }[]) {
  const comFoto = caminhoes.filter((c): c is { id: string; foto_path: string } => Boolean(c.foto_path));
  const urls = new Map<string, string>();
  if (comFoto.length === 0) return urls;
  const { data } = await supabase.storage.from(BUCKET_COMPROVANTES).createSignedUrls(
    comFoto.map((c) => c.foto_path),
    600,
  );
  comFoto.forEach((c, i) => {
    const url = data?.[i]?.signedUrl;
    if (url) urls.set(c.id, url);
  });
  return urls;
}
