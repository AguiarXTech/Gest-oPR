'use client';

// Dono/admin que também dirige (pedido de 2026-10-03): o mesmo login dá acesso à área do
// motorista. Sem ficha de motorista ainda, um toque ativa (cria a ficha e liga ao login).
import { ChevronRight, Truck } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { ativarMinhaAreaMotorista, type EstadoAcao } from '@/app/g/funcionarios/actions';
import { Button } from '@/components/ui/button';

export function AreaMotoristaPainel({ ativa, emViagem }: { ativa: boolean; emViagem: boolean }) {
  const [estado, ativar, ativando] = useActionState<EstadoAcao>(
    () => ativarMinhaAreaMotorista(),
    {},
  );

  if (ativa) {
    return (
      <Link
        href="/m"
        className="flex min-h-16 items-center gap-3 rounded-xl border bg-primary p-4 text-primary-foreground shadow-xs hover:bg-primary/90"
      >
        <Truck className="size-7 shrink-0" aria-hidden />
        <span className="flex flex-1 flex-col">
          <span className="text-lg font-semibold">
            {emViagem ? 'Você está em viagem' : 'Área do motorista'}
          </span>
          <span className="text-sm opacity-80">
            {emViagem
              ? 'Abastecer, despesas e finalizar a viagem'
              : 'Iniciar viagem, abastecer, despesas e extrato'}
          </span>
        </span>
        <ChevronRight className="size-6 shrink-0" aria-hidden />
      </Link>
    );
  }

  return (
    <form
      action={ativar}
      className="flex flex-col gap-2 rounded-xl border border-dashed bg-card p-4"
    >
      <p className="font-medium">Você também dirige?</p>
      <p className="text-sm text-muted-foreground">
        Ative a área do motorista no seu próprio login: iniciar e finalizar viagem, lançar
        combustível e despesas.
      </p>
      <Button type="submit" size="lg" disabled={ativando} className="self-start">
        <Truck aria-hidden /> {ativando ? 'Ativando…' : 'Ativar minha área de motorista'}
      </Button>
      {estado.erro && (
        <p role="alert" className="font-medium text-destructive">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
