'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { motoristaNaHora, prazoIndicacao, type ViagemMulta } from '@/lib/domain/multas';
import { formatarPlaca } from '@/lib/domain/placa';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroBanco } from '@/lib/supabase/erros';
import { Campo } from './Campo';

type Props = {
  caminhoes: { id: string; placa: string }[];
  motoristas: { id: string; nome: string }[];
  viagens: ViagemMulta[];
  prazoDias: number;
  aoSalvar: () => void;
};

const classeSelect = 'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base';

/** Lançar multa: sugere quem dirigia pela viagem do caminhão naquele momento e calcula o prazo de indicação. */
export function FormMulta({ caminhoes, motoristas, viagens, prazoDias, aoSalvar }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [f, setF] = useState({ caminhao_id: '', quando: '', valor: '', auto_numero: '', descricao: '', local: '', notificada_em: '', funcionario_id: '' });
  const [erro, setErro] = useState<string | null>(null);

  // datetime-local vem sem fuso: é horário de Brasília (sem horário de verão desde 2019)
  const instante = f.quando ? `${f.quando}:00-03:00` : '';
  const sugerido = f.caminhao_id && instante ? motoristaNaHora(viagens, f.caminhao_id, instante) : null;
  const motorista = f.funcionario_id || sugerido || '';
  const prazo = f.notificada_em ? prazoIndicacao(f.notificada_em, prazoDias) : null;

  const muda = (campo: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [campo]: e.target.value });

  const salvar = useMutation({
    mutationFn: async () => {
      let valor: number;
      try {
        valor = reaisParaCentavos(f.valor);
      } catch {
        throw new Error('Valor inválido. Ex.: 195,23');
      }
      if (!f.caminhao_id || !f.quando || valor <= 0) throw new Error('Preencha caminhão, data/hora e valor.');
      const { error } = await supabase.from('multas').insert({
        caminhao_id: f.caminhao_id,
        funcionario_id: motorista || null,
        data_infracao: instante,
        valor_centavos: valor,
        auto_numero: f.auto_numero || null,
        descricao: f.descricao || null,
        local: f.local || null,
        notificada_em: f.notificada_em || null,
        prazo_indicacao: prazo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      router.refresh();
      aoSalvar();
    },
    onError: (e) => setErro(e instanceof Error && !('code' in e) ? e.message : traduzirErroBanco(e)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        salvar.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="mu_caminhao" rotulo="Caminhão *">
          <select id="mu_caminhao" required value={f.caminhao_id} onChange={muda('caminhao_id')} className={classeSelect}>
            <option value="">Escolha…</option>
            {caminhoes.map((c) => (
              <option key={c.id} value={c.id}>
                {formatarPlaca(c.placa)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="mu_quando" rotulo="Data e hora da infração *">
          <Input id="mu_quando" type="datetime-local" required value={f.quando} onChange={muda('quando')} />
        </Campo>
        <Campo id="mu_motorista" rotulo="Quem dirigia" ajuda={sugerido && !f.funcionario_id ? 'Sugerido pela viagem daquele momento' : undefined}>
          <select id="mu_motorista" value={motorista} onChange={muda('funcionario_id')} className={classeSelect}>
            <option value="">{f.caminhao_id && f.quando ? 'Sem viagem nessa hora: escolha' : '—'}</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="mu_valor" rotulo="Valor (R$) *">
          <Input id="mu_valor" required inputMode="decimal" value={f.valor} onChange={muda('valor')} className="tabular-nums" />
        </Campo>
        <Campo id="mu_notificada" rotulo="Notificação recebida em" ajuda={prazo ? `Indicar condutor até ${prazo.split('-').reverse().join('/')}` : 'Para calcular o prazo de indicação'}>
          <Input id="mu_notificada" type="date" value={f.notificada_em} onChange={muda('notificada_em')} />
        </Campo>
        <Campo id="mu_auto" rotulo="Nº do auto">
          <Input id="mu_auto" value={f.auto_numero} onChange={muda('auto_numero')} />
        </Campo>
        <Campo id="mu_descricao" rotulo="Infração">
          <Input id="mu_descricao" value={f.descricao} onChange={muda('descricao')} placeholder="Ex.: excesso de velocidade" />
        </Campo>
        <Campo id="mu_local" rotulo="Local">
          <Input id="mu_local" value={f.local} onChange={muda('local')} placeholder="Ex.: BR-381 km 300" />
        </Campo>
      </div>
      {erro && (
        <p role="alert" className="font-medium text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" size="lg" disabled={salvar.isPending} className="sm:self-end">
        Salvar multa
      </Button>
    </form>
  );
}
