import { BotaoSair } from '@/components/BotaoSair';
import { MenuCelular } from '@/components/gestao/MenuCelular';
import { MenuGestao } from '@/components/gestao/MenuGestao';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { Marca } from '@/components/base/Marca';
import { Assinatura } from '@/components/base/Assinatura';

// Moldura grafite (menu) + conteúdo claro, o mesmo padrão da área do motorista.
export default async function LayoutGestao({ children }: LayoutProps<'/g'>) {
  const perfil = await obterPerfilAtual();
  const papel = perfil?.papel === 'dono' ? 'Dono' : 'Administração';

  const usuario = (
    <div className="flex flex-col gap-3 border-t border-sidebar-border pt-3">
      <div className="px-3">
        <p className="truncate font-semibold">{perfil?.nome}</p>
        <p className="text-sm text-sidebar-foreground/60">{papel}</p>
      </div>
      <BotaoSair naMoldura />
      <Assinatura className="pt-1" />
    </div>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      {/* Celular: barra grafite no topo, menu à esquerda e logo centralizado
          (a coluna vazia da direita tem a largura do botão, para o logo ficar no meio exato). */}
      <header className="sticky top-0 z-10 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 bg-sidebar px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-sidebar-foreground md:hidden">
        <MenuCelular rodape={usuario} />
        <Marca className="h-11 justify-self-center" />
      </header>

      {/* PC: barra lateral grafite fixa */}
      <aside className="sticky top-0 hidden h-svh w-72 shrink-0 flex-col gap-4 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Marca className="mx-3 mt-1 h-14" />
        <MenuGestao />
        <div className="mt-auto">{usuario}</div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
