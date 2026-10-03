'use client';

// Remover viagem com motivo (pedido de 2026-10-03): viagem de teste, criada errada,
// duplicada... A função remover_viagem confere a permissão e grava o motivo na auditoria.
import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { cn } from '@/lib/utils';

const MOTIVOS = ['Viagem de teste', 'Viagem criada errada', 'Viagem duplicada'];

type Props = {
  viagemId: string;
  abastecimentos: number;
  despesas: number;
  /** Viagem num acerto: não pode sair (o banco também recusa). */
  emAcerto: boolean;
};

export function RemoverViagem({ viagemId, abastecimentos, despesas, emAcerto }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [apagarLancamentos, setApagarLancamentos] = useState(false);
  const temLancamentos = abastecimentos + despesas > 0;

  const remover = useMutation({
    mutationFn: async () => {
      if (motivo.trim().length < 3) throw new Error('Escreva o motivo da remoção.');
      const { error } = await supabase.rpc('remover_viagem', {
        p_viagem: viagemId,
        p_motivo: motivo.trim(),
        p_apagar_lancamentos: apagarLancamentos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      router.replace('/g/viagens');
      router.refresh();
    },
  });

  // mensagem de erro antiga some quando o motivo muda
  const escolherMotivo = (m: string) => {
    setMotivo(m);
    if (remover.isError) remover.reset();
  };

  const lancamentos = [
    abastecimentos > 0 && `${abastecimentos} abastecimento${abastecimentos > 1 ? 's' : ''}`,
    despesas > 0 && `${despesas} despesa${despesas > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' e ');

  return (
    <section className="flex flex-col gap-3 border-t pt-6">
      <h2 className="font-medium">Remover viagem</h2>
      {emAcerto ? (
        <p className="text-muted-foreground">
          Esta viagem está num acerto. Para remover, tire do acerto (ou reabra) antes.
        </p>
      ) : !aberto ? (
        <>
          <p className="text-muted-foreground">
            Para viagem de teste, criada errada ou duplicada. O motivo fica registrado na auditoria.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 self-start text-base text-destructive"
            onClick={() => setAberto(true)}
          >
            <Trash2 aria-hidden /> Remover viagem
          </Button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            remover.mutate();
          }}
          className="flex flex-col gap-3 rounded-xl border border-destructive/40 p-4"
        >
          <p className="font-medium">Por que remover?</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => escolherMotivo(m)}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm font-medium',
                  motivo === m && 'border-primary bg-primary/10 text-primary',
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <label htmlFor="motivo-remocao" className="text-sm font-medium">
            Motivo *
          </label>
          <textarea
            id="motivo-remocao"
            value={motivo}
            onChange={(e) => escolherMotivo(e.target.value)}
            rows={2}
            placeholder="Ex.: viagem de teste"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {temLancamentos && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={apagarLancamentos}
                onChange={(e) => setApagarLancamentos(e.target.checked)}
                className="mt-1 size-5 shrink-0"
              />
              <span>
                <span className="block font-medium">Apagar também {lancamentos} desta viagem</span>
                <span className="text-sm text-muted-foreground">
                  Marque se também foram de teste. Sem marcar, eles ficam salvos, só sem viagem
                  (continuam no diesel do mês).
                </span>
              </span>
            </label>
          )}

          <p className="text-sm font-medium text-destructive">
            A viagem e os fretes dela saem de vez. Não dá para desfazer.
          </p>
          {remover.isError && (
            <p role="alert" className="font-medium text-destructive">
              {remover.error instanceof Error && !('code' in remover.error)
                ? remover.error.message
                : traduzirErroBanco(remover.error)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={remover.isPending || remover.isSuccess}
              className="h-11 text-base"
            >
              {remover.isPending ? 'Removendo…' : 'Remover de vez'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
