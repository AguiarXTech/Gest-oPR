// Viagem = ciclo SJE → BH → SJE — docs/04-REGRAS-DE-NEGOCIO.md §2.
import type { Configuracoes } from './configuracoes';

const km = (n: number) => n.toLocaleString('pt-BR');

/** Distância esperada do ciclo: ida + volta da rota padrão. */
export function kmEsperadoCiclo(config: Configuracoes): number {
  return 2 * config.rotaPadraoKm;
}

/** Aviso (não bloqueia) se o km rodado fugir de ±X% do ciclo esperado. */
export function alertaKmViagem(kmRodado: number, config: Configuracoes): string | null {
  const esperado = kmEsperadoCiclo(config);
  const margem = (esperado * config.kmViagemToleranciaPct) / 100;
  if (Math.abs(kmRodado - esperado) <= margem) return null;
  return `A viagem deu ${km(kmRodado)} km, e o normal é perto de ${km(esperado)} km. Confira o km do painel.`;
}

/** Erro (bloqueia) se o km de chegada for menor que o de saída (check no banco). */
export function validarKmChegada(kmSaida: number, kmChegada: number): string | null {
  return kmChegada < kmSaida ? `O km de chegada (${km(kmChegada)}) é menor que o km de saída (${km(kmSaida)}).` : null;
}
