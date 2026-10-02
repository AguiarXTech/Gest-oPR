'use client';

// Foto do caminhão (pedido de 2026-10-02): comprimida no celular e guardada em
// comprovantes/caminhoes/{id}/{uuid}.jpg; qualquer usuário ativo pode ver.
import { useMutation } from '@tanstack/react-query';
import { Camera, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BUCKET_COMPROVANTES } from '@/lib/domain/comprovante';
import { comprimir } from '@/lib/imagem';
import { createClient } from '@/lib/supabase/client';
import { gerarUuid } from '@/lib/uuid';

export function FotoCaminhao({ caminhaoId, url }: { caminhaoId: string; url: string | null }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const enviar = useMutation({
    mutationFn: async (arquivo: File) => {
      const caminho = `caminhoes/${caminhaoId}/${gerarUuid()}.jpg`;
      const { error } = await supabase.storage.from(BUCKET_COMPROVANTES).upload(caminho, await comprimir(arquivo), { contentType: 'image/jpeg' });
      if (error) throw error;
      const { error: e2 } = await supabase.from('caminhoes').update({ foto_path: caminho }).eq('id', caminhaoId).select('id').single();
      if (e2) throw e2;
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex flex-col gap-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
        <img src={url} alt="Foto do caminhão" className="aspect-[4/3] w-full rounded-2xl border bg-muted object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-dashed text-muted-foreground">Sem foto</div>
      )}
      <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card font-semibold hover:bg-muted">
        {enviar.isPending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Camera className="size-5" aria-hidden />}
        {url ? 'Trocar foto' : 'Adicionar foto'}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar.mutate(f);
            e.target.value = '';
          }}
        />
      </label>
      {enviar.isError && <p className="font-medium text-destructive">Não foi possível enviar a foto. Verifique a internet.</p>}
    </div>
  );
}
