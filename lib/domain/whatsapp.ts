// Demonstrativo do acerto pelo WhatsApp (adição do piloto, 2026-10-01).
// Sem frete nem custos do caminhão: o texto vai para o motorista (Q6).
import { formatarBRL } from './dinheiro';

/** Telefone cadastrado → número do link wa.me (55 + DDD + número), ou null se não der para usar. */
export function telefoneWhatsApp(telefone: string | null): string | null {
  const d = (telefone ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}

export type DadosDemonstrativo = {
  nome: string;
  /** dd/mm/aaaa */
  inicio: string;
  fim: string;
  viagens: number;
  comissaoCentavos: number;
  reembolsosCentavos: number;
  adiantamentosCentavos: number;
  saldoCentavos: number;
  pagoEm: string | null;
};

export function textoDemonstrativo(d: DadosDemonstrativo): string {
  const primeiro = d.nome.split(' ')[0];
  return [
    `Olá, ${primeiro}! Segue o seu acerto de ${d.inicio} a ${d.fim}:`,
    '',
    `Viagens: ${d.viagens}`,
    `Comissão: ${formatarBRL(d.comissaoCentavos)}`,
    `Reembolsos: ${formatarBRL(d.reembolsosCentavos)}`,
    `Adiantamentos: − ${formatarBRL(d.adiantamentosCentavos)}`,
    d.saldoCentavos >= 0 ? `*Saldo a receber: ${formatarBRL(d.saldoCentavos)}*` : `*Saldo devedor: ${formatarBRL(-d.saldoCentavos)}*`,
    ...(d.pagoEm ? ['', `Pago em ${d.pagoEm}.`] : []),
    '',
    'Os detalhes estão no app, em Meu extrato.',
  ].join('\n');
}

export function linkWhatsApp(numero: string | null, texto: string): string {
  return `https://wa.me/${numero ?? ''}?text=${encodeURIComponent(texto)}`;
}
