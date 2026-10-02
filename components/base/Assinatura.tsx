import Image from 'next/image';
import icone from '@/public/logo-aguiarxtech-icone.png';
import { cn } from '@/lib/utils';

/**
 * Crédito de quem fez o app: "Desenvolvido por" + águia + AGUIARXTECH.
 * O nome é texto (não imagem) para continuar legível pequeno; o X leva o ciano do logo.
 * `claro`: versão para fundo claro (águia num selo grafite, X num ciano mais escuro).
 */
export function Assinatura({ claro, className }: { claro?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-center justify-center gap-2 text-xs',
        claro ? 'text-muted-foreground' : 'text-white/60',
        className,
      )}
    >
      Desenvolvido por
      <span className={cn('inline-flex items-center gap-1.5', claro ? 'text-foreground' : 'text-white')}>
        <Image src={icone} alt="" className={cn('h-6 w-auto', claro && 'box-content rounded-md bg-grafite p-0.5')} />
        <span className="font-semibold tracking-[0.18em]">
          AGUIAR<span className={claro ? 'text-[#0b8f95]' : 'text-[#69fffc]'}>X</span>TECH
        </span>
      </span>
    </p>
  );
}
