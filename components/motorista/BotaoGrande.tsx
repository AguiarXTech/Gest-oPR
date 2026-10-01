import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** false = tela ainda não construída: aparece apagado, sem link. */
  pronto: boolean;
  /** Ação principal da tela: fundo laranja. */
  destaque?: boolean;
  /** Ocupa a linha inteira, com o ícone ao lado do texto. */
  largo?: boolean;
};

/** Botão de ação da home do motorista: grande, fácil de acertar com o polegar. */
export function BotaoGrande({ href, rotulo, icone: Icone, pronto, destaque, largo }: Props) {
  const classes = cn(
    'flex items-center gap-3 rounded-2xl border p-4 font-semibold shadow-xs',
    largo ? 'col-span-2 min-h-20 px-5 text-xl' : 'min-h-28 flex-col justify-center text-center text-lg',
    destaque ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-card-foreground',
  );
  const icone = <Icone className={cn('size-8 shrink-0', !destaque && 'text-primary')} aria-hidden />;

  if (!pronto) {
    return (
      <div aria-disabled="true" className={cn(classes, 'opacity-50 shadow-none')}>
        {icone}
        <span className={cn('flex flex-col', largo && 'items-start')}>
          {rotulo}
          <span className="text-xs font-normal">em breve</span>
        </span>
      </div>
    );
  }

  return (
    <Link href={href} className={cn(classes, 'active:scale-[0.98]', destaque ? 'hover:bg-primary/90' : 'hover:border-primary/40')}>
      {icone}
      {rotulo}
    </Link>
  );
}
