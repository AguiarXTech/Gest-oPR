import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListaAnomalias } from '@/components/abastecimento/ListaAnomalias';
import { VerComprovante } from '@/components/camera/VerComprovante';
import { Conferencia } from '@/components/gestao/Conferencia';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { decomporChave } from '@/lib/domain/nfce';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarDataHora, formatarKm, formatarLitros } from '@/lib/formatar';
import { analisarDesde } from '@/lib/supabase/conferencia';
import { obterConfiguracoes } from '@/lib/supabase/configuracoes';
import { createClient } from '@/lib/supabase/server';
import { FORMAS_PAGAMENTO } from '@/lib/validations/abastecimento';

export const metadata: Metadata = { title: 'Abastecimento · Gestão RPortugues' };

const kmL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function DetalheAbastecimento({ params }: PageProps<'/g/abastecimentos/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase
    .from('abastecimentos')
    .select('*, caminhoes(placa), funcionarios(nome), fornecedores(nome), viagens(id), acertos(status)')
    .eq('id', id)
    .maybeSingle();
  if (!a) notFound();

  // analisa a partir de um dia antes, para ter o próprio abastecimento no conjunto
  const analise = (await analisarDesde(supabase, new Date(new Date(a.data_hora).getTime() - 86_400_000), await obterConfiguracoes())).get(a.id);
  const chave = a.nfce_chave ? decomporChave(a.nfce_chave) : null;
  const litros = Number(a.litros);

  const linhas: [string, React.ReactNode][] = [
    ['Quando', formatarDataHora(a.data_hora)],
    ['Km do painel', formatarKm(a.km)],
    ['Litros', formatarLitros(litros)],
    ['Valor', `${formatarBRL(a.valor_total_centavos)} (R$ ${(a.valor_total_centavos / 100 / litros).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}/L)`],
    ['Tanque', a.tanque_cheio ? 'Cheio' : 'Parcial'],
    ['Pagamento', FORMAS_PAGAMENTO[a.forma_pagamento]],
    ['Consumo', analise?.kmL != null ? `${kmL.format(analise.kmL)} km/L` : 'Sem medição (precisa de dois tanques cheios)'],
    ['Posto', a.fornecedores?.nome ?? (chave ? `CNPJ ${formatarCnpj(chave.cnpjEmitente)} (não cadastrado)` : '—')],
    ['Nota', chave ? `${chave.modelo === '65' ? 'NFC-e' : 'NF-e'} nº ${chave.numero} · ${String(chave.mes).padStart(2, '0')}/${chave.ano}` : 'Sem chave'],
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/g/abastecimentos" className="text-sm text-muted-foreground hover:underline">
          ← Conferência
        </Link>
        <h1 className="text-3xl">
          <span className="font-mono">{a.caminhoes ? formatarPlaca(a.caminhoes.placa) : ''}</span> · {a.funcionarios?.nome}
        </h1>
        {a.viagens && (
          <Link href={`/g/viagens/${a.viagens.id}`} className="text-primary hover:underline">
            Ver a viagem
          </Link>
        )}
      </div>

      <ListaAnomalias anomalias={analise?.anomalias ?? []} />

      <div className="grid gap-6 md:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 self-start rounded-2xl border bg-card p-4 shadow-xs">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="text-muted-foreground">{rotulo}</dt>
              <dd className="font-medium tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
        <VerComprovante caminho={a.foto_path} alt="Foto do cupom do abastecimento" />
      </div>

      {a.nfce_chave && <p className="font-mono text-xs break-all text-muted-foreground">Chave: {a.nfce_chave}</p>}

      <Conferencia
        tabela="abastecimentos"
        id={a.id}
        conferido={a.conferido}
        comentario={a.comentario_gestor}
        bloqueado={a.acertos?.status === 'fechado' || a.acertos?.status === 'pago'}
      />
    </div>
  );
}
