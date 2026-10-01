import { describe, expect, it } from 'vitest';
import { CONFIG_PADRAO, lerConfiguracoes } from './configuracoes';

describe('lerConfiguracoes', () => {
  it('sem linhas → padrões da migration', () => {
    expect(lerConfiguracoes([])).toEqual(CONFIG_PADRAO);
  });

  it('lê os valores do banco (jsonb já convertido)', () => {
    const c = lerConfiguracoes([
      { chave: 'rota_padrao_km', valor: 300 },
      { chave: 'fator_tanque', valor: 1.1 },
      { chave: 'alerta_documentos_dias', valor: [60, 30] },
      { chave: 'rota_padrao', valor: { origem: 'A', destino: 'B' } },
    ]);
    expect(c).toMatchObject({ rotaPadraoKm: 300, fatorTanque: 1.1, alertaDocumentosDias: [60, 30], rotaPadrao: { origem: 'A', destino: 'B' } });
  });

  it('número salvo como texto também vale', () => {
    expect(lerConfiguracoes([{ chave: 'intervalo_min_km', valor: '200' }]).intervaloMinKm).toBe(200);
  });

  it('valor de tipo errado é ignorado e chave desconhecida também', () => {
    const c = lerConfiguracoes([
      { chave: 'fator_tanque', valor: 'abc' },
      { chave: 'nao_existe', valor: 1 },
    ]);
    expect(c).toEqual(CONFIG_PADRAO);
  });
});
