import Image from 'next/image';
import logo from '@/public/logo-rportugues.png';
import { cn } from '@/lib/utils';

/**
 * Marca do app: logo da RPortugues Transportes. Só para fundo escuro
 * (moldura grafite e login), porque o logo é branco e vermelho.
 * - `comGestao`: "Gestão" + logo, alinhados pelo meio (login). O tamanho vem do
 *   font-size do className (ex.: text-3xl); o logo acompanha em `em`.
 * - sem `comGestao`: só o logo; a altura vem do className (ex.: h-12).
 */
export function Marca({ comGestao, className }: { comGestao?: boolean; className?: string }) {
  if (!comGestao) {
    return <Image src={logo} alt="RPortugues Transportes" className={cn('w-auto', className)} />;
  }

  return (
    <span className={cn('inline-flex items-center gap-[0.3em] leading-none font-bold tracking-tight', className)}>
      Gestão
      <Image src={logo} alt="RPortugues Transportes" className="h-[2.4em] w-auto" />
    </span>
  );
}
