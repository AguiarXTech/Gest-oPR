import { z } from 'zod';
import { lerDecimal, lerInteiro } from '@/lib/domain/numeros';

function numero(min: number, max: number, mensagem: string, inteiro = true) {
  return z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = inteiro ? lerInteiro(v) : lerDecimal(v);
      if (n === null || n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: mensagem });
        return z.NEVER;
      }
      return n;
    });
}

/** Campos da tela de configurações → linhas da tabela `configuracoes` (chave → valor jsonb). */
export const configuracoesSchema = z
  .object({
    origem: z.string().trim().min(2, 'Digite a cidade de saída.'),
    destino: z.string().trim().min(2, 'Digite a cidade de destino.'),
    rota_padrao_km: numero(10, 5000, 'Km por trecho: de 10 a 5.000.'),
    km_viagem_tolerancia_pct: numero(1, 100, 'De 1% a 100%.'),
    fator_tanque: numero(1, 2, 'Entre 1,00 e 2,00.', false),
    consumo_tolerancia_pct: numero(1, 100, 'De 1% a 100%.'),
    consumo_janela: numero(3, 50, 'De 3 a 50 medições.'),
    preco_tolerancia_pct: numero(1, 100, 'De 1% a 100%.'),
    intervalo_min_km: numero(0, 2000, 'De 0 a 2.000 km.'),
    manutencao_aviso_km: numero(0, 20000, 'De 0 a 20.000 km.'),
    manutencao_aviso_dias: numero(0, 180, 'De 0 a 180 dias.'),
    multa_prazo_indicacao_dias: numero(1, 90, 'De 1 a 90 dias.'),
    alerta_documentos_dias: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const dias = v.split(/[\s,;]+/).filter(Boolean).map(Number);
        if (dias.length !== 3 || dias.some((d) => !Number.isInteger(d) || d < 1 || d > 365)) {
          ctx.addIssue({ code: 'custom', message: 'Três números de dias, ex.: 30, 15, 7' });
          return z.NEVER;
        }
        return [...dias].sort((a, b) => b - a);
      }),
  })
  .transform(({ origem, destino, ...resto }) => [
    { chave: 'rota_padrao', valor: { origem, destino } },
    ...Object.entries(resto).map(([chave, valor]) => ({ chave, valor })),
  ]);

export type ConfiguracoesForm = z.input<typeof configuracoesSchema>;
export type ConfiguracoesDados = z.output<typeof configuracoesSchema>;
