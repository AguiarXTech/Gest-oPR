// Documentos e vencimentos — docs/04-REGRAS-DE-NEGOCIO.md §9.

export type StatusDocumento = 'vencido' | 'critico' | 'atencao' | 'aviso' | 'ok';

export type TipoDocumento =
  | 'crlv'
  | 'licenciamento'
  | 'ipva'
  | 'seguro'
  | 'rntrc'
  | 'cronotacografo'
  | 'certificado_digital'
  | 'cnh'
  | 'toxicologico'
  | 'outro';
export type EntidadeDocumento = 'empresa' | 'caminhao' | 'funcionario';

export const TIPOS_DOCUMENTO: Record<TipoDocumento, { rotulo: string; entidades: EntidadeDocumento[] }> = {
  crlv: { rotulo: 'CRLV', entidades: ['caminhao'] },
  licenciamento: { rotulo: 'Licenciamento', entidades: ['caminhao'] },
  ipva: { rotulo: 'IPVA', entidades: ['caminhao'] },
  seguro: { rotulo: 'Seguro', entidades: ['caminhao'] },
  rntrc: { rotulo: 'RNTRC (ANTT)', entidades: ['empresa', 'caminhao'] },
  cronotacografo: { rotulo: 'Cronotacógrafo', entidades: ['caminhao'] },
  certificado_digital: { rotulo: 'Certificado digital', entidades: ['empresa'] },
  cnh: { rotulo: 'CNH', entidades: ['funcionario'] },
  toxicologico: { rotulo: 'Exame toxicológico', entidades: ['funcionario'] },
  outro: { rotulo: 'Outro', entidades: ['empresa', 'caminhao', 'funcionario'] },
};

/**
 * LGPD (docs/05 §3.1): do exame toxicológico só se guardam as datas; nada de
 * anexar resultado ou laudo, que é dado sensível de saúde.
 */
export function aceitaAnexo(tipo: TipoDocumento): boolean {
  return tipo !== 'toxicologico';
}

/** Dias entre hoje e o vencimento (datas aaaa-mm-dd, sem fuso). Negativo = vencido. */
export function diasParaVencer(vencimento: string, hoje: string): number {
  return Math.round((Date.parse(`${vencimento}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
}

/** Faixas [30, 15, 7] (config `alerta_documentos_dias`), em qualquer ordem. */
export function statusDocumento(vencimento: string, hoje: string, faixas: readonly number[] = [30, 15, 7]): StatusDocumento {
  const dias = diasParaVencer(vencimento, hoje);
  const [critico, atencao, aviso] = [...faixas].sort((a, b) => a - b);
  if (dias < 0) return 'vencido';
  if (dias <= critico) return 'critico';
  if (dias <= atencao) return 'atencao';
  if (dias <= aviso) return 'aviso';
  return 'ok';
}

export const ORDEM_STATUS: Record<StatusDocumento, number> = { vencido: 0, critico: 1, atencao: 2, aviso: 3, ok: 4 };
