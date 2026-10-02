'use client';

// Foto de comprovante (S2-3): tira a foto, comprime no celular (≤ 1600 px, ~300 KB)
// e envia na hora para o bucket privado. O formulário guarda só o caminho; se o
// salvamento do registro falhar depois, a foto já está no servidor.
import { Camera, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BUCKET_COMPROVANTES, caminhoComprovante } from '@/lib/domain/comprovante';
import { comprimir } from '@/lib/imagem';
import { createClient } from '@/lib/supabase/client';
import { gerarUuid } from '@/lib/uuid';
import { cn } from '@/lib/utils';

type Props = {
  funcionarioId: string;
  /** Caminho já enviado (ex.: vindo do rascunho), ou null. */
  caminho: string | null;
  onChange: (caminho: string | null) => void;
  rotulo?: string;
};

type Estado = 'vazio' | 'processando' | 'pronta' | 'erro';

export function FotoComprovante({ funcionarioId, caminho, onChange, rotulo = 'Foto do cupom' }: Props) {
  const [supabase] = useState(createClient);
  const [estado, setEstado] = useState<Estado>(caminho ? 'pronta' : 'vazio');
  const [previa, setPrevia] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Blob | null>(null);

  // Foto que veio do rascunho: mostra pela URL assinada.
  useEffect(() => {
    if (!caminho || previa) return;
    let ativo = true;
    supabase.storage
      .from(BUCKET_COMPROVANTES)
      .createSignedUrl(caminho, 600)
      .then(({ data }) => ativo && data && setPrevia(data.signedUrl));
    return () => {
      ativo = false;
    };
  }, [caminho, previa, supabase]);

  async function enviar(blob: Blob) {
    setEstado('processando');
    const destino = caminhoComprovante(funcionarioId, new Date(), gerarUuid());
    const { error } = await supabase.storage
      .from(BUCKET_COMPROVANTES)
      .upload(destino, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) {
      setPendente(blob);
      setEstado('erro');
      return;
    }
    setPendente(null);
    setEstado('pronta');
    onChange(destino);
  }

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setEstado('processando');
    try {
      const blob = await comprimir(arquivo);
      setPrevia(URL.createObjectURL(blob));
      onChange(null);
      await enviar(blob);
    } catch {
      setEstado('erro');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-medium">{rotulo}</span>
      {previa && (
        // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou URL assinada temporária
        <img src={previa} alt="Prévia da foto do comprovante" className="max-h-64 w-full rounded-xl border bg-muted object-contain" />
      )}

      {estado === 'processando' && (
        <p className="flex items-center gap-2 text-muted-foreground" aria-live="polite">
          <LoaderCircle className="size-5 animate-spin" aria-hidden /> Enviando foto…
        </p>
      )}
      {estado === 'pronta' && <p className="font-medium text-sucesso">✓ Foto enviada</p>}
      {estado === 'erro' && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="font-medium text-destructive">A foto não foi enviada. Verifique a internet.</p>
          {pendente && (
            <Button type="button" variant="outline" size="lg" onClick={() => void enviar(pendente)}>
              <RefreshCw aria-hidden /> Tentar enviar de novo
            </Button>
          )}
        </div>
      )}

      <label
        className={cn(
          'inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border text-lg font-semibold',
          estado === 'vazio' ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
          estado === 'processando' && 'pointer-events-none opacity-50',
        )}
      >
        <Camera className="size-6" aria-hidden />
        {estado === 'vazio' ? 'Tirar foto' : 'Tirar outra foto'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            void aoEscolher(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
