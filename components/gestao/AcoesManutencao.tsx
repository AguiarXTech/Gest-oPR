'use client';

import { ListPlus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormItemPlano } from './FormItemPlano';
import { FormManutencao } from './FormManutencao';

type Props = {
  caminhoes: { id: string; placa: string; km_atual: number }[];
  planos: { id: string; caminhao_id: string; item: string }[];
  oficinas: { id: string; nome: string }[];
};

export function AcoesManutencao({ caminhoes, planos, oficinas }: Props) {
  const [aberto, setAberto] = useState<'manutencao' | 'plano' | null>(null);

  if (!aberto) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="xl" onClick={() => setAberto('manutencao')}>
          <Wrench aria-hidden /> Registrar manutenção
        </Button>
        <Button size="xl" variant="outline" onClick={() => setAberto('plano')}>
          <ListPlus aria-hidden /> Novo item do plano
        </Button>
      </div>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{aberto === 'manutencao' ? 'Registrar manutenção' : 'Novo item do plano'}</h2>
        <Button variant="ghost" onClick={() => setAberto(null)}>
          Fechar
        </Button>
      </div>
      {aberto === 'manutencao' ? (
        <FormManutencao caminhoes={caminhoes} planos={planos} oficinas={oficinas} aoSalvar={() => setAberto(null)} />
      ) : (
        <FormItemPlano caminhoes={caminhoes} aoSalvar={() => setAberto(null)} />
      )}
    </section>
  );
}
