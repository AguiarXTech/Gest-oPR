// Painel da gestão. Os quatro cards seguem o fluxo 5.3 do PRD; os números
// entram na Sprint 5 (RF-19). Por enquanto mostram só a estrutura.
import { obterPerfilAtual } from '@/lib/supabase/perfil';

const cards = [
  { titulo: 'Receita do mês', descricao: 'Soma dos fretes das viagens do mês' },
  { titulo: 'Custo de diesel', descricao: 'Total abastecido no mês' },
  { titulo: 'Resultado por caminhão', descricao: 'Receita menos custos, por placa' },
  { titulo: 'Alertas', descricao: 'Abastecimentos suspeitos e documentos vencendo' },
];

export default async function PainelGestao() {
  const perfil = await obterPerfilAtual();
  const primeiroNome = perfil?.nome.split(' ')[0];

  return (
    <>
      <div>
        <h1 className="text-3xl">Olá, {primeiroNome}</h1>
        <p className="text-muted-foreground">Resumo do mês da frota.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ titulo, descricao }) => (
          <section key={titulo} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-muted-foreground">{titulo}</h2>
            {/* Quando houver dados: valor em text-3xl font-bold tabular-nums. */}
            <p className="text-xl font-semibold text-muted-foreground">Sem dados ainda</p>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </section>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">Os números do painel aparecem quando viagens e abastecimentos começarem a ser registrados.</p>
    </>
  );
}
