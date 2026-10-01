// Exibe a foto de um comprovante para o gestor (S2-3): bucket privado, URL assinada de 10 min.
import { ImageOff } from 'lucide-react';
import { BUCKET_COMPROVANTES } from '@/lib/domain/comprovante';
import { createClient } from '@/lib/supabase/server';

export async function VerComprovante({ caminho, alt }: { caminho: string | null; alt: string }) {
  if (!caminho) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
        <ImageOff className="size-5" aria-hidden /> Sem foto
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET_COMPROVANTES).createSignedUrl(caminho, 600);
  if (!data) return <p className="text-destructive">Não foi possível abrir a foto.</p>;

  return (
    <a href={data.signedUrl} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
      <img src={data.signedUrl} alt={alt} className="max-h-96 w-full rounded-xl border bg-muted object-contain" />
      <span className="mt-1 block text-sm text-muted-foreground">Toque para abrir em tamanho real</span>
    </a>
  );
}
