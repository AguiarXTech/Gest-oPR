// Anomalias de abastecimento — docs/04-REGRAS-DE-NEGOCIO.md §5.
// Derivadas na leitura e nunca gravadas (o motorista não consegue apagar a flag).
// A mesma função roda no aviso ao motorista (contexto parcial, só UX) e na
// conferência do gestor (contexto completo do caminhão).
import type { Configuracoes } from './configuracoes';
import { calcularMedicoes, mediaPonderada, ordenarAbastecimentos, type AbastecimentoConsumo, type Medicao } from './consumo';
import { decomporChave } from './nfce';

export type Severidade = 'alta' | 'media' | 'baixa';
export type CodigoAnomalia =
  | 'KM_REGRESSIVO'
  | 'LITROS_ACIMA_TANQUE'
  | 'CONSUMO_FORA_FAIXA'
  | 'PRECO_FORA_FAIXA'
  | 'INTERVALO_CURTO'
  | 'SEM_NFCE'
  | 'SEM_FOTO'
  | 'MES_DIVERGENTE';

export type Anomalia = { codigo: CodigoAnomalia; severidade: Severidade; mensagem: string };

export const SEVERIDADE: Record<CodigoAnomalia, Severidade> = {
  KM_REGRESSIVO: 'alta',
  LITROS_ACIMA_TANQUE: 'alta',
  SEM_FOTO: 'alta',
  CONSUMO_FORA_FAIXA: 'media',
  PRECO_FORA_FAIXA: 'media',
  MES_DIVERGENTE: 'media',
  INTERVALO_CURTO: 'baixa',
  SEM_NFCE: 'baixa',
};

/** Título curto para etiquetas (a mensagem completa traz os números). */
export const TITULO_ANOMALIA: Record<CodigoAnomalia, string> = {
  KM_REGRESSIVO: 'km voltou',
  LITROS_ACIMA_TANQUE: 'litros acima do tanque',
  CONSUMO_FORA_FAIXA: 'consumo fora do normal',
  PRECO_FORA_FAIXA: 'preço fora do normal',
  INTERVALO_CURTO: 'intervalo curto',
  SEM_NFCE: 'sem nota',
  SEM_FOTO: 'sem foto',
  MES_DIVERGENTE: 'nota de outro mês',
};

const ORDEM: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };

export type AbastecimentoAnalise = {
  km: number;
  litros: number;
  valorTotalCentavos: number;
  /** ISO 8601. */
  dataHora: string;
  nfceChave: string | null;
  fotoPath: string | null;
};

export type ContextoAnalise = {
  capacidadeTanqueL: number | null;
  /** Maior km já registrado para o caminhão ANTES deste abastecimento. */
  maiorKmAnterior: number | null;
  /** km do abastecimento imediatamente anterior do mesmo caminhão. */
  kmUltimoAbastecimento: number | null;
  /** Medição (km/L) fechada por este abastecimento, se houver. */
  kmLDesteAbastecimento: number | null;
  /** Medições anteriores do caminhão, da mais antiga para a mais recente. */
  medicoesAnteriores: readonly Medicao[];
  /** Preço por litro (centavos) dos abastecimentos dos últimos 30 dias, de todos os caminhões. */
  precosLitroRecentesCentavos: readonly number[];
  config: Configuracoes;
};

export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

const foraDaFaixa = (valor: number, referencia: number, tolerancaPct: number) =>
  Math.abs(valor - referencia) > (referencia * tolerancaPct) / 100;

const mesAnoBrasilia = (iso: string) => {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date(iso));
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { ano: valor('year'), mes: valor('month') };
};

