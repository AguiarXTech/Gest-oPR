import { z } from 'zod';
import { reaisParaCentavos } from '@/lib/domain/dinheiro';
import { lerDecimal } from '@/lib/domain/numeros';
import { textoOpcional } from './comum';

export const TIPOS_COMISSAO = {
  valor_por_viagem: 'Valor fixo por viagem (ida e volta)',
  pct_frete_bruto: '% do frete',
  pct_frete_liquido: '% do frete menos custos',
  valor_por_km: 'Valor por km rodado',
} as const;

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

export const regraComissaoSchema = z
  .object({
    tipo: z.enum(['valor_por_viagem', 'pct_frete_bruto', 'pct_frete_liquido', 'valor_por_km']),
    valor: z.string().trim(),
    percentual: z.string().trim(),
    deduz_pedagio: z.boolean(),
    deduz_combustivel: z.boolean(),
    apenas_com_frete: z.boolean(),
    vigencia_inicio: data,
    observacoes: textoOpcional,
  })
  .transform((r, ctx) => {
    const ehPercentual = r.tipo === 'pct_frete_bruto' || r.tipo === 'pct_frete_liquido';
    let valor_centavos: number | null = null;
    let percentual: number | null = null;

    if (ehPercentual) {
      const p = lerDecimal(r.percentual);
      if (p === null || p <= 0 || p > 100) {
        ctx.addIssue({ code: 'custom', path: ['percentual'], message: 'Percentual de 0,01 a 100. Ex.: 12,5' });
        return z.NEVER;
      }
      percentual = Math.round(p * 100) / 100; // numeric(5,2)
    } else {
      try {
        valor_centavos = reaisParaCentavos(r.valor);
      } catch {
        ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Valor inválido. Ex.: 150,00' });
        return z.NEVER;
      }
      if (valor_centavos <= 0) {
        ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Digite um valor maior que zero.' });
        return z.NEVER;
      }
    }

    return {
      tipo: r.tipo,
      valor_centavos,
      percentual,
      deduz_pedagio: r.tipo === 'pct_frete_liquido' && r.deduz_pedagio,
      deduz_combustivel: r.tipo === 'pct_frete_liquido' && r.deduz_combustivel,
      apenas_com_frete: r.apenas_com_frete,
      vigencia_inicio: r.vigencia_inicio,
      observacoes: r.observacoes,
    };
  });

export type RegraComissaoForm = z.input<typeof regraComissaoSchema>;
export type RegraComissaoDados = z.output<typeof regraComissaoSchema>;
