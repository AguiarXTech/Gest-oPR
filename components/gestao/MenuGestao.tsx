'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { menuGestao } from './navegacao';

/** Lista de navegação da gestão, usada na barra lateral (PC) e no menu do celular. */
export function MenuGestao({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Menu da gestão" className="flex flex-col gap-4">
      {menuGestao.map((grupo, i) => (
        <div key={grupo.titulo ?? i} className="flex flex-col gap-1">
          {grupo.titulo && (
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {grupo.titulo}
            </p>
          )}
          {grupo.itens.map(({ href, rotulo, icone: Icone, pronto }) => {
            const ativo = href === '/g' ? caminho === '/g' : caminho.startsWith(href);
            const classes = 'flex min-h-11 items-center gap-3 rounded-lg px-3 text-base';

            if (!pronto) {
              return (
                <span key={href} aria-disabled="true" className={cn(classes, 'text-muted-foreground/60')}>
                  <Icone className="size-5" aria-hidden />
                  {rotulo}
                  <span className="ml-auto text-xs">em breve</span>
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={aoNavegar}
                aria-current={ativo ? 'page' : undefined}
                className={cn(classes, ativo ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                <Icone className="size-5" aria-hidden />
                {rotulo}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
