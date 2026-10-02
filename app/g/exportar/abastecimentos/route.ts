// CSV dos abastecimentos de um período (S4-7). GET /g/exportar/abastecimentos?de=aaaa-mm-dd&ate=aaaa-mm-dd
import type { NextRequest } from 'next/server';
import { formatarCnpj } from '@/lib/domain/cnpj';
import { centavosParaCsv, gerarCsv } from '@/lib/domain/csv';
import { decomporChave } from '@/lib/domain/nfce';
import { formatarPlaca } from '@/lib/domain/placa';
import { formatarDataHoraCompleta } from '@/lib/formatar';
import { createClient } from '@/lib/supabase/server';
import { FORMAS_PAGAMENTO } from '@/lib/validations/abastecimento';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc('is_gestor');
  if (!gestor) return new Response('Sem permissão.', { status: 403 });

  const de = request.nextUrl.searchParams.get('de') ?? '';
  const ate = request.nextUrl.searchParams.get('ate') ?? '';
  if (!DATA.test(de) || !DATA.test(ate)) return new Response('Informe o período (de e até).', { status: 400 });

  const { data } = await supabase
    .from('abastecimentos')
    .select('data_hora, km, litros, valor_total_centavos, tanque_cheio, forma_pagamento, nfce_chave, conferido, caminhoes(placa), funcionarios(nome), fornecedores(nome)')
    .gte('data_hora', `${de}T00:00:00-03:00`)
    .lte('data_hora', `${ate}T23:59:59.999-03:00`)
    .order('data_hora');

  const csv = gerarCsv(
    ['Data', 'Placa', 'Motorista', 'Posto', 'CNPJ do posto', 'Km', 'Litros', 'Valor (R$)', 'Preço/L (R$)', 'Tanque cheio', 'Pagamento', 'Chave NFC-e', 'Conferido'],
    (data ?? []).map((a) => {
      const litros = Number(a.litros);
      const chave = a.nfce_chave ? decomporChave(a.nfce_chave) : null;
      return [
        formatarDataHoraCompleta(a.data_hora),
        a.caminhoes ? formatarPlaca(a.caminhoes.placa) : '',
        a.funcionarios?.nome,
        a.fornecedores?.nome,
        chave ? formatarCnpj(chave.cnpjEmitente) : '',
        a.km,
        litros,
        centavosParaCsv(a.valor_total_centavos),
        (a.valor_total_centavos / 100 / litros).toFixed(3).replace('.', ','),
        a.tanque_cheio ? 'Sim' : 'Não',
        FORMAS_PAGAMENTO[a.forma_pagamento],
        // ="..." faz o Excel tratar como texto; sem isso a chave de 44 dígitos vira 3,12E+43 e perde dígitos
        a.nfce_chave ? `="${a.nfce_chave}"` : '',
        a.conferido ? 'Sim' : 'Não',
      ];
    }),
  );

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="abastecimentos-${de}-a-${ate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
