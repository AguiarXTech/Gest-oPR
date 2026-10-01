// Home do motorista: viagem em andamento + botões grandes (PRD 5.1, RNF-01).
// Ao entregar cada tela, troque `pronto` do botão correspondente para true.
import { Flag, Fuel, Receipt, Truck, Wallet } from 'lucide-react';
import { BotaoGrande } from '@/components/motorista/BotaoGrande';
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
  // A RLS garante que o motorista só enxerga as próprias viagens.
  const { data: viagem } = await supabase
    .from('viagens')
    .select('id, origem, destino, data_saida, km_saida, caminhoes(placa)')
    .eq('status', 'em_andamento')
    .maybeSingle();

  return (
    <>
      {viagem ? (
        <section className="flex flex-col gap-1 rounded-2xl border-2 border-primary p-4">
          <p className="text-sm font-medium text-muted-foreground">Viagem em andamento</p>
          <p className="text-xl font-semibold">
            {viagem.origem} → {viagem.destino}
          </p>
          <p className="text-sm text-muted-foreground">
            {viagem.caminhoes?.placa} · saiu {dataHora.format(new Date(viagem.data_saida))} · {km.format(viagem.km_saida)} km
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed p-4 text-center text-muted-foreground">
          Nenhuma viagem em andamento.
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BotaoGrande href="/m/abastecer" rotulo="Abastecer" icone={Fuel} pronto={false} destaque />
        {viagem ? (
          <BotaoGrande href={`/m/viagem/${viagem.id}`} rotulo="Finalizar viagem" icone={Flag} pronto={false} />
        ) : (
          <BotaoGrande href="/m/viagem/nova" rotulo="Iniciar viagem" icone={Truck} pronto={false} />
        )}
        <BotaoGrande href="/m/despesa" rotulo="Despesa" icone={Receipt} pronto={false} />
        <BotaoGrande href="/m/extrato" rotulo="Meu extrato" icone={Wallet} pronto={false} />
      </div>
    </>
  );
}
