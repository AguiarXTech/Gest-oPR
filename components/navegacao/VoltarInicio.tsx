'use client';

// Botão "voltar ao início" em todas as telas (pedido de 2026-10-02). Some na própria tela inicial.
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function VoltarInicio({ inicio, rotulo }: { inicio: '/m' | '/g'; rotulo: string }) {
  const caminho = usePathname();
  if (caminho === inicio) return null;
  return (
    <Link
      href={inicio}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-2 font-medium text-primary hover:bg-muted"
    >
      <ChevronLeft className="size-5" aria-hidden /> {rotulo}
    </Link>
  );
}
