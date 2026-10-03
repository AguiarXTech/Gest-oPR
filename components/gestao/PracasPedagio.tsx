'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarBRL, reaisParaCentavos } from '@/lib/domain/dinheiro';
import { tarifaVigente } from '@/lib/domain/pedagio';
import { formatarData, hojeIso } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { Campo } from './Campo';

type Praca = { id: string; nome: string; rodovia: string | null; ativa: boolean; tarifas_pedagio: { vigencia_inicio: string; tarifa_eixo_centavos: number }[] };

/** Praças da rota e a tarifa por eixo (reajuste = nova tarifa com a data de início). */
export function PracasPedagio({ pracas }: { pracas: Praca[] }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [aberto, setAberto] = useState<string | 'nova' | null>(pracas.length === 0 ? 'nova' : null);
  const [f, setF] = useState({ nome: '', rodovia: 'BR-381', tarifa: '', inicio: hojeIso() });
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: async () => {
      let tarifa: number;
      try {
        tarifa = reaisParaCentavos(f.tarifa);
      } catch {
        throw new Error('Tarifa inválida. Ex.: 16,20');
      }
      if (tarifa <= 0) throw new Error('Digite a tarifa por eixo.');
      let pracaId = aberto as string;
      if (aberto === 'nova') {
        if (f.nome.trim().length < 2) throw new Error('Digite o nome da praça.');
        const { data, error } = await supabase.from('pracas_pedagio').insert({ nome: f.nome.trim(), rodovia: f.rodovia.trim() || null }).select('id').single();
        if (error) throw error;
        pracaId = data.id;
      }
      const { error } = await supabase.from('tarifas_pedagio').insert({ praca_id: pracaId, vigencia_inicio: f.inicio, tarifa_eixo_centavos: tarifa });
      if (error) throw error;
    },
    onSuccess: () => {
      setAberto(null);
      setF({ nome: '', rodovia: 'BR-381', tarifa: '', inicio: hojeIso() });
      router.refresh();
    },
    onError: (e) => setErro(e instanceof Error && !('code' in e) ? e.message : traduzirErroBanco(e, { '23505': 'Já existe tarifa começando nesse dia.' })),
  });

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        salvar.mutate();
      }}
      className="flex flex-col gap-3 rounded-xl border p-3"
    >
      {aberto === 'nova' && (
        <div className="grid grid-cols-2 gap-3">
          <Campo id="pp_nome" rotulo="Praça">
            <Input id="pp_nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Roças Novas" />
          </Campo>
          <Campo id="pp_rodovia" rotulo="Rodovia">
            <Input id="pp_rodovia" value={f.rodovia} onChange={(e) => setF({ ...f, rodovia: e.target.value })} />
          </Campo>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Campo id="pp_tarifa" rotulo="Tarifa por eixo (R$)" ajuda="Valor de 1 eixo (categoria de carro)">
          <Input id="pp_tarifa" inputMode="decimal" value={f.tarifa} onChange={(e) => setF({ ...f, tarifa: e.target.value })} className="tabular-nums" />
        </Campo>
        <Campo id="pp_inicio" rotulo="Vale a partir de">
          <Input id="pp_inicio" type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
        </Campo>
      </div>
      {erro && <p className="font-medium text-destructive">{erro}</p>}
      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => setAberto(null)}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={salvar.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
      <h2 className="text-lg font-semibold">Praças e tarifas</h2>
      {pracas.map((p) => {
        const atual = tarifaVigente(
          p.tarifas_pedagio.map((t) => ({ vigenciaInicio: t.vigencia_inicio, tarifaEixoCentavos: t.tarifa_eixo_centavos })),
          hojeIso(),
        );
        const ultima = [...p.tarifas_pedagio].sort((a, b) => b.vigencia_inicio.localeCompare(a.vigencia_inicio))[0];
        return (
          <div key={p.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex flex-col">
                <span className="font-semibold">
                  {p.nome}
                  {p.rodovia && <span className="font-normal text-muted-foreground"> · {p.rodovia}</span>}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {atual !== null ? `${formatarBRL(atual)} por eixo` : 'Sem tarifa'}
                  {ultima && ` desde ${formatarData(ultima.vigencia_inicio)}`}
                </span>
              </span>
              {aberto !== p.id && (
                <Button variant="outline" onClick={() => setAberto(p.id)}>
                  Reajuste
                </Button>
              )}
            </div>
            {aberto === p.id && form}
          </div>
        );
      })}
      {aberto === 'nova' ? (
        form
      ) : (
        <Button variant="ghost" onClick={() => setAberto('nova')} className="self-start">
          + Outra praça
        </Button>
      )}
    </section>
  );
}
