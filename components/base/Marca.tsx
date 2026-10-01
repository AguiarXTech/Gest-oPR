import Image from 'next/image';
import logo from '@/public/logo-rportugues.png';
import { cn } from '@/lib/utils';

/**
 * Marca do app: "Gestão" + logo da RPortugues Transportes. Só para fundo
 * escuro (moldura grafite e login), porque o logo é branco e vermelho.
 * O tamanho vem do font-size do className (ex.: text-4xl); o logo acompanha em `em`.
 */
export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-start gap-[0.3em] leading-none font-bold tracking-tight', className)}>
      {/* Desce o texto para a base dele coincidir com a base das letras do logo. */}
      <span className="mt-[0.72em]">Gestão</span>
      <Image src={logo} alt="RPortugues Transportes" className="h-[2.4em] w-auto" />
    </span>
  );
}
