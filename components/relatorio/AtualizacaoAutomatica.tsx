'use client';

// Relê a página a cada minuto (a planilha fica 60 s em cache no servidor) e mostra quando
// os dados foram lidos: a atualização fica visível, sem precisar recarregar.
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

const INTERVALO_S = 60;
const hora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function AtualizacaoAutomatica({ lidaEm }: { lidaEm: string }) {
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();
  const [faltam, setFaltam] = useState(INTERVALO_S);
  // contagem num ref: a releitura não pode ficar dentro do cálculo do estado
  const contagem = useRef(INTERVALO_S);

  useEffect(() => {
    const id = setInterval(() => {
      contagem.current -= 1;
      if (contagem.current <= 0) {
        contagem.current = INTERVALO_S;
        iniciar(() => router.refresh());
      }
      setFaltam(contagem.current);
    }, 1000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span aria-live="polite">
        Planilha lida às{' '}
        <span className="font-semibold text-foreground tabular-nums">
          {hora.format(new Date(lidaEm))}
        </span>
        {' · '}
        {atualizando ? (
          'atualizando…'
        ) : (
          <span className="tabular-nums">nova leitura em {faltam}s</span>
        )}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={atualizando}
        onClick={() => {
          contagem.current = INTERVALO_S;
          setFaltam(INTERVALO_S);
          iniciar(() => router.refresh());
        }}
      >
        <RefreshCw className={atualizando ? 'animate-spin' : ''} aria-hidden /> Atualizar agora
      </Button>
    </div>
  );
}
