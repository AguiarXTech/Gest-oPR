// Home do motorista: viagem em andamento + botões grandes (PRD 5.1, RNF-01).
// Ao entregar cada tela, troque `pronto` do botão correspondente para true.
import { Flag, Fuel, LayoutDashboard, PiggyBank, Receipt, Truck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { BotaoSair } from '@/components/BotaoSair';
import { BotaoGrande } from '@/components/motorista/BotaoGrande';
import { obterPerfilAtual } from '@/lib/supabase/perfil';
import { createClient } from '@/lib/supabase/server';

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const km = new Intl.NumberFormat('pt-BR');

export default async function HomeMotorista() {
  const supabase = await createClient();
  const perfil = await obterPerfilAtual();
  // Filtro explícito: para o dono/admin que também dirige, a RLS mostra todas as viagens.
  const { data: viagem } = await supabase
    .from('viagens')
    .select('id, origem, destino, data_saida, km_saida, caminhoes(placa)')
    .eq('status', 'em_andamento')
    .eq('motorista_id', perfil?.funcionario_id ?? '')
    .maybeSingle();
  const ehGestao = perfil?.papel === 'dono' || perfil?.papel === 'admin';

  return (
    <>
      {viagem ? (
        <section className="flex flex-col gap-1 rounded-2xl bg-grafite p-5 text-white shadow-xs">
          <p className="text-sm font-medium text-white/70">Viagem em andamento</p>
          <p className="text-2xl font-bold">
            {viagem.origem} → {viagem.destino}
          </p>
          <p className="text-white/70">
            {viagem.caminhoes?.placa} · saiu {dataHora.format(new Date(viagem.data_saida))} · {km.format(viagem.km_saida)} km
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <p className="text-lg font-semibold">Nenhuma viagem em andamento</p>
          <p className="text-muted-foreground">Toque em Iniciar viagem quando sair.</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BotaoGrande href="/m/abastecer" rotulo="Abastecer" icone={Fuel} pronto destaque largo />
        {viagem ? (
          <BotaoGrande href={`/m/viagem/${viagem.id}`} rotulo="Finalizar viagem" icone={Flag} pronto largo />
        ) : (
          <BotaoGrande href="/m/viagem/nova" rotulo="Iniciar viagem" icone={Truck} pronto largo />
        )}
        <BotaoGrande href="/m/despesa" rotulo="Despesa" icone={Receipt} pronto />
        <BotaoGrande href="/m/extrato" rotulo="Meu extrato" icone={Wallet} pronto />
        <BotaoGrande href="/m/pessoal" rotulo="Minhas despesas (pessoal)" icone={PiggyBank} pronto largo />
      </div>

      {ehGestao && (
        <Link
          href="/g"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border bg-card text-lg font-semibold shadow-xs hover:border-primary/40"
        >
          <LayoutDashboard className="size-6 text-primary" aria-hidden /> Ir para a gestão
        </Link>
      )}

      <BotaoSair className="mt-auto pt-6" />
    </>
  );
}
