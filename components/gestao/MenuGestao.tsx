'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { menuGestao } from './navegacao';

/** Lista de navegação da gestão, na moldura grafite (barra lateral no PC e menu do celular). */
export function MenuGestao({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Menu da gestão" className="flex flex-col gap-5">
      {menuGestao.map((grupo, i) => (
        <div key={grupo.titulo ?? i} className="flex flex-col gap-1">
          {grupo.titulo && (
            <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
              {grupo.titulo}
            </p>
          )}
          {grupo.itens.map(({ href, rotulo, icone: Icone, pronto }) => {
            const ativo = href === '/g' ? caminho === '/g' : caminho.startsWith(href);
            const classes = 'flex min-h-11 items-center gap-3 rounded-lg px-3 text-base';

            if (!pronto) {
              return (
                <span key={href} aria-disabled="true" className={cn(classes, 'text-sidebar-foreground/45')}>
                  <Icone className="size-5 shrink-0" aria-hidden />
                  <span className="truncate">{rotulo}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-xs whitespace-nowrap">
                    em breve
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={aoNavegar}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  classes,
                  ativo
                    ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )}
              >
                <Icone className="size-5 shrink-0" aria-hidden />
                {rotulo}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
