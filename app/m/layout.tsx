import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { Marca } from '@/components/base/Marca';

// Moldura grafite no topo + conteúdo claro, o mesmo padrão da gestão.
// O "Sair" fica no fim da home, longe do polegar, para não ser tocado sem querer.
export default async function LayoutMotorista({ children }: LayoutProps<'/m'>) {
  const perfil = await obterPerfilAtual();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
          <Marca className="h-11" />
          <p className="truncate text-right font-semibold">{perfil?.nome}</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
