import type { SituacaoPneu } from '@/lib/domain/pneus';
import { formatarKm } from '@/lib/formatar';

export const ROTULO_SITUACAO: Record<SituacaoPneu, string> = {
  novo: 'Novo',
  recapado: 'Recapado',
  usado: 'Usado',
};

export const ESTILO_SITUACAO: Record<SituacaoPneu, string> = {
  novo: 'bg-sucesso/15 text-sucesso',
  recapado: 'bg-primary/15 text-primary',
  usado: 'bg-muted text-muted-foreground',
};

/** Linhas de km do pneu: desde novo, desde a recapagem, ou "não dá para calcular" no usado. */
export function linhasKmPneu(p: {
  situacao: SituacaoPneu;
  vida: number;
  km: { kmVidaAtual: number; kmDesdeNovo: number | null };
}): string[] {
  const { kmVidaAtual, kmDesdeNovo } = p.km;
  if (p.situacao === 'novo')
    return [kmVidaAtual === 0 ? 'Sem rodar' : `${formatarKm(kmVidaAtual)} desde novo`];
  if (p.situacao === 'recapado') {
    return [
      `${formatarKm(kmVidaAtual)} desde a ${p.vida}ª recapagem`,
      kmDesdeNovo !== null
        ? `${formatarKm(kmDesdeNovo)} desde novo`
        : 'Km desde novo: não dá para calcular (entrou usado)',
    ];
  }
  return [
    'Km de antes não dá para calcular (entrou usado)',
    ...(kmVidaAtual > 0 ? [`${formatarKm(kmVidaAtual)} rodados com a gente`] : []),
  ];
}
