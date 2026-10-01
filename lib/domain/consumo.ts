// Consumo km/L pelo método tanque cheio — docs/04-REGRAS-DE-NEGOCIO.md §4.

export type AbastecimentoConsumo = {
  id: string;
  km: number;
  /** Litros com até 3 casas (numeric(10,3) no banco). */
  litros: number;
  tanqueCheio: boolean;
  /** ISO 8601. */
  dataHora: string;
  motoristaId?: string;
};

export type Medicao = {
  /** Abastecimento de tanque cheio que fecha a medição. */
  abastecimentoId: string;
  motoristaId?: string;
  dataHora: string;
  distancia: number;
  litros: number;
  kmL: number;
};

// Litros somados em mililitros inteiros para não acumular erro de ponto flutuante.
const paraMl = (litros: number) => Math.round(litros * 1000);

export function ordenarAbastecimentos<T extends { km: number; dataHora: string }>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => a.km - b.km || a.dataHora.localeCompare(b.dataHora));
}

/** Medições de um mesmo caminhão: uma para cada tanque cheio que tem um tanque cheio anterior. */
export function calcularMedicoes(abastecimentos: readonly AbastecimentoConsumo[]): Medicao[] {
  const medicoes: Medicao[] = [];
  let anteriorCheio: AbastecimentoConsumo | null = null;
  let mlDesdeAnterior = 0;

  for (const a of ordenarAbastecimentos(abastecimentos)) {
    if (anteriorCheio) mlDesdeAnterior += paraMl(a.litros);
    if (!a.tanqueCheio) continue;

    if (anteriorCheio) {
      const distancia = a.km - anteriorCheio.km;
      if (distancia > 0 && mlDesdeAnterior > 0) {
        medicoes.push({
          abastecimentoId: a.id,
          motoristaId: a.motoristaId,
          dataHora: a.dataHora,
          distancia,
          litros: mlDesdeAnterior / 1000,
          kmL: distancia / (mlDesdeAnterior / 1000),
        });
      }
    }
    anteriorCheio = a;
    mlDesdeAnterior = 0;
  }

  return medicoes;
}

/** Σ distâncias ÷ Σ litros (média ponderada, não média das médias). */
export function mediaPonderada(medicoes: readonly Medicao[]): number | null {
  const distancia = medicoes.reduce((t, m) => t + m.distancia, 0);
  const ml = medicoes.reduce((t, m) => t + paraMl(m.litros), 0);
  return ml > 0 ? distancia / (ml / 1000) : null;
}
