'use client';

// Campo de valor estilo maquininha/Pix (pedido de 2026-10-07): o motorista digita só os
// números e o valor se forma da direita para a esquerda (11550 → R$ 115,50). Teclado só de
// números: sem vírgula ou ponto para confundir (115.50 virava R$ 11.550,00).
import { Label } from '@/components/ui/label';
import { valorPorDigitos } from '@/lib/domain/dinheiro';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  rotulo: string;
  /** Texto formatado ("115,50") ou ''. É o que os schemas Zod já sabem ler. */
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  autoFocus?: boolean;
};

export function CampoDinheiro({ id, rotulo, valor, aoMudar, erro, autoFocus }: Props) {
  const ajuda = 'Digite só os números. Ex.: 11550 vira R$ 115,50';
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-base">
        {rotulo}
      </Label>
      <div
        className={cn(
          'flex h-16 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          erro && 'border-destructive',
        )}
      >
        <span className="text-2xl font-semibold text-muted-foreground">R$</span>
        <input
          id={id}
          value={valor}
          onChange={(e) => aoMudar(valorPorDigitos(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0,00"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : `${id}-ajuda`}
          className="h-full min-w-0 flex-1 bg-transparent text-right text-3xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      {erro ? (
        <p id={`${id}-erro`} className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : (
        <p id={`${id}-ajuda`} className="text-sm text-muted-foreground">
          {ajuda}
        </p>
      )}
    </div>
  );
}
