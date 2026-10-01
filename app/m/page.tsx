// Home provisória do motorista (S1-1). Botões grandes e viagem em andamento: S1-2.
import { BotaoSair } from '@/components/BotaoSair';
import { obterPerfilAtual } from '@/lib/supabase/perfil';

export default async function HomeMotorista() {
  const perfil = await obterPerfilAtual();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Olá, {perfil?.nome}</h1>
        <BotaoSair />
      </div>
      <p className="text-muted-foreground">Área do motorista. As telas de viagem e abastecimento chegam em breve.</p>
    </main>
  );
}
