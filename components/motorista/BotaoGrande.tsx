import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** false = tela ainda não construída: aparece apagado, sem link. */
  pronto: boolean;
  destaque?: boolean;
};

/** Botão de ação da home do motorista: grande, fácil de acertar com o polegar. */
export function BotaoGrande({ href, rotulo, icone: Icone, pronto, destaque }: Props) {
  const classes = cn(
    'flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center text-lg font-semibold',
    destaque && 'col-span-2 min-h-32 text-xl',
    destaque && pronto ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
  );

  if (!pronto) {
    return (
      <div aria-disabled="true" className={cn(classes, 'opacity-50')}>
        <Icone className="size-9" aria-hidden />
        {rotulo}
        <span className="text-xs font-normal">em breve</span>
      </div>
    );
  }

  return (
    <Link href={href} className={cn(classes, 'active:scale-[0.98]')}>
      <Icone className="size-9" aria-hidden />
      {rotulo}
    </Link>
  );
}
