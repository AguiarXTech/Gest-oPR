// Despesas lançadas pelo motorista (pedido de 2026-10-07): em que linha do resumo entram e
// se o dinheiro (pago do bolso dele) já foi devolvido. Devolve-se no acerto (§7) ou direto,
// com a baixa do dono (pedido de 2026-10-13); o que vier primeiro, nunca os dois.
import { formatarBRL } from './dinheiro';
import { formatarPlaca } from './placa';

export type DespesaParaResumo = { tipo: string; valorCentavos: number };

/** Pedágio e manutenção têm linha própria no resumo; o resto é "outras despesas". */
export function separarDespesas(despesas: readonly DespesaParaResumo[]) {
  const soma = (filtro: (tipo: string) => boolean) =>
    despesas.filter((d) => filtro(d.tipo)).reduce((t, d) => t + d.valorCentavos, 0);
  return {
    pedagioCentavos: soma((t) => t === 'pedagio'),
    manutencaoCentavos: soma((t) => t === 'manutencao'),
    outrasCentavos: soma((t) => t !== 'pedagio' && t !== 'manutencao'),
  };
}

export type SituacaoReembolso =
  'a_devolver' | 'no_acerto' | 'devolvido' | 'nao_reembolsavel' | 'pago_pela_empresa';

/**
 * Quem pagou e se já voltou para o motorista: empresa pagou (nada a devolver), a devolver
 * (fora de acerto e sem baixa), no acerto ou devolvido (acerto pago ou baixa do dono).
 */
export function situacaoReembolso(d: {
  reembolsavel: boolean;
  acertoStatus: 'rascunho' | 'fechado' | 'pago' | null;
  /** Padrão: sim (despesa lançada pelo motorista é dele, do bolso). */
  pagoPeloMotorista?: boolean;
  /** Baixa do dono: quando pagou direto ao motorista. */
  devolvidoEm?: string | null;
}): SituacaoReembolso {
  if (d.pagoPeloMotorista === false) return 'pago_pela_empresa';
  if (!d.reembolsavel) return 'nao_reembolsavel';
  if (d.devolvidoEm) return 'devolvido';
  if (d.acertoStatus === null) return 'a_devolver';
  return d.acertoStatus === 'pago' ? 'devolvido' : 'no_acerto';
}

/** Texto do aviso no painel: "Enzo pagou R$ 115,50 em manutenção · DEF4G56". */
export function avisoReembolso(a: {
  motorista: string;
  valorCentavos: number;
  oQue: string;
  placa: string | null;
}): string {
  const primeiroNome = a.motorista.trim().split(/\s+/)[0] ?? a.motorista;
  return `${primeiroNome} pagou ${formatarBRL(a.valorCentavos)} em ${a.oQue}${a.placa ? ` · ${formatarPlaca(a.placa)}` : ''}`;
}
