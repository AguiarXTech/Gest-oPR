'use client';

// Baixa do reembolso (pedido de 2026-10-13): o dono pagou ao motorista o que ele pagou do
// bolso. Pede confirmação; dá para desfazer se marcou errado. Fica na auditoria.
import { useMutation } from '@tanstack/react-query';
import { Check, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

type Props = {
  origem: 'despesa' | 'manutencao';
  id: string;
  motorista: string;
  valorCentavos: number;
  /** Já teve baixa: mostra a data e o "desfazer". */
  reembolsadoEm: string | null;
};

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function BaixaReembolso({ origem, id, motorista, valorCentavos, reembolsadoEm }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [confirmando, setConfirmando] = useState(false);

  const executar = useMutation({
    mutationFn: async (desfazer: boolean) => {
      const { error } = await supabase.rpc('dar_baixa_reembolso', {
        p_origem: origem,
        p_id: id,
        p_desfazer: desfazer,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmando(false);
      router.refresh();
    },
  });

  const primeiroNome = motorista.trim().split(/\s+/)[0] || 'o motorista';

  if (reembolsadoEm) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-sucesso">
          ✓ Pago a {primeiroNome} em {dataHora.format(new Date(reembolsadoEm))}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          disabled={executar.isPending}
          onClick={() => executar.mutate(true)}
        >
          <Undo2 aria-hidden /> Desfazer
        </Button>
        {executar.isError && (
          <span className="text-destructive">{traduzirErroBanco(executar.error)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {confirmando ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="font-medium">
            Confirma que você já pagou {formatarBRL(valorCentavos)} a {primeiroNome}?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setConfirmando(false)}
            >
              Não
            </Button>
            <Button
              type="button"
              className="h-11"
              disabled={executar.isPending}
              onClick={() => executar.mutate(false)}
            >
              {executar.isPending ? 'Salvando…' : 'Sim, paguei'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" className="h-11 self-start" onClick={() => setConfirmando(true)}>
          <Check aria-hidden /> Dar baixa: paguei a {primeiroNome}
        </Button>
      )}
      {executar.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {traduzirErroBanco(executar.error)}
        </p>
      )}
    </div>
  );
}
