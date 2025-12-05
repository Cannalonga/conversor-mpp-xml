# ================================================================================
#              CANNACONVERT - CHECKLIST DE SMOKE-TEST
# ================================================================================
#                 Validação Pós-Deploy em Produção
#                      Data: 05/12/2025
# ================================================================================

## 📋 INSTRUÇÕES

Execute este checklist APÓS cada deploy em produção.
Marque [x] em cada item verificado.
Se algum item falhar, documente e corrija antes de liberar.

---

# ================================================================================
# FASE 1: INFRAESTRUTURA (5 min)
# ================================================================================

## 1.1 Conectividade Básica

```bash
# Executar estes comandos do seu computador local
```

- [ ] **Site acessível via HTTPS**
  ```bash
  curl -I https://cannaconvert.com
  # Esperado: HTTP/2 200
  ```

- [ ] **Redirecionamento HTTP → HTTPS**
  ```bash
  curl -I http://cannaconvert.com
  # Esperado: HTTP/1.1 301 Moved Permanently
  # Location: https://cannaconvert.com/
  ```

- [ ] **Certificado SSL válido**
  ```bash
  curl -vI https://cannaconvert.com 2>&1 | grep "SSL certificate verify ok"
  # Esperado: SSL certificate verify ok
  ```

- [ ] **www redireciona para domínio principal**
  ```bash
  curl -I https://www.cannaconvert.com
  # Esperado: 301 redirect para https://cannaconvert.com
  ```

## 1.2 Performance do Servidor

- [ ] **Tempo de resposta < 500ms**
  ```bash
  curl -o /dev/null -s -w "Tempo total: %{time_total}s\n" https://cannaconvert.com
  # Esperado: < 0.5s
  ```

- [ ] **Headers de segurança presentes**
  ```bash
  curl -I https://cannaconvert.com 2>&1 | grep -E "(X-Frame-Options|X-Content-Type|X-XSS)"
  # Esperado: Headers de segurança listados
  ```

---

# ================================================================================
# FASE 2: PÁGINAS PRINCIPAIS (10 min)
# ================================================================================

## 2.1 Home Page

