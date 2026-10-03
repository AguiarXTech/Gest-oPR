# 05 — Permissões, segurança e LGPD

## 1. Matriz de permissões

Legenda: **T** = total · **L** = leitura · **P** = só os próprios registros · **—** = sem acesso

| Recurso | Dono | Admin | Motorista |
|---|---|---|---|
| Usuários (criar/desativar) | T | T | — |
| Funcionários | T | T | L (P) |
| Caminhões | T | T | L |
| Carretas | T | T | L |
| Clientes | T | T | — |
| Preço do frete combinado | T | T | — |
| Locais de carga | T | T | L |
| Remover viagem (com motivo, na auditoria) | T | T | — |
| Pneus (estoque, montagens, recapagens) | T | T | — |
| Fornecedores | T | T | L |
| Viagens | T | T | P: cria; edita só `em_andamento` e sem acerto |
| Fretes (cliente, valor, CT-e/MDF-e) | T | T | — (Q6: nem frete nem custos do caminhão) |
| Despesas pessoais | P (se também dirige) | P (se também dirige) | P — **só o próprio; a gestão não vê** |
| Manutenção, multas, pedágio (tarifas e cobranças) | T | T | — |
| Abastecimentos | T | T | P: cria; edita/apaga enquanto não conferido e sem acerto |
| Despesas de viagem | T | T | idem abastecimentos |
| Adiantamentos | T | T | L (P) |
| Regras de comissão | T | T | L (P) |
| Acertos | T (**reabrir: só dono**) | T (exceto reabrir) | L (P, só fechados/pagos) |
| Documentos | T | T | L (P) |
| Configurações | T | T | L |
| Auditoria | L | L | — |
| Comprovantes (Storage) | T | T | P (pasta `{funcionario_id}/`) |

**Implementação:** policies na migration inicial e helpers `papel_atual()`, `funcionario_atual()`, `is_gestor()`. Cada linha desta matriz deve ter ao menos um teste em `supabase/tests/`.

> Diferença entre dono e admin hoje: só a reabertura de acerto. Se for preciso restringir mais o admin (ex.: não ver auditoria), crie uma policy específica e atualize esta tabela.

## 2. Checklist de segurança

- [x] Signup público desabilitado no Supabase (Auth → Providers → Email → "Allow new users to sign up" = off). *Feito no projeto DEV; repetir no painel da produção.*
- [ ] `SUPABASE_SERVICE_ROLE_KEY` apenas em variáveis de servidor da Vercel.
- [ ] Toda tabela nova com `enable row level security` + policies + teste.
- [ ] Bucket `comprovantes` privado; exibir via `createSignedUrl` com validade curta (ex.: 10 min).
- [x] Senhas: mínimo de 8 caracteres; gestor pode resetar via server action (ficha do funcionário, S1-4). *Feito no projeto DEV; repetir no painel da produção.*
- [x] Desligamento de motorista: `profiles.ativo = false` + banir o usuário no Auth (`ban_duration`) no mesmo fluxo. Os helpers já tratam `ativo = false` como sem papel. *(S1-5: botão na ficha do funcionário; trigger `sincronizar_perfil_funcionario` leva `ativo` e `nome` para o perfil.)*
- [ ] Rodar o "Security Advisor" do painel do Supabase antes de cada deploy com migration.
- [ ] MFA para dono/admin (fase 2; opcional).

## 3. LGPD

> Orientação de produto, não parecer jurídico. Validar com o contador ou advogado.

### 3.1 Inventário de dados pessoais

| Dado | Titular | Finalidade | Base legal provável | Observação |
|---|---|---|---|---|
| Nome, CPF, telefone, CNH | motoristas | Contrato de trabalho, obrigações legais | Execução de contrato / obrigação legal | — |
| Chave PIX, salário, comissão | motoristas | Pagamento | Execução de contrato | Visível só a gestor e ao próprio |
| Data do exame toxicológico | motoristas | Cumprir a obrigação legal de periodicidade | Obrigação legal | **Não armazenar o resultado nem o laudo.** O resultado é dado sensível de saúde |
| Fotos de cupons | motoristas (indireto) | Comprovação de despesa | Execução de contrato / legítimo interesse | Podem conter CPF impresso no cupom |
| Km, horários de viagem | motoristas | Gestão operacional e custo | Legítimo interesse / contrato | — |
| Geolocalização | motoristas | **Não coletada no MVP** | — | Se entrar na fase 3, exige aviso específico e revisão desta seção |

### 3.2 Obrigações práticas

1. **Aviso de privacidade** simples, entregue e assinado pelos motoristas, explicando o que o app coleta e por quê. Um texto de uma página basta; incluir o link na tela de login.
2. **Acesso mínimo:** implementado pela RLS (seção 1).
3. **Retenção:** manter registros operacionais e financeiros pelo prazo trabalhista/fiscal que o contador indicar (referência comum: 5 anos). Depois, anonimizar o `motorista_id` ou excluir. Implementar como rotina na fase 2.
4. **Direito de acesso do titular:** o extrato do motorista (`/m/extrato`) mais a exportação CSV sob pedido atendem ao básico.
5. **Incidente:** se houver vazamento (ex.: chave de serviço exposta), rotacionar as chaves no Supabase imediatamente, revisar a auditoria e avaliar a comunicação aos titulares.