const fmt = (n: number, casas = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function detectarAnomalias(a: AbastecimentoAnalise, ctx: ContextoAnalise): Anomalia[] {
  const { config } = ctx;
  const achadas: Omit<Anomalia, 'severidade'>[] = [];

  const regressivo = ctx.maiorKmAnterior !== null && a.km < ctx.maiorKmAnterior;
  if (regressivo) {
    achadas.push({
      codigo: 'KM_REGRESSIVO',
      mensagem: `Km ${a.km.toLocaleString('pt-BR')} é menor que o já registrado (${ctx.maiorKmAnterior!.toLocaleString('pt-BR')}). Confira o km digitado.`,
    });
  }

  if (ctx.capacidadeTanqueL !== null && a.litros > ctx.capacidadeTanqueL * config.fatorTanque) {
    achadas.push({
      codigo: 'LITROS_ACIMA_TANQUE',
      mensagem: `${fmt(a.litros, 1)} L é mais do que cabe no tanque (${fmt(ctx.capacidadeTanqueL, 0)} L).`,
    });
  }

  const recentes = ctx.medicoesAnteriores.slice(-config.consumoJanela);
  const media = recentes.length >= 3 ? mediaPonderada(recentes) : null;
  if (ctx.kmLDesteAbastecimento !== null && media !== null && foraDaFaixa(ctx.kmLDesteAbastecimento, media, config.consumoToleranciaPct)) {
    achadas.push({
      codigo: 'CONSUMO_FORA_FAIXA',
      mensagem: `Consumo de ${fmt(ctx.kmLDesteAbastecimento)} km/L, longe da média do caminhão (${fmt(media)} km/L).`,
    });
  }

  const precoMediano = mediana(ctx.precosLitroRecentesCentavos);
  const precoLitro = a.valorTotalCentavos / a.litros;
  if (precoMediano !== null && foraDaFaixa(precoLitro, precoMediano, config.precoToleranciaPct)) {
    achadas.push({
      codigo: 'PRECO_FORA_FAIXA',
      mensagem: `Preço de R$ ${fmt(precoLitro / 100, 3)}/L, longe do normal dos últimos 30 dias (R$ ${fmt(precoMediano / 100, 3)}/L).`,
    });
  }

  if (!regressivo && ctx.kmUltimoAbastecimento !== null && a.km - ctx.kmUltimoAbastecimento < config.intervaloMinKm) {
    achadas.push({
      codigo: 'INTERVALO_CURTO',
      mensagem: `Só ${(a.km - ctx.kmUltimoAbastecimento).toLocaleString('pt-BR')} km desde o último abastecimento.`,
    });
  }

  if (!a.nfceChave) achadas.push({ codigo: 'SEM_NFCE', mensagem: 'Sem a chave da nota (QR do cupom).' });
  if (!a.fotoPath) achadas.push({ codigo: 'SEM_FOTO', mensagem: 'Sem foto do cupom.' });

  const chave = a.nfceChave ? decomporChave(a.nfceChave) : null;
  if (chave) {
    const { ano, mes } = mesAnoBrasilia(a.dataHora);
    if (chave.ano !== ano || chave.mes !== mes) {
      achadas.push({
        codigo: 'MES_DIVERGENTE',
        mensagem: `A nota é de ${String(chave.mes).padStart(2, '0')}/${chave.ano}, mas o abastecimento está em ${String(mes).padStart(2, '0')}/${ano}.`,
      });
    }
  }

  return achadas
    .map((x) => ({ ...x, severidade: SEVERIDADE[x.codigo] }))
    .sort((x, y) => ORDEM[x.severidade] - ORDEM[y.severidade]);
}

/**
 * Monta o contexto de análise de UM abastecimento a partir do histórico do caminhão
 * (que pode já conter o próprio abastecimento). "Anterior" = antes dele na ordem (km, data).
 */
export function montarContextoAnalise(
  alvo: { id: string; km: number; dataHora: string },
  historicoCaminhao: readonly AbastecimentoConsumo[],
  capacidadeTanqueL: number | null,
  precosLitroCentavos: readonly number[],
  config: Configuracoes,
): ContextoAnalise {
  const outros = historicoCaminhao.filter((h) => h.id !== alvo.id);
  const ordenados = ordenarAbastecimentos([...outros, { ...alvo, litros: 0, tanqueCheio: false }]);
  const posicao = ordenados.findIndex((h) => h.id === alvo.id);
  const anteriores = ordenados.slice(0, posicao);

  const comAlvo = historicoCaminhao.some((h) => h.id === alvo.id) ? historicoCaminhao : outros;
  const medicoes = calcularMedicoes(comAlvo);
  const medicaoAlvo = medicoes.find((m) => m.abastecimentoId === alvo.id) ?? null;
  const idsAnteriores = new Set(anteriores.map((h) => h.id));

  return {
    capacidadeTanqueL,
    // km regressivo compara com tudo o que foi registrado ANTES no tempo, não na ordem de km
    maiorKmAnterior: outros.filter((h) => h.dataHora < alvo.dataHora).reduce<number | null>((max, h) => (max === null || h.km > max ? h.km : max), null),
    kmUltimoAbastecimento: anteriores.at(-1)?.km ?? null,
    kmLDesteAbastecimento: medicaoAlvo?.kmL ?? null,
    medicoesAnteriores: medicoes.filter((m) => idsAnteriores.has(m.abastecimentoId)),
    precosLitroRecentesCentavos: precosLitroCentavos,
    config,
  };
}
