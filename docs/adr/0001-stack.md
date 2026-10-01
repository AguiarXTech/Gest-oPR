# ADR-0001: Stack PWA (Next.js) + Supabase

**Status:** Aceito · **Data:** 2026-09-26 · **Decisores:** dev (filho), validado com dono

## Contexto

- Operação: 3 a 5 caminhões e cerca de 5 usuários (dono, admin, 3 motoristas com Android e iPhone).
- Uma pessoa desenvolve, com apoio de agente de IA.
- Orçamento de infraestrutura baixo (≤ US$ 25/mês).
- Requisitos que pesam na escolha: foto e QR code pelo celular, controle de acesso por papel, backup e custo previsível.

## Decisão

- **Front:** app Next.js (App Router, TypeScript) entregue como PWA.
- **Backend:** Supabase (Postgres + Auth + Storage), com segurança via RLS e triggers.
- **Servidor:** sem backend próprio; server actions só para operações com service role.

## Opções consideradas

### A. PWA Next.js + Supabase (escolhida)
| Dimensão | Avaliação |
|---|---|
| Complexidade | Baixa/média |
| Custo | US$ 0 (dev) / US$ 25 (Pro) + Vercel Hobby/Pro |
| Escala | Muito acima do necessário |
| Familiaridade | Alta para agentes de IA (stack muito comum) |

**Prós:**
- Um só código para Android, iPhone e PC.
- Sem loja de apps.
- RLS dá segurança declarativa e testável.
- Tipos gerados do banco.

**Contras:**
- Câmera e QR no iOS Safari têm limitações (mitigado pelo spike S2-2).
- Offline limitado.
- Lock-in moderado no Supabase (mitigado: é Postgres padrão).

### B. React Native (Expo) + Supabase
**Prós:** câmera/QR nativos, offline robusto.
**Contras:**
- Publicação nas lojas (conta Apple paga, revisão).
- Painel de gestão separado para PC.
- Mais esforço de manutenção.

**Quando reconsiderar:** se o spike do QR no iPhone falhar ou se o sinal na rota exigir offline de verdade.

### C. Firebase
**Prós:** maduro, offline bom no SDK.
**Contras:**
- NoSQL dificulta relatórios financeiros (somas, joins, rateios).
- Regras de segurança menos expressivas para esse domínio.

### D. SaaS pronto (Frota Virtual, Drivvo etc.)
Descartado como solução principal na pesquisa de mercado: não cobre comissão/acerto, lucro por viagem e pneus no porte desejado. Pode servir de ponte temporária.

## Consequências

- **Fica mais fácil:**
  - evoluir o schema com migrations versionadas;
  - testar a segurança com pgTAP;
  - fazer relatórios em SQL.
- **Fica mais difícil:**
  - modo offline completo;
  - notificações push no iOS (só PWA instalado, iOS 16.4+). Alertas ficam no painel no MVP.
- **Revisitar:** após o spike S2-2 e após 3 meses de piloto.

## Login de motoristas sem e-mail (Q8)

Se o motorista não tiver e-mail, o gestor cria o usuário com um e-mail interno `{cpf}@frota.local` e senha inicial. O login aceita **CPF**: a UI converte para o e-mail interno antes de chamar `signInWithPassword`. Não há recuperação de senha por e-mail nesses casos; o gestor redefine pela server action.
