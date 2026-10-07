import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VerComprovante } from '@/components/camera/VerComprovante';
import { CaminhaoDaDespesa } from '@/components/gestao/CaminhaoDaDespesa';
import { Conferencia } from '@/components/gestao/Conferencia';
import { formatarBRL } from '@/lib/domain/dinheiro';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarData } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { TIPOS_DESPESA } from '@/lib/validations/despesa';

export const metadata: Metadata = { title: 'Despesa · Gestão RPortugues' };

export default async function DetalheDespesa({
  params,
}: PageProps<'/g/abastecimentos/despesas/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: d }, { data: caminhoes }] = await Promise.all([
    supabase
      .from('despesas_viagem')
      .select('*, caminhoes(placa), funcionarios(nome), viagens(id), acertos(status)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('caminhoes').select('id, placa, apelido').eq('ativo', true).order('placa'),
  ]);
  if (!d) notFound();
  const bloqueado = d.acertos?.status === 'fechado' || d.acertos?.status === 'pago';
  // pedágio e manutenção têm área própria (pedido de 2026-10-07)
  const voltar =
    d.tipo === 'pedagio'
      ? { href: '/g/pedagio', rotulo: 'Pedágio' }
      : d.tipo === 'manutencao'
        ? { href: '/g/manutencao', rotulo: 'Manutenção' }
        : { href: '/g/abastecimentos?tipo=despesas', rotulo: 'Conferência de despesas' };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={voltar.href} className="text-sm text-muted-foreground hover:underline">
          ← {voltar.rotulo}
        </Link>
        <h1 className="text-3xl">
          {TIPOS_DESPESA[d.tipo]} ·{' '}
          <span className="tabular-nums">{formatarBRL(d.valor_centavos)}</span>
        </h1>
        <p className="text-muted-foreground">
          {d.funcionarios?.nome} · {formatarData(d.data)}
          {d.caminhoes && ` · ${formatarPlaca(d.caminhoes.placa)}`}
          {d.descricao && ` · ${d.descricao}`}
        </p>
        {d.viagens && (
          <Link href={`/g/viagens/${d.viagens.id}`} className="text-primary hover:underline">
            Ver a viagem
          </Link>
        )}
      </div>

      <CaminhaoDaDespesa
        despesaId={d.id}
        caminhaoId={d.caminhao_id}
        caminhoes={caminhoes ?? []}
        bloqueado={bloqueado}
      />

      <VerComprovante caminho={d.foto_path} alt="Foto do comprovante da despesa" />

      <Conferencia
        tabela="despesas_viagem"
        id={d.id}
        conferido={d.conferido}
        comentario={d.comentario_gestor}
        reembolsavel={d.reembolsavel}
        bloqueado={bloqueado}
      />
    </div>
  );
}
