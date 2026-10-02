// Auditoria (RF-21, S5-5): só os campos que mudaram, para a tela ficar legível.

/** Campos de controle que mudam sempre e não interessam a quem lê. */
const IGNORADOS = new Set(['updated_at', 'created_at']);

export type Mudanca = { campo: string; antes: unknown; depois: unknown };

export function camposAlterados(antes: Record<string, unknown> | null, depois: Record<string, unknown> | null): Mudanca[] {
  const campos = new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})]);
  return [...campos]
    .filter((c) => !IGNORADOS.has(c))
    .filter((c) => JSON.stringify(antes?.[c] ?? null) !== JSON.stringify(depois?.[c] ?? null))
    .map((campo) => ({ campo, antes: antes?.[campo] ?? null, depois: depois?.[campo] ?? null }));
}

/** Texto curto de um valor qualquer do banco. */
export function valorLegivel(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
