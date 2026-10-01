// Formatação só na borda (UI), sempre no horário de Brasília (AGENTS.md §4.1–4.3).

const fuso = 'America/Sao_Paulo';

const fDataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fDataHoraSemana = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fData = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', year: 'numeric' });
const fNumero = new Intl.NumberFormat('pt-BR');
const fLitros = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export const formatarDataHora = (iso: string) => fDataHora.format(new Date(iso));
export const formatarDataHoraSemana = (iso: string) => fDataHoraSemana.format(new Date(iso));
/** Data de timestamp (ISO) ou de coluna date (aaaa-mm-dd, lida como dia local, sem fuso). */
export const formatarData = (valor: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor.split('-').reverse().join('/') : fData.format(new Date(valor));
export const formatarKm = (km: number) => `${fNumero.format(km)} km`;
export const formatarNumero = (n: number) => fNumero.format(n);
export const formatarLitros = (litros: number) => `${fLitros.format(litros)} L`;

/** Data de hoje (Brasília) no formato do <input type="date">. */
export const hojeIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: fuso }).format(new Date());
