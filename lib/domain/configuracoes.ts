// Limiares configuráveis (tabela `configuracoes`, migration 20260926000001).
// Os padrões abaixo são os mesmos da migration: valem se a linha não existir.

export type Configuracoes = {
  rotaPadraoKm: number;
  rotaPadrao: { origem: string; destino: string };
  kmViagemToleranciaPct: number;
  fatorTanque: number;
  consumoToleranciaPct: number;
  consumoJanela: number;
  precoToleranciaPct: number;
  intervaloMinKm: number;
  alertaDocumentosDias: number[];
};

export const CONFIG_PADRAO: Configuracoes = {
  rotaPadraoKm: 290,
  rotaPadrao: { origem: 'São João Evangelista - MG', destino: 'Belo Horizonte - MG' },
  kmViagemToleranciaPct: 25,
  fatorTanque: 1.05,
  consumoToleranciaPct: 20,
  consumoJanela: 10,
  precoToleranciaPct: 15,
  intervaloMinKm: 150,
  alertaDocumentosDias: [30, 15, 7],
};

const CHAVES: Record<string, keyof Configuracoes> = {
  rota_padrao_km: 'rotaPadraoKm',
  rota_padrao: 'rotaPadrao',
  km_viagem_tolerancia_pct: 'kmViagemToleranciaPct',
  fator_tanque: 'fatorTanque',
  consumo_tolerancia_pct: 'consumoToleranciaPct',
  consumo_janela: 'consumoJanela',
  preco_tolerancia_pct: 'precoToleranciaPct',
  intervalo_min_km: 'intervaloMinKm',
  alerta_documentos_dias: 'alertaDocumentosDias',
};

/** Converte as linhas {chave, valor} do banco; valor de tipo errado é ignorado (fica o padrão). */
export function lerConfiguracoes(linhas: readonly { chave: string; valor: unknown }[]): Configuracoes {
  const config: Configuracoes = { ...CONFIG_PADRAO };
  for (const { chave, valor } of linhas) {
    const campo = CHAVES[chave];
    if (!campo) continue;
    const padrao = CONFIG_PADRAO[campo];
    const v = typeof valor === 'string' && typeof padrao === 'number' ? Number(valor) : valor;
    const tipoOk =
      typeof padrao === 'number'
        ? typeof v === 'number' && Number.isFinite(v)
        : Array.isArray(padrao)
          ? Array.isArray(v) && v.every((n) => typeof n === 'number')
          : typeof v === 'object' && v !== null && 'origem' in v && 'destino' in v;
    if (tipoOk) (config as Record<string, unknown>)[campo] = v;
  }
  return config;
}
