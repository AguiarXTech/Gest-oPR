# ADR-0002: Emissão de CT-e/MDF-e fica em emissor de terceiros

**Status:** Aceito · **Data:** 2026-09-26

## Contexto

O frete São João Evangelista → BH é intermunicipal e exige CT-e e MDF-e. Construir a emissão implicaria:

- integração com a SEFAZ;
- certificado digital A1;
- contingência;
- validação de schemas XML;
- acompanhamento de mudanças constantes (reforma tributária IBS/CBS em transição a partir de 2026).

## Decisão

- Usar um emissor de mercado (ex.: Bsoft CT-e Prático, Portal do Transportador, ou o módulo CT-e de um SaaS). A escolha fica com o contador e o dono.
- O app **guarda apenas** as chaves de 44 dígitos do CT-e e do MDF-e na viagem.
- Na fase 3, avaliar a importação do XML do CT-e para preencher o frete automaticamente.

## Consequências

- **Positivas:** risco fiscal e manutenção ficam com um fornecedor homologado; o MVP fica menor.
- **Negativas:** a digitação do frete e da chave é duplicada (mitigável na fase 3).
- **Custo:** de gratuito até cerca de R$ 250/mês, conforme o volume e o fornecedor (confirmar preço atual antes de contratar).
