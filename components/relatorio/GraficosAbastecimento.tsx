'use client';

// Gráficos do relatório de abastecimento (Recharts). Cores do tema (--chart-*), que já
// mudam no modo escuro. Valores chegam em centavos e são formatados só aqui, na borda.
// Animações desligadas: a página se relê a cada minuto e o gráfico seria redesenhado.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ResumoAbastecimentos } from '@/lib/domain/relatorioAbastecimento';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const diaMes = (semana: string) => `${semana.slice(8, 10)}/${semana.slice(5, 7)}`;

const eixo = { fontSize: 12, fill: 'var(--muted-foreground)' };
const dica = {
  contentStyle: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--foreground)',
  },
  labelStyle: { color: 'var(--foreground)', fontWeight: 600 },
};

function Quadro({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-xs">
      <figcaption>
        <span className="block font-semibold">{titulo}</span>
        <span className="text-sm text-muted-foreground">{descricao}</span>
      </figcaption>
      <div className="h-64 w-full" role="img" aria-label={`${titulo}. ${descricao}`}>
        {children}
      </div>
    </figure>
  );
}

export function GraficosAbastecimento({ resumo }: { resumo: ResumoAbastecimentos }) {
  const semanas = resumo.gastoPorSemana.map((s, i) => ({
    semana: diaMes(s.semana),
    gasto: s.gastoCentavos / 100,
    preco: resumo.precoPorSemana[i].precoCentavos / 100,
  }));
  const caminhoes = resumo.kmLPorCaminhao.map((c) => ({
    placa: c.placa,
    kmL: c.kmL === null ? 0 : Number(c.kmL.toFixed(2)),
  }));
  const total = resumo.cards.gastoCentavos || 1;
  const cidades = resumo.porCidade.map((c) => ({
    cidade: c.cidade.replace(/ - MG$/, ''),
    gasto: c.gastoCentavos / 100,
    parte: Math.round((c.gastoCentavos / total) * 100),
  }));
  const media = resumo.cards.kmPorLitro;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Quadro
        titulo="Gasto com diesel por semana"
        descricao="Soma dos abastecimentos de segunda a domingo"
      >
        <ResponsiveContainer>
          <BarChart data={semanas} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="semana" tick={eixo} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(v: number) => brlCompacto.format(v)}
              tick={eixo}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              {...dica}
              formatter={(v) => [brl.format(Number(v)), 'Gasto']}
              labelFormatter={(l) => `Semana de ${l}`}
            />
            <Bar
              dataKey="gasto"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Quadro>

      <Quadro
        titulo="Preço médio do diesel"
        descricao="R$ por litro, média da semana (pesada pelos litros)"
      >
        <ResponsiveContainer>
          <LineChart data={semanas} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="semana" tick={eixo} tickLine={false} axisLine={false} />
            <YAxis
              domain={['dataMin - 0.05', 'dataMax + 0.05']}
              tickFormatter={(v: number) => dec2.format(v)}
              tick={eixo}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              {...dica}
              formatter={(v) => [brl.format(Number(v)), 'Preço/litro']}
              labelFormatter={(l) => `Semana de ${l}`}
            />
            <Line
              type="monotone"
              dataKey="preco"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--chart-1)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Quadro>

      <Quadro
        titulo="Consumo por caminhão"
        descricao={`km/L de tanque cheio a tanque cheio; tracejado = média da frota${media !== null ? ` (${dec2.format(media)} km/L)` : ''}`}
      >
        <ResponsiveContainer>
          <BarChart data={caminhoes} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="placa" tick={eixo} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 'dataMax + 0.5']}
              tickFormatter={(v: number) => dec2.format(v)}
              tick={eixo}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip {...dica} formatter={(v) => [`${dec2.format(Number(v))} km/L`, 'Consumo']} />
            {media !== null && (
              <ReferenceLine
                y={Number(media.toFixed(2))}
                stroke="var(--chart-2)"
                strokeDasharray="4 4"
              />
            )}
            <Bar
              dataKey="kmL"
              fill="var(--chart-3)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Quadro>

      <Quadro titulo="Onde a frota abastece" descricao="Gasto por cidade do posto e % do total">
        <ResponsiveContainer>
          <BarChart data={cidades} layout="vertical" margin={{ left: 8, right: 72 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => brlCompacto.format(v)}
              tick={eixo}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="cidade"
              tick={eixo}
              tickLine={false}
              axisLine={false}
              width={130}
            />
            <Tooltip
              {...dica}
              formatter={(v, _n, item) => [
                `${brl.format(Number(v))} (${(item.payload as { parte: number }).parte}%)`,
                'Gasto',
              ]}
            />
            <Bar
              dataKey="gasto"
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              label={{
                position: 'right',
                fill: 'var(--muted-foreground)',
                fontSize: 12,
                formatter: (v: unknown) => brlCompacto.format(Number(v)),
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Quadro>
    </div>
  );
}
