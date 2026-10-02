import { describe, expect, it } from 'vitest';
import { linkWhatsApp, telefoneWhatsApp, textoDemonstrativo } from './whatsapp';

describe('telefoneWhatsApp', () => {
  it.each([
    ['(33) 99999-1234', '5533999991234'],
    ['33 3333-1234', '553333331234'],
    ['+55 33 99999-1234', '5533999991234'],
    ['999991234', null], // sem DDD
    ['', null],
    [null, null],
  ])('%j → %j', (t, esperado) => expect(telefoneWhatsApp(t)).toBe(esperado));
});

describe('textoDemonstrativo', () => {
  const base = {
    nome: 'João da Silva',
    inicio: '01/09/2026',
    fim: '30/09/2026',
    viagens: 4,
    comissaoCentavos: 60000,
    reembolsosCentavos: 18540,
    adiantamentosCentavos: 100000,
    saldoCentavos: -21460,
    pagoEm: null,
  };

  it('saldo devedor e sem frete', () => {
    const t = textoDemonstrativo(base).replace(/ /g, ' ');
    expect(t).toContain('Olá, João!');
    expect(t).toContain('Comissão: R$ 600,00');
    expect(t).toContain('*Saldo devedor: R$ 214,60*');
    expect(t.toLowerCase()).not.toContain('frete');
  });

  it('saldo a receber e data de pagamento', () => {
    const t = textoDemonstrativo({ ...base, saldoCentavos: 8540, pagoEm: '05/10/2026' }).replace(/ /g, ' ');
    expect(t).toContain('*Saldo a receber: R$ 85,40*');
    expect(t).toContain('Pago em 05/10/2026.');
  });
});

describe('linkWhatsApp', () => {
  it('codifica o texto; sem número abre o WhatsApp para escolher o contato', () => {
    expect(linkWhatsApp('5533999991234', 'a b')).toBe('https://wa.me/5533999991234?text=a%20b');
    expect(linkWhatsApp(null, 'x')).toBe('https://wa.me/?text=x');
  });
});
