'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Campo } from '@/components/gestao/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';

type Props = { motoristas: { id: string; nome: string }[]; inicioPadrao: string; fimPadrao: string };

export function FormNovoAcerto({ motoristas, inicioPadrao, fimPadrao }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [motorista, setMotorista] = useState('');
  const [inicio, setInicio] = useState(inicioPadrao);
  const [fim, setFim] = useState(fimPadrao);

  const criar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('criar_acerto', { p_motorista_id: motorista, p_inicio: inicio, p_fim: fim });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => router.push(`/g/acertos/${id}`),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        criar.mutate();
      }}
      className="flex max-w-xl flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6"
    >
      <Campo id="motorista" rotulo="Motorista">
        <select
          id="motorista"
          required
          value={motorista}
          onChange={(e) => setMotorista(e.target.value)}
          className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base"
        >
          <option value="">Escolha…</option>
          {motoristas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo id="inicio" rotulo="De">
          <Input id="inicio" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Campo>
        <Campo id="fim" rotulo="Até">
          <Input id="fim" type="date" required value={fim} onChange={(e) => setFim(e.target.value)} />
        </Campo>
      </div>
      <p className="text-sm text-muted-foreground">
        Entram as viagens concluídas, abastecimentos, despesas e adiantamentos do motorista nesse período que ainda não estão em
        nenhum acerto. Nada é fechado agora: você revisa antes.
      </p>
      {criar.isError && (
        <p role="alert" className="font-medium text-destructive">
          {traduzirErroBanco(criar.error)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={criar.isPending || !motorista}>
        {criar.isPending ? 'Montando…' : 'Montar acerto'}
      </Button>
    </form>
  );
}
