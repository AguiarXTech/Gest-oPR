import type { StatusDocumento } from '@/lib/domain/documentos';

export const ESTILO_STATUS: Record<StatusDocumento, { rotulo: string; classe: string }> = {
  vencido: { rotulo: 'Vencido', classe: 'bg-destructive text-white' },
  critico: { rotulo: 'Vence em até 7 dias', classe: 'bg-destructive/15 text-destructive' },
  atencao: { rotulo: 'Vence em até 15 dias', classe: 'bg-alerta/20' },
  aviso: { rotulo: 'Vence em até 30 dias', classe: 'bg-alerta/10' },
  ok: { rotulo: 'Em dia', classe: 'bg-sucesso/15 text-sucesso' },
};
