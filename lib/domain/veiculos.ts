// Classificação dos veículos (pedido de 2026-10-03):
// - caminhão peça única (toco, truck, bitruck): uma placa, cadastrado só em Caminhões;
// - cavalo / caminhão trator (4x2, 6x2, 6x4): puxa uma carreta escolhida em cada viagem;
// - carreta: composição (carreta, bitrem, rodotrem), que define os eixos, e carroceria.
// Os eixos são só sugestão ao escolher; o cadastro pode ser corrigido à mão.

export type TipoVeiculo = 'truck' | 'cavalo';
export type Opcao = { valor: string; rotulo: string; eixos: number };

export const TIPOS_VEICULO: Record<TipoVeiculo, string> = {
  truck: 'Caminhão peça única (toco, truck)',
  cavalo: 'Cavalo / caminhão trator',
};

export const CONFIGURACOES_CAMINHAO: Record<TipoVeiculo, Opcao[]> = {
  truck: [
    { valor: 'toco', rotulo: 'Toco (2 eixos)', eixos: 2 },
    { valor: 'truck', rotulo: 'Truck (3 eixos)', eixos: 3 },
    { valor: 'bitruck', rotulo: 'Bitruck (4 eixos)', eixos: 4 },
  ],
  cavalo: [
    { valor: '4x2', rotulo: '4x2 (2 eixos)', eixos: 2 },
    { valor: '6x2', rotulo: '6x2 (3 eixos)', eixos: 3 },
    { valor: '6x4', rotulo: '6x4 (3 eixos)', eixos: 3 },
  ],
};

/** Eixos só da parte rebocada (sem o cavalo). */
export const COMPOSICOES_CARRETA: Opcao[] = [
  { valor: 'carreta', rotulo: 'Carreta (semirreboque)', eixos: 3 },
  { valor: 'bitrem', rotulo: 'Bitrem', eixos: 4 },
  { valor: 'rodotrem', rotulo: 'Rodotrem', eixos: 6 },
];

export const CARROCERIAS = [
  'Graneleira',
  'Vanderléia',
  'Tanque',
  'Caçamba',
  'Baú',
  'Sider',
  'Prancha',
  'Porta-contêiner',
  'Boiadeira',
  'Florestal',
] as const;

/** Eixos típicos da configuração do caminhão ou da composição da carreta. */
export function eixosSugeridos(valor: string): number | null {
  const todas = [
    ...CONFIGURACOES_CAMINHAO.truck,
    ...CONFIGURACOES_CAMINHAO.cavalo,
    ...COMPOSICOES_CARRETA,
  ];
  return todas.find((o) => o.valor === valor)?.eixos ?? null;
}
