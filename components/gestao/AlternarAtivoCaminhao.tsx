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
  // Confirmação na própria tela (window.confirm pode ser bloqueado pelo navegador).
  const [confirmando, setConfirmando] = useState(false);

  const alternar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('caminhoes').update({ ativo: !ativo }).eq('id', id).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmando(false);
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {ativo
          ? 'O caminhão deixa de aparecer para os motoristas, mas o histórico continua.'
          : 'Caminhão desativado: não aparece para os motoristas.'}
      </p>
      {alternar.isError && (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {traduzirErroBanco(alternar.error)}
        </p>
      )}

      {confirmando ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 sm:flex-row sm:items-center">
          <p className="font-medium sm:flex-1">
            {ativo ? 'Tem certeza que quer desativar?' : 'Tem certeza que quer reativar?'}
          </p>
          <Button type="button" variant="outline" onClick={() => setConfirmando(false)} className="h-11 text-base">
            Cancelar
          </Button>
          <Button
            type="button"
            variant={ativo ? 'destructive' : 'default'}
            disabled={alternar.isPending}
            onClick={() => alternar.mutate()}
            className="h-11 text-base"
          >
            {alternar.isPending ? 'Salvando…' : ativo ? 'Sim, desativar' : 'Sim, reativar'}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant={ativo ? 'destructive' : 'outline'}
          onClick={() => setConfirmando(true)}
          className="h-11 self-start text-base"
        >
          {ativo ? 'Desativar caminhão' : 'Reativar caminhão'}
        </Button>
      )}
    </div>
  );
}
