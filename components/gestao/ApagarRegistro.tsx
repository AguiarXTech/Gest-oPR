'use client';

import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

/** Apaga um registro lançado errado (o banco recusa se estiver em acerto fechado). */
export function ApagarRegistro({
  tabela,
  id,
  rotulo,
}: {
  tabela:
    | 'adiantamentos'
    | 'documentos'
    | 'planos_manutencao'
    | 'manutencoes'
    | 'multas'
    | 'precos_frete';
  id: string;
  rotulo: string;
}) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [confirmando, setConfirmando] = useState(false);

  const apagar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(tabela).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  if (apagar.isError)
    return <span className="text-sm text-destructive">{traduzirErroBanco(apagar.error)}</span>;
  if (!confirmando) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Apagar ${rotulo}`}
        onClick={() => setConfirmando(true)}
      >
        <Trash2 aria-hidden />
      </Button>
    );
  }
  return (
    <span className="flex gap-1">
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(false)}>
        Não
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={apagar.isPending}
        onClick={() => apagar.mutate()}
      >
        Apagar
      </Button>
    </span>
  );
}