- [ ] Página carrega completamente
- [ ] Logo aparece nítida e proporcional
- [ ] Gradiente do header correto (#0B5E73 → #0AC9D2)
- [ ] Texto "CannaConvert" com gradiente vermelho/branco/azul
- [ ] Menu de navegação funcional
- [ ] Hero section visível
- [ ] Lista de conversores aparece
- [ ] Footer com links funcionais
- [ ] Responsivo em mobile (testar com DevTools)

## 2.2 Página de Login

- [ ] `/login` carrega corretamente
- [ ] Formulário de login visível
- [ ] Campos de email e senha funcionais
- [ ] Botão "Entrar" clicável
- [ ] Link "Criar conta" funciona
- [ ] Logo aparece corretamente

## 2.3 Página de Registro

- [ ] `/register` carrega corretamente
- [ ] Formulário de registro completo
- [ ] Validação de campos funciona
- [ ] Botão "Cadastrar" clicável
- [ ] Link "Já tenho conta" funciona

## 2.4 Dashboard (após login)

- [ ] `/dashboard` carrega após autenticação
- [ ] Header com logo grande visível
- [ ] Card de créditos visível
- [ ] Grid de 20 ferramentas aparece
- [ ] Espaços de ADS visíveis (5 posições)
- [ ] Sidebar com estatísticas
- [ ] Steps de conversão (1-4) visíveis
- [ ] Área de upload funcional

## 2.5 Páginas de Conversores (testar 3 aleatórias)

- [ ] `/conversor/mpp-xml` carrega
- [ ] `/conversor/pdf-word` carrega
- [ ] `/conversor/video-mp4` carrega
- [ ] Área de upload em cada uma
- [ ] Informações do conversor visíveis

## 2.6 Páginas de Pagamento

- [ ] `/premium` carrega com planos
- [ ] `/premium/pix` gera QR Code (ou placeholder)
- [ ] `/premium/success` mostra sucesso
- [ ] `/premium/failed` mostra falha
- [ ] `/credits` carrega página de créditos

---

# ================================================================================
# FASE 3: APIs (10 min)
# ================================================================================

## 3.1 APIs Públicas

- [ ] **Lista de conversores**
  ```bash
  curl https://cannaconvert.com/api/converters/list
  # Esperado: {"success":true,"converters":[...]}
  ```

## 3.2 APIs de Autenticação

- [ ] **Endpoint de sessão**
  ```bash
  curl https://cannaconvert.com/api/auth/session
  # Esperado: JSON (vazio se não logado)
  ```

- [ ] **Endpoint de registro** (não executar, apenas verificar existência)
  ```bash
  curl -X OPTIONS https://cannaconvert.com/api/register
  # Esperado: 200 ou 204
  ```

## 3.3 APIs Protegidas (testar após login via browser)

- [ ] `/api/credits/balance` retorna saldo
- [ ] `/api/credits/transactions` retorna histórico

---

# ================================================================================
# FASE 4: FUNCIONALIDADES CORE (15 min)
# ================================================================================

## 4.1 Fluxo de Autenticação

- [ ] Criar nova conta (use email de teste)
- [ ] Receber confirmação (se configurado)
- [ ] Login com credenciais criadas
- [ ] Logout funciona
- [ ] Sessão persiste após refresh
- [ ] Middleware protege rotas privadas

## 4.2 Fluxo de Upload

- [ ] Drag & drop de arquivo funciona
- [ ] Click para selecionar arquivo funciona
- [ ] Validação de tipo de arquivo
- [ ] Validação de tamanho de arquivo
- [ ] Progress bar de upload
- [ ] Mensagem de sucesso após upload

## 4.3 Fluxo de Conversão (se créditos disponíveis)

- [ ] Selecionar conversor após upload
- [ ] Botão "Iniciar Conversão" funciona
- [ ] Progress/loading durante conversão
- [ ] Resultado aparece após conversão
- [ ] Download do arquivo convertido funciona

## 4.4 Fluxo de Pagamento PIX

- [ ] Selecionar pacote de créditos
- [ ] QR Code PIX gerado
- [ ] Código "Copia e Cola" disponível
- [ ] Timer de expiração visível
- [ ] Redirecionamento após pagamento (quando integrado)

---

# ================================================================================
# FASE 5: RESPONSIVIDADE (10 min)
# ================================================================================

## 5.1 Desktop (1920x1080)

- [ ] Layout completo visível
- [ ] Sidebar não sobrepõe conteúdo
- [ ] Grid de ferramentas em 10 colunas

## 5.2 Tablet (768x1024)

- [ ] Menu se adapta
- [ ] Grid reduz para 5-6 colunas
- [ ] Cards não quebram

## 5.3 Mobile (375x667)

- [ ] Menu hamburger funciona
- [ ] Grid em 4 colunas
- [ ] Botões tocáveis (min 44px)
- [ ] Texto legível
- [ ] Forms usáveis

---

# ================================================================================
# FASE 6: SEO E ACESSIBILIDADE (5 min)
# ================================================================================

## 6.1 SEO Básico

- [ ] `<title>` presente em todas as páginas
- [ ] `<meta description>` presente
- [ ] Favicon carrega
- [ ] Open Graph tags (verificar com https://metatags.io)

## 6.2 Acessibilidade

- [ ] Alt text em imagens
- [ ] Labels em formulários
- [ ] Contraste de cores adequado
- [ ] Navegação por teclado funciona

---

# ================================================================================
# FASE 7: MONITORAMENTO (5 min)
# ================================================================================

## 7.1 Logs

- [ ] Logs de aplicação acessíveis
  ```bash
  # PM2
  pm2 logs cannaconvert
  
  # Docker
  docker logs cannaconvert-frontend
  ```

- [ ] Sem erros críticos nos logs

## 7.2 Métricas (se configurado)

- [ ] Sentry capturando eventos (se ativo)
- [ ] Google Analytics rastreando (se ativo)

---

# ================================================================================
# FASE 8: BACKUP E RECOVERY (5 min)
# ================================================================================

- [ ] Backup do banco de dados funciona
  ```bash
  pg_dump -U cannaconvert_user cannaconvert_prod > test_backup.sql
  ```

- [ ] Processo de rollback documentado
- [ ] Versão anterior do código disponível

---

# ================================================================================
# RESULTADO DO SMOKE-TEST
# ================================================================================

## Resumo

| Fase | Total | Passou | Falhou |
|------|-------|--------|--------|
| 1. Infraestrutura | 6 | | |
| 2. Páginas | 30+ | | |
| 3. APIs | 5 | | |
| 4. Core | 15 | | |
| 5. Responsividade | 10 | | |
| 6. SEO/A11y | 6 | | |
| 7. Monitoramento | 3 | | |
| 8. Backup | 3 | | |
| **TOTAL** | **78+** | | |

## Status Final

- [ ] ✅ **APROVADO** - Todos os testes passaram
- [ ] ⚠️ **APROVADO COM RESSALVAS** - Falhas não-críticas documentadas
- [ ] ❌ **REPROVADO** - Falhas críticas encontradas

## Falhas Encontradas (se houver)

| # | Descrição | Severidade | Ação |
|---|-----------|------------|------|
| 1 | | Alta/Média/Baixa | |
| 2 | | | |
| 3 | | | |

## Assinaturas

**Testador**: _______________________  
**Data**: ___/___/______  
**Ambiente**: Produção  
**Versão**: _______________________

---

# ================================================================================
# COMANDOS ÚTEIS PARA DEBUG
# ================================================================================

```bash
# Ver logs em tempo real (PM2)
pm2 logs cannaconvert --lines 100

# Ver logs em tempo real (Docker)
docker logs -f cannaconvert-frontend

# Testar conectividade do banco
psql -U cannaconvert_user -d cannaconvert_prod -c "SELECT 1;"

# Verificar uso de recursos
htop

# Verificar uso de disco
df -h

# Verificar portas em uso
sudo netstat -tlnp | grep -E "(3000|80|443)"

# Testar DNS
nslookup cannaconvert.com

# Testar certificado SSL detalhado
openssl s_client -connect cannaconvert.com:443 -servername cannaconvert.com
```

# ================================================================================
# FIM DO CHECKLIST
# ================================================================================
