import { describe, expect, it } from 'vitest';
import { CONFIG_PADRAO } from './configuracoes';
import { alertaKmViagem, kmEsperadoCiclo, validarKmChegada } from './viagem';

describe('kmEsperadoCiclo (regras §2)', () => {
  it('ciclo SJE → BH → SJE = 2 × 290 = 580 km', () => expect(kmEsperadoCiclo(CONFIG_PADRAO)).toBe(580));
});

describe('alertaKmViagem: ±25% de 580 km (435 a 725)', () => {
  it.each([435, 580, 725])('%i km: sem alerta', (km) => {
    expect(alertaKmViagem(km, CONFIG_PADRAO)).toBeNull();
  });

  it.each([434, 726, 58, 5800])('%i km: alerta "confira o km"', (km) => {
    expect(alertaKmViagem(km, CONFIG_PADRAO)).toMatch(/confira o km/i);
  });
});

describe('validarKmChegada', () => {
  it('chegada maior ou igual à saída', () => {
    expect(validarKmChegada(1000, 1580)).toBeNull();
    expect(validarKmChegada(1000, 1000)).toBeNull();
  });

  it('chegada menor que a saída é erro', () => {
    expect(validarKmChegada(1000, 999)).toMatch(/menor que o km de saída/);
  });
});
