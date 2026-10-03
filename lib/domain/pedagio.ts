// Controle de pedágio (pedido de 2026-10-03). Cobrança por eixo; caminhão VAZIO com eixo
// suspenso não paga esse eixo (Lei 13.103 art. 17, Lei 13.711/2018). A volta (BH → SJE) é
// sempre carregada (Q3); a ida é carregada só quando tem frete de ida.

export type CaminhaoEixos = { eixos: number | null; eixosSuspensos: number };
export type Tarifa = { vigenciaInicio: string; tarifaEixoCentavos: number };
export type Sentido = 'ida' | 'volta';

/**
 * Eixos do conjunto que passa na praça: o caminhão (truck ou cavalo) mais a carreta da
 * viagem, se houver. Os suspensos também somam. Sem eixos no cadastro de um dos dois → null.
 */
export function eixosDoConjunto(
  caminhao: CaminhaoEixos,
  carreta: CaminhaoEixos | null,
): CaminhaoEixos {
  if (!carreta) return caminhao;
  if (caminhao.eixos === null || carreta.eixos === null) return { eixos: null, eixosSuspensos: 0 };
  return {
    eixos: caminhao.eixos + carreta.eixos,
    eixosSuspensos: caminhao.eixosSuspensos + carreta.eixosSuspensos,
  };
}

/** Eixos cobrados numa passagem. `excecao` (definida pela gestão na viagem) tem prioridade. */
export function eixosCobrados(
  c: CaminhaoEixos,
  carregado: boolean,
  excecao: number | null,
): number | null {
  if (excecao !== null) return excecao;
  if (c.eixos === null) return null; // sem eixos no cadastro não dá para prever
  return carregado ? c.eixos : c.eixos - c.eixosSuspensos;
}

/** Tarifa por eixo vigente numa data (aaaa-mm-dd): a de início mais recente até a data. */
export function tarifaVigente(tarifas: readonly Tarifa[], data: string): number | null {
  const validas = tarifas
    .filter((t) => t.vigenciaInicio <= data)
    .sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
  return validas[0]?.tarifaEixoCentavos ?? null;
}

export type ViagemPedagio = {
  /** aaaa-mm-dd (Brasília) */
  dataIda: string;
  dataVolta: string;
  temFreteIda: boolean;
  eixosIda: number | null;
  eixosVolta: number | null;
};

export type Passagem = {
  sentido: Sentido;
  data: string;
  eixos: number | null;
  tarifaEixoCentavos: number | null;
  previstoCentavos: number | null;
};

/** Passagens previstas de uma viagem numa praça: uma na ida e uma na volta. */
export function passagensPrevistas(
  v: ViagemPedagio,
  c: CaminhaoEixos,
  tarifas: readonly Tarifa[],
): Passagem[] {
  return (
    [
      ['ida', v.dataIda, v.temFreteIda, v.eixosIda],
      ['volta', v.dataVolta, true, v.eixosVolta],
    ] as const
  ).map(([sentido, data, carregado, excecao]) => {
    const eixos = eixosCobrados(c, carregado, excecao);
    const tarifa = tarifaVigente(tarifas, data);
    return {
      sentido,
      data,
      eixos,
      tarifaEixoCentavos: tarifa,
      previstoCentavos: eixos !== null && tarifa !== null ? eixos * tarifa : null,
    };
  });
}

export type Conferencia = 'certo' | 'cobrou_mais' | 'cobrou_menos' | 'sem_previsao';

export function conferirCobranca(
  previsto: number | null,
  cobrado: number,
): { situacao: Conferencia; diferencaCentavos: number | null } {
  if (previsto === null) return { situacao: 'sem_previsao', diferencaCentavos: null };
  const diferencaCentavos = cobrado - previsto;
  return {
    situacao:
      diferencaCentavos === 0 ? 'certo' : diferencaCentavos > 0 ? 'cobrou_mais' : 'cobrou_menos',
    diferencaCentavos,
  };
}
