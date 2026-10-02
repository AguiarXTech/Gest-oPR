import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { Marca } from '@/components/base/Marca';
import { Assinatura } from '@/components/base/Assinatura';

// Moldura grafite no topo + conteúdo claro, o mesmo padrão da gestão.
// O "Sair" fica no fim da home, longe do polegar, para não ser tocado sem querer.
export default async function LayoutMotorista({ children }: LayoutProps<'/m'>) {
  const perfil = await obterPerfilAtual();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-sidebar text-sidebar-foreground">
        {/* Logo centralizado, nome do motorista logo abaixo. */}
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-1 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <Marca className="h-11" />
          <p className="max-w-full truncate text-sm font-semibold text-sidebar-foreground/80">{perfil?.nome}</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
        <Assinatura claro className="pt-2" />
      </main>
    </div>
  );
}
