# PROJECT_CONTEXT.md  
Contexto Mestre – Plataforma de Conversão de Arquivos

> Este arquivo é a FONTE DE VERDADE do projeto.  
> Sempre que um novo assistente de IA for usado (ChatGPT, Copilot, etc), ele deve ler este arquivo + `PROJECT_STATE_SNAPSHOT.md` antes de sugerir mudanças.

---

## 1. Visão Geral do Produto

Este repositório implementa a **base de um SaaS de conversão de arquivos**, começando por:

- Conversão **Microsoft Project (.mpp) → XML**
- Interface web para upload e download
- Painel administrativo com visão de finanças e operação
- Preparação para cobrança **por conversão** (modelo pay-per-use)

Descrição resumida do objetivo:

> "Uma plataforma simples e profissional onde o usuário sobe um arquivo, paga um valor acessível e recebe o arquivo convertido de forma segura, rápida e auditável."

Preço planejado (produto principal atual):

- **R$ 10,00 por conversão MPP → XML**

No futuro, a visão é evoluir para um **hub de ferramentas de conversão**, com múltiplos tipos de arquivos (Office, PDF, imagens, etc.), cada um com sua landing page, precificação e fluxo próprio.

---

## 2. Personas e Casos de Uso

### Persona 1 – Gerente de Projetos / PMO
- Precisa converter `.mpp` para `.xml` para:
  - Importar em outros sistemas
  - Fazer integrações
  - Compartilhar planejamento com times que não usam MS Project
- Valor: pagar R$ 10 em vez de perder tempo com soluções complicadas.

### Persona 2 – Pequenas Consultorias / Freelancers
- Usam MS Project para clientes diferentes.
- Querem algo simples, direto, sem assinatura mensal.
- Preferem pagar por conversão e repassar o custo.

### Persona 3 – Usuário Técnico (TI/Integração)
- Usa o conversor como parte de um fluxo maior.
- Pode consumir via UI ou via API no futuro.

---

## 3. Stack Técnica Atual (Repositório)

### Backend Principal (Node.js)
- Local: `api/`
- Stack:
  - Node.js
  - PM2 para orquestração em produção
  - Servidor HTTP minimalista (ver `api/server-minimal.js`)
  - Processamento dos uploads `.mpp`
- Responsabilidades:
  - Receber arquivos `.mpp`
  - Validar tipo e tamanho
  - Disparar fluxo de conversão MPP → XML
  - Entregar arquivo `.xml` para download
  - Expor endpoints de health/monitoramento (ver README)

### Frontend Público (Landing + Conversor)
- Local: `public/`
- Principais arquivos:
  - `public/index.html` – página principal do conversor MPP→XML
  - `public/css/style.css` – estilos responsivos
  - `public/js/app_clean_new.js` – lógica de frontend (upload, feedback, etc.)
- Objetivo:
  - Página simples, direta, focada em conversão MPP→XML
  - Preparada para, no futuro, ter links para outras ferramentas de conversão

### Painel Administrativo
- Local: `admin/`
- Arquivos principais:
  - `admin/login.html` – autenticação admin
  - `admin/dashboard.html` – dashboard de estatísticas e finanças
- Funções:
  - Visualizar conversões, métricas e status do sistema
  - Ver relatórios financeiros e estatísticas de uso
  - Futuro: acompanhar pagamentos, PIX, reconciliação, etc.

### Estrutura de Arquivos e Diretórios
- Local: conforme documentado em `README.md` e `PROJECT_STRUCTURE.md`
- Diretórios importantes:
  - `uploads/incoming` – uploads recebidos
  - `uploads/processing` – em processamento
  - `uploads/converted` – arquivos `.xml` finalizados
  - `uploads/expired` – arquivos fora de validade
  - `logs/` – logs do sistema

---

## 4. Infraestrutura e Execução

### Local / Desenvolvimento
- Execução via PM2:
  - `ecosystem.config.json` – configurações de processos
- Script de inicialização rápida:
  - `restart-completo.bat` (Windows)
- Acesso:
  - Frontend: `http://localhost:3000`
  - Admin Panel: `http://localhost:3000/admin`
  - Health Check: `http://localhost:3000/api/health`

### Produção (visão atual baseada no repo)
- Uso de PM2 para produção:
  - Auto-restart
  - Logs persistentes
