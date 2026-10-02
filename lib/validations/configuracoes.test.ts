import { describe, expect, it } from 'vitest';
import { configuracoesSchema, type ConfiguracoesForm } from './configuracoes';

const base: ConfiguracoesForm = {
  origem: 'São João Evangelista - MG',
  destino: 'Belo Horizonte - MG',
  rota_padrao_km: '290',
  km_viagem_tolerancia_pct: '25',
  fator_tanque: '1,05',
  consumo_tolerancia_pct: '20',
  consumo_janela: '10',
  preco_tolerancia_pct: '15',
  intervalo_min_km: '150',
  alerta_documentos_dias: '7, 30, 15',
  manutencao_aviso_km: '1000',
  manutencao_aviso_dias: '15',
  multa_prazo_indicacao_dias: '30',
};

describe('configuracoesSchema', () => {
  it('vira as linhas chave/valor da tabela, com os dias em ordem decrescente', () => {
    const linhas = configuracoesSchema.parse(base);
    expect(linhas).toContainEqual({ chave: 'rota_padrao', valor: { origem: 'São João Evangelista - MG', destino: 'Belo Horizonte - MG' } });
    expect(linhas).toContainEqual({ chave: 'fator_tanque', valor: 1.05 });
    expect(linhas).toContainEqual({ chave: 'alerta_documentos_dias', valor: [30, 15, 7] });
    expect(linhas).toHaveLength(12);
  });

  it('recusa valores absurdos', () => {
    expect(configuracoesSchema.safeParse({ ...base, fator_tanque: '3' }).success).toBe(false);
    expect(configuracoesSchema.safeParse({ ...base, consumo_janela: '1' }).success).toBe(false);
    expect(configuracoesSchema.safeParse({ ...base, alerta_documentos_dias: '30, 15' }).success).toBe(false);
  });
});
