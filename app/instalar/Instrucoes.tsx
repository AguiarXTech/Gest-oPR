'use client';

import { Download, MoreVertical, Share, SquarePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Sistema = 'iphone' | 'android' | 'outro';
// Evento do Chrome no Android que permite instalar com um toque (não existe no iPhone).
type PedidoInstalacao = Event & { prompt: () => Promise<void> };

function detectar(): Sistema {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  return 'outro';
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{n}</span>
      <span className="pt-1 text-lg">{children}</span>
    </li>
  );
}

export function Instrucoes() {
  const [sistema, setSistema] = useState<Sistema | null>(null);
  const [pedido, setPedido] = useState<PedidoInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- userAgent só existe no navegador
    setSistema(detectar());
    setInstalado(window.matchMedia('(display-mode: standalone)').matches);
    const guardar = (e: Event) => {
      e.preventDefault();
      setPedido(e as PedidoInstalacao);
    };
    window.addEventListener('beforeinstallprompt', guardar);
    return () => window.removeEventListener('beforeinstallprompt', guardar);
  }, []);

  if (instalado) return <p className="text-lg font-semibold text-sucesso">✓ O app já está instalado neste celular.</p>;

  const iphone = (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="text-xl font-semibold">iPhone</h2>
      <ol className="flex flex-col gap-3">
        <Passo n={1}>
          Abra este endereço no <strong>Safari</strong> (no Chrome do iPhone não funciona).
        </Passo>
        <Passo n={2}>
          Toque em <Share className="inline size-5 align-text-bottom" aria-label="Compartilhar" /> <strong>Compartilhar</strong>, na barra de baixo.
        </Passo>
        <Passo n={3}>
          Role e toque em <SquarePlus className="inline size-5 align-text-bottom" aria-hidden /> <strong>Adicionar à Tela de Início</strong> e depois em{' '}
          <strong>Adicionar</strong>.
        </Passo>
      </ol>
    </section>
  );
  const android = (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="text-xl font-semibold">Android</h2>
      {pedido ? (
        <Button size="xl" onClick={() => void pedido.prompt()}>
          <Download aria-hidden /> Instalar o app
        </Button>
      ) : (
        <ol className="flex flex-col gap-3">
          <Passo n={1}>
            Abra este endereço no <strong>Chrome</strong>.
          </Passo>
          <Passo n={2}>
            Toque em <MoreVertical className="inline size-5 align-text-bottom" aria-label="menu" /> (três pontinhos, em cima à direita).
          </Passo>
          <Passo n={3}>
            Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
          </Passo>
        </ol>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      {sistema === 'android' ? android : sistema === 'iphone' ? iphone : (
        <>
          {iphone}
          {android}
        </>
      )}
      <p className="text-muted-foreground">
        Pronto: o ícone <strong>RPortugues</strong> aparece na tela do celular e abre o app em tela cheia. Entre com seu CPF e senha uma
        vez; o app lembra.
      </p>
    </div>
  );
}
