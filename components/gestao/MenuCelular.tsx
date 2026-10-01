'use client';

import { MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MenuGestao } from './MenuGestao';

export function MenuCelular() {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
      >
        <MenuIcon className="size-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto p-4">
        <SheetTitle className="px-3 pt-2 text-lg font-semibold">Gestão Frota</SheetTitle>
        <MenuGestao aoNavegar={() => setAberto(false)} />
      </SheetContent>
    </Sheet>
  );
}
