import { BotaoSair } from '@/components/BotaoSair';
import { MenuCelular } from '@/components/gestao/MenuCelular';
import { MenuGestao } from '@/components/gestao/MenuGestao';
import { obterPerfilAtual } from '@/lib/supabase/perfil';

export default async function LayoutGestao({ children }: LayoutProps<'/g'>) {
  const perfil = await obterPerfilAtual();
  const papel = perfil?.papel === 'dono' ? 'Dono' : 'Administração';

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      {/* Celular: barra no topo com menu */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-2 py-2 md:hidden">
        <MenuCelular />
        <span className="font-semibold">Gestão Frota</span>
        <BotaoSair />
      </header>

      {/* PC: barra lateral fixa */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r p-4 md:flex">
        <div className="px-3">
          <p className="text-lg font-semibold">Gestão Frota</p>
          <p className="text-sm text-muted-foreground">
            {perfil?.nome} · {papel}
          </p>
        </div>
        <MenuGestao />
        <div className="mt-auto px-3">
          <BotaoSair />
        </div>
      </aside>

      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">{children}</main>
    </div>
  );
}
