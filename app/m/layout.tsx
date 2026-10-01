import { obterPerfilAtual } from '@/lib/supabase/perfil';

// Moldura grafite no topo + conteúdo claro, o mesmo padrão da gestão.
// O "Sair" fica no fim da home, longe do polegar, para não ser tocado sem querer.
export default async function LayoutMotorista({ children }: LayoutProps<'/m'>) {
  const perfil = await obterPerfilAtual();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <p className="text-sm text-sidebar-foreground/60">Gestão Frota</p>
          <p className="truncate text-lg font-bold">{perfil?.nome}</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