- Requisitos mínimos:
  - Node.js LTS
  - Reverse proxy (Nginx/Traefik) com HTTPS (ainda não codificado neste repo, mas recomendado)
  - Configuração de variáveis de ambiente:
    - `PORT`
    - `NODE_ENV=production`
    - `ADMIN_USER`, `ADMIN_PASS` (idealmente via `.env` e não hardcoded)

---

## 5. Segurança – Visão Consolidada

O projeto já tem foco forte em segurança, com documentação adicional em:

- `AUDIT_INDEX.md`
- `AUDIT_HONEST_REPORT.md`
- `AUDIT_QUICK_SUMMARY.md`
- `AUDIT_SUMMARY_FINAL.md`
- `PYTHON_PROCESS_FIX.md`
- `PROJECT_STRUCTURE.md` (estrutura e pontos críticos)

Pontos principais de segurança:

- Validação de arquivos:
  - Tipo e extensão
  - Tamanho máximo
- Rate limiting básico (evita abuso do endpoint)
- Logs centralizados para auditoria
- Autenticação de admin com usuário/senha
- Recomendação: **NUNCA** manter credenciais reais versionadas em `README.md` ou arquivos de código.  
  Ideal: mover tudo para variáveis de ambiente e `.env` (já discutido e parte do roadmap).

---

## 6. Monetização e Pagamentos

Modelo atual desejado:

- **Produto principal:** MPP → XML
- **Preço:** R$ 10,00 por conversão
- Modelo de cobrança:
  - Sem assinatura mensal
  - Usuário paga por uso

Gateway de pagamento escolhido em discussões anteriores:

- **Mercado Pago (PIX + cartão)**

Status no contexto deste repositório:

- Integração de pagamentos ainda não está toda refletida aqui em código Node.
- A visão é:
  - Backend expõe um endpoint de "criar pagamento" (preferencialmente em um microserviço ou módulo dedicado).
  - Usuário é redirecionado / recebe QR Code PIX.
  - Após confirmação, a conversão é liberada.
- Reconciliação financeira e automação fiscal podem ficar em scripts/rotinas separados (outro serviço, worker ou job agendado).

---

## 7. Roadmap de Produto (Macro)

### Fase 1 – Conversor MPP → XML (estado atual do repo)
- Frontend + backend funcionando localmente
- Upload seguro
- Geração de XML
- Painel admin básico
- Documentação de estrutura e segurança criada

### Fase 2 – Hardening de Segurança e Observabilidade
- Revisar e reforçar:
  - Validação de entrada
  - Logs
  - Tratamento de erros
- Adicionar:
  - Logs com correlação de requisição
  - Melhor monitoramento de erros (Sentry ou similar – opcional)

### Fase 3 – Pagamentos e Financeiro
- Integrar Mercado Pago (PIX e cartão)
- Associar conversões a transações
- Criar visão financeira no painel admin

### Fase 4 – Plataforma de Múltiplos Conversores (visão futura)
- Outras ferramentas (podem ser neste repo ou em outro):
  - PDF → Texto
  - Juntar PDF
  - Word → PDF
  - Conversor de Imagens
- Cada ferramenta:
  - Tem sua própria página
  - Tem preço próprio por conversão
  - Usa a mesma base de pagamentos e monitoramento

---

## 8. Como Assistentes de IA Devem Usar Este Arquivo

Quando um assistente de IA for ajudar neste projeto, ele deve:

1. **Ler este `PROJECT_CONTEXT.md` por completo.**
2. **Ler o `PROJECT_STATE_SNAPSHOT.md` para saber em que fase estamos.**
3. Usar:
   - `README.md` para detalhes de execução
   - `PROJECT_STRUCTURE.md` para detalhes de pastas/arquivos
   - `AUDIT_*.md` para histórico de segurança

Regras importantes:

- Respeitar a visão de produto: monetização por conversão, plataforma simples e direta.
- Nunca reintroduzir credenciais reais no código ou README.
- Manter o foco em:
  - Segurança
  - Escalabilidade
  - Clareza de arquitetura

---

## 9. Manutenção Deste Arquivo

Sempre que houver uma mudança grande de arquitetura ou de visão de produto:

- Atualizar:
  - Seções de Stack
  - Monetização
  - Roadmap
- Garantir que `PROJECT_STATE_SNAPSHOT.md` esteja alinhado com o estado real do repositório.

Este arquivo deve ser mantido curto o suficiente para ser lido sempre, mas completo o suficiente para dar contexto imediato a qualquer pessoa (ou IA) que entre no projeto.
