// Painel provisório da gestão (S1-1). Navegação e painel de verdade: S1-2 e S5.
import { BotaoSair } from '@/components/BotaoSair';
import { obterPerfilAtual } from '@/lib/supabase/perfil';

export default async function PainelGestao() {
  const perfil = await obterPerfilAtual();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Olá, {perfil?.nome}</h1>
        <BotaoSair />
      </div>
      <p className="text-muted-foreground">
        Área de gestão ({perfil?.papel === 'dono' ? 'dono' : 'administração'}). Cadastros e painel chegam em breve.
      </p>
    </main>
  );
}
