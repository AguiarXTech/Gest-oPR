'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

type Props = {
  tabela: 'caminhoes' | 'clientes' | 'fornecedores';
  id: string;
  ativo: boolean;
  /** Ex.: "caminhão", "cliente". */
  nome: string;
  /** Explicação mostrada acima do botão, conforme o estado atual. */
  explicacao: { ativo: string; inativo: string };
};

/**
 * Cadastros com histórico não são excluídos: são desativados e somem das
 * escolhas, mas os registros antigos continuam ligados a eles.
 */
export function AlternarAtivo({ tabela, id, ativo, nome, explicacao }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  // Confirmação na própria tela (window.confirm pode ser bloqueado pelo navegador).
  const [confirmando, setConfirmando] = useState(false);

  const alternar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(tabela).update({ ativo: !ativo }).eq('id', id).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmando(false);
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">{ativo ? explicacao.ativo : explicacao.inativo}</p>
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
          {ativo ? `Desativar ${nome}` : `Reativar ${nome}`}
        </Button>
      )}
    </div>
  );
}
