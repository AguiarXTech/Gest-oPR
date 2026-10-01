'use client';

import { MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MenuGestao } from './MenuGestao';
import { Marca } from '@/components/base/Marca';

/** Menu da gestão no celular. `rodape`: bloco do usuário (nome + Sair), montado no layout. */
export function MenuCelular({ rodape }: { rodape: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="flex size-11 items-center justify-center rounded-lg hover:bg-sidebar-accent"
      >
        <MenuIcon className="size-6" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 gap-6 overflow-y-auto border-sidebar-border bg-sidebar p-4 text-sidebar-foreground"
      >
        <SheetTitle className="px-3 pt-2 text-lg text-sidebar-foreground">
          <Marca />
        </SheetTitle>
        <MenuGestao aoNavegar={() => setAberto(false)} />
        <div className="mt-auto">{rodape}</div>
      </SheetContent>
    </Sheet>
  );
}
