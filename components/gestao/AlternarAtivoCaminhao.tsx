'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

/**
 * Caminhão não é excluído (tem viagens e abastecimentos ligados); é desativado
 * e some das escolhas do motorista, mas o histórico continua.
 */
export function AlternarAtivoCaminhao({ id, ativo }: { id: string; ativo: boolean }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  const alternar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('caminhoes').update({ ativo: !ativo }).eq('id', id).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  function confirmar() {
    const pergunta = ativo
      ? 'Desativar este caminhão? Ele deixa de aparecer para os motoristas, mas o histórico continua.'
      : 'Reativar este caminhão?';
    if (window.confirm(pergunta)) alternar.mutate();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={ativo ? 'destructive' : 'outline'}
        disabled={alternar.isPending}
        onClick={confirmar}
        className="h-11 text-base"
      >
        {alternar.isPending ? 'Salvando…' : ativo ? 'Desativar caminhão' : 'Reativar caminhão'}
      </Button>
      {alternar.isError && (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {traduzirErroBanco(alternar.error)}
        </p>
      )}
    </div>
  );
}
