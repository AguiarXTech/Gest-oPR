// Auditoria (RF-21, S5-5): quem mudou o quê, com antes → depois. Só gestor lê (RLS).
import type { Metadata } from 'next';
import Link from 'next/link';
import { camposAlterados, valorLegivel } from '@/lib/domain/auditoria';
import { formatarDataHoraCompleta } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Auditoria · Gestão RPortugues' };

const TABELAS = {
  acertos: 'Acertos',
  viagens: 'Viagens',
  fretes: 'Fretes',
  abastecimentos: 'Abastecimentos',
  despesas_viagem: 'Despesas',
  adiantamentos: 'Adiantamentos',
  regras_comissao: 'Comissão',
  funcionarios: 'Funcionários',
  caminhoes: 'Caminhões',
  documentos: 'Documentos',
  configuracoes: 'Configurações',
} as const;
const ACOES: Record<string, string> = {
  INSERT: 'criou',
  UPDATE: 'alterou',
  DELETE: 'apagou',
  REMOVEU: 'removeu',
};

export default async function Auditoria({ searchParams }: PageProps<'/g/auditoria'>) {
  const { tabela: bruto, registro } = await searchParams;
  const tabela = typeof bruto === 'string' && bruto in TABELAS ? bruto : null;

  const supabase = await createClient();
  let consulta = supabase
    .from('auditoria')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100);
  if (tabela) consulta = consulta.eq('tabela', tabela);
  if (typeof registro === 'string' && /^[0-9a-f-]{36}$/i.test(registro))
    consulta = consulta.eq('registro_id', registro);
  const [{ data: eventos }, { data: perfis }] = await Promise.all([
    consulta,
    supabase.from('profiles').select('id, nome'),
  ]);
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome]));

  return (
    <>
      <div>
        <h1 className="text-3xl">Auditoria</h1>
        <p className="text-muted-foreground">
          As últimas 100 mudanças. Ninguém consegue apagar este histórico.
        </p>
      </div>

      <nav aria-label="Filtrar por área" className="flex flex-wrap gap-2">
        <Link
          href="/g/auditoria"
          className={cn(
            'inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium',
            !tabela ? 'bg-grafite text-white' : 'border bg-card',
          )}
        >
          Tudo
        </Link>
        {Object.entries(TABELAS).map(([t, rotulo]) => (
          <Link
            key={t}
            href={`/g/auditoria?tabela=${t}`}
            className={cn(
              'inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium',
              tabela === t ? 'bg-grafite text-white' : 'border bg-card',
            )}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      <ul className="flex flex-col gap-3">
        {(eventos ?? []).map((e) => {
          const mudancas = camposAlterados(
            e.antes as Record<string, unknown> | null,
            e.depois as Record<string, unknown> | null,
          );
          return (
            <li key={e.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs">
              <p>
                <span className="font-semibold">
                  {e.usuario_id ? (nome.get(e.usuario_id) ?? 'Usuário removido') : 'Sistema'}
                </span>{' '}
                {ACOES[e.acao] ?? e.acao} em{' '}
                <span className="font-semibold">
                  {TABELAS[e.tabela as keyof typeof TABELAS] ?? e.tabela}
                </span>
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatarDataHoraCompleta(e.criado_em)}
                {e.registro_id && (
                  <>
                    {' · '}
                    <Link href={`/g/auditoria?registro=${e.registro_id}`} className="underline">
                      histórico deste registro
                    </Link>
                  </>
                )}
              </p>
              {e.acao === 'REMOVEU' && (
                <p className="rounded-lg bg-muted p-2 text-sm">
                  Motivo:{' '}
                  <span className="font-semibold">
                    {String((e.depois as { motivo?: string } | null)?.motivo ?? '')}
                  </span>
                </p>
              )}
              {e.acao === 'UPDATE' && mudancas.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-lg bg-muted p-2 text-sm">
                  {mudancas.map((m) => (
                    <li key={m.campo} className="break-all">
                      <span className="font-mono font-medium">{m.campo}</span>:{' '}
                      <span className="line-through opacity-70">{valorLegivel(m.antes)}</span> →{' '}
                      <span className="font-semibold">{valorLegivel(m.depois)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {(eventos ?? []).length === 0 && (
          <li className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
            Nenhuma mudança registrada.
          </li>
        )}
      </ul>
    </>
  );
}
