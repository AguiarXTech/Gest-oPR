// CSV dos acertos fechados/pagos de uma competência, para o contador lançar a
// comissão na folha (regras §6.1). GET /g/exportar/acertos?competencia=aaaa-mm
import type { NextRequest } from 'next/server';
import { formatarCpf } from '@/lib/domain/cpf';
import { centavosParaCsv, gerarCsv } from '@/lib/domain/csv';
import { formatarData } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc('is_gestor');
  if (!gestor) return new Response('Sem permissão.', { status: 403 });

  const competencia = request.nextUrl.searchParams.get('competencia') ?? '';
  if (!/^\d{4}-\d{2}$/.test(competencia)) return new Response('Informe a competência (aaaa-mm).', { status: 400 });
  const [ano, mes] = competencia.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  // competência = mês em que o período do acerto termina
  const { data } = await supabase
    .from('acertos')
    .select('periodo_inicio, periodo_fim, status, total_comissao_centavos, total_reembolsos_centavos, total_adiantamentos_centavos, saldo_centavos, pago_em, forma_pagamento, funcionarios(nome, cpf)')
    .in('status', ['fechado', 'pago'])
    .gte('periodo_fim', `${competencia}-01`)
    .lte('periodo_fim', `${competencia}-${ultimoDia}`)
    .order('periodo_fim');

  const csv = gerarCsv(
    ['Motorista', 'CPF', 'Período início', 'Período fim', 'Situação', 'Comissão (R$)', 'Reembolsos (R$)', 'Adiantamentos (R$)', 'Saldo (R$)', 'Pago em', 'Forma'],
    (data ?? []).map((a) => [
      a.funcionarios?.nome,
      a.funcionarios ? formatarCpf(a.funcionarios.cpf) : '',
      formatarData(a.periodo_inicio),
      formatarData(a.periodo_fim),
      a.status === 'pago' ? 'Pago' : 'Fechado',
      centavosParaCsv(a.total_comissao_centavos),
      centavosParaCsv(a.total_reembolsos_centavos),
      centavosParaCsv(a.total_adiantamentos_centavos),
      centavosParaCsv(a.saldo_centavos),
      a.pago_em ? formatarData(a.pago_em) : '',
      a.forma_pagamento,
    ]),
  );

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="acertos-${competencia}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
