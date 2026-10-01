// Tela inicial provisória (S0-1). O proxy.ts redireciona usuários logados
// para /m ou /g; a tela de login entra na S1-1.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Gestão Frota</h1>
      <p className="max-w-sm text-zinc-600">
        Viagens, abastecimentos, acertos e resultado por caminhão.
      </p>
    </main>
  );
}
