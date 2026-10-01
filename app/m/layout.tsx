import { BotaoSair } from '@/components/BotaoSair';
import { obterPerfilAtual } from '@/lib/supabase/perfil';

export default async function LayoutMotorista({ children }: LayoutProps<'/m'>) {
  const perfil = await obterPerfilAtual();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 py-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Gestão Frota</p>
          <p className="truncate font-semibold">{perfil?.nome}</p>
        </div>
        <BotaoSair />
      </header>
      <main className="flex flex-1 flex-col gap-6 p-4">{children}</main>
    </div>
  );
}
