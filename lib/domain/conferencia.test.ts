import { describe, expect, it } from 'vitest';
import { CONFIG_PADRAO } from './configuracoes';
import { analisarAbastecimentos, type AbastecimentoConferencia } from './conferencia';

const ab = (id: string, caminhaoId: string, km: number, litros: number, dia: number, preco = 600): AbastecimentoConferencia => ({
  id,
  caminhaoId,
  km,
  litros,
  tanqueCheio: true,
  dataHora: `2026-09-${String(dia).padStart(2, '0')}T12:00:00Z`,
  valorTotalCentavos: Math.round(litros * preco),
  nfceChave: null,
  fotoPath: 'x.jpg',
});

const codigos = (m: ReturnType<typeof analisarAbastecimentos>, id: string) => m.get(id)!.anomalias.map((a) => a.codigo);

describe('analisarAbastecimentos', () => {
  it('mede o consumo de cada um contra o tanque cheio anterior do mesmo caminhão', () => {
    const r = analisarAbastecimentos([ab('a1', 'c1', 100000, 300, 1), ab('a2', 'c1', 100580, 190, 3)], { c1: 300 }, CONFIG_PADRAO);
    expect(r.get('a1')!.kmL).toBeNull();
    expect(r.get('a2')!.kmL).toBeCloseTo(580 / 190, 5);
  });

  it('não mistura caminhões', () => {
    const r = analisarAbastecimentos([ab('a1', 'c1', 100000, 300, 1), ab('b1', 'c2', 50, 100, 2)], { c1: 300, c2: 300 }, CONFIG_PADRAO);
    expect(codigos(r, 'b1')).not.toContain('KM_REGRESSIVO');
  });

  it('km menor que um abastecimento anterior do mesmo caminhão = KM_REGRESSIVO; o anterior não é afetado pelo que veio depois', () => {
    const r = analisarAbastecimentos([ab('a1', 'c1', 100000, 300, 1), ab('a2', 'c1', 99000, 190, 3)], { c1: 300 }, CONFIG_PADRAO);
    expect(codigos(r, 'a2')).toContain('KM_REGRESSIVO');
    expect(codigos(r, 'a1')).not.toContain('KM_REGRESSIVO');
  });

  it('preço fora da mediana dos 30 dias anteriores', () => {
    const r = analisarAbastecimentos(
      [ab('a1', 'c1', 100000, 100, 1), ab('a2', 'c2', 200000, 100, 2), ab('a3', 'c1', 100580, 100, 3, 800)],
      { c1: 300, c2: 300 },
      CONFIG_PADRAO,
    );
    expect(codigos(r, 'a3')).toContain('PRECO_FORA_FAIXA');
    expect(codigos(r, 'a1')).not.toContain('PRECO_FORA_FAIXA'); // sem preços anteriores
  });

  it('capacidade desconhecida: não acusa litros acima do tanque', () => {
    const r = analisarAbastecimentos([ab('a1', 'c1', 100000, 900, 1)], {}, CONFIG_PADRAO);
    expect(codigos(r, 'a1')).not.toContain('LITROS_ACIMA_TANQUE');
  });
});
