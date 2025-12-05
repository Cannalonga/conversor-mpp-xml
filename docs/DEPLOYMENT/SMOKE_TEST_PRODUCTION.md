# 🧪 CANNACONVERT - CHECKLIST DE SMOKE TEST (PRODUÇÃO)

**Versão:** 1.0.0  
**Data:** Dezembro 2024  
**Ambiente:** Ubuntu 24.04 LTS - Produção

---

## 📋 Instruções

Execute este checklist **após cada deploy em produção** para garantir que todos os sistemas críticos estão funcionando corretamente.

**Tempo estimado:** 15-30 minutos

---

## 🔐 1. INFRAESTRUTURA

### 1.1 Servidor
| # | Teste | Comando/Ação | Status |
|---|-------|--------------|--------|
| 1 | SSH funcionando | `ssh cannaconvert@SEU_IP` | ⬜ |
| 2 | Firewall ativo | `sudo ufw status` | ⬜ |
| 3 | Apenas portas 22, 80, 443 abertas | `sudo ufw status verbose` | ⬜ |
| 4 | Docker rodando | `docker --version && docker ps` | ⬜ |
| 5 | Espaço em disco > 20% livre | `df -h` | ⬜ |
| 6 | Memória disponível > 1GB | `free -h` | ⬜ |
| 7 | CPU não saturada | `htop` ou `top` | ⬜ |

### 1.2 Containers
| # | Teste | Comando/Ação | Status |
|---|-------|--------------|--------|
| 8 | Frontend rodando | `docker ps \| grep frontend` | ⬜ |
| 9 | Backend rodando | `docker ps \| grep backend` | ⬜ |
| 10 | PostgreSQL rodando | `docker ps \| grep postgres` | ⬜ |
| 11 | Redis rodando | `docker ps \| grep redis` | ⬜ |
| 12 | MPP Converter rodando | `docker ps \| grep mpp` | ⬜ |
| 13 | Todos containers healthy | `docker ps --format "{{.Names}}: {{.Status}}"` | ⬜ |

### 1.3 NGINX & SSL
| # | Teste | Comando/Ação | Status |
|---|-------|--------------|--------|
| 14 | NGINX rodando | `sudo systemctl status nginx` | ⬜ |
| 15 | Config NGINX válida | `sudo nginx -t` | ⬜ |
| 16 | SSL válido | `curl -I https://SEU_DOMINIO` | ⬜ |
| 17 | Redirect HTTP → HTTPS | `curl -I http://SEU_DOMINIO` (deve retornar 301) | ⬜ |
| 18 | Certificado não expirando em < 30 dias | `sudo certbot certificates` | ⬜ |

---

## 🌐 2. ENDPOINTS E PÁGINAS

### 2.1 Páginas Públicas
| # | Página | URL | Código Esperado | Status |
|---|--------|-----|-----------------|--------|
| 19 | Landing Page | `https://SEU_DOMINIO/` | 200 | ⬜ |
| 20 | Login | `https://SEU_DOMINIO/login` | 200 | ⬜ |
| 21 | Registro | `https://SEU_DOMINIO/register` | 200 | ⬜ |
| 22 | Preços/Premium | `https://SEU_DOMINIO/premium` | 200 | ⬜ |

### 2.2 API Health Checks
| # | Endpoint | URL | Código Esperado | Status |
|---|----------|-----|-----------------|--------|
| 23 | Health Check | `https://SEU_DOMINIO/api/health` | 200 | ⬜ |
| 24 | Auth Session | `https://SEU_DOMINIO/api/auth/session` | 200 | ⬜ |
| 25 | Converters List | `https://SEU_DOMINIO/api/converters/list` | 200 | ⬜ |

### 2.3 Páginas Autenticadas (testar após login)
| # | Página | URL | Comportamento Esperado | Status |
|---|--------|-----|------------------------|--------|
| 26 | Dashboard | `/dashboard` | Carrega corretamente | ⬜ |
| 27 | Créditos | `/credits` | Mostra saldo | ⬜ |
| 28 | Histórico | `/history` | Lista conversões | ⬜ |
| 29 | Perfil | `/profile` | Mostra dados do usuário | ⬜ |

---

## 👤 3. AUTENTICAÇÃO

### 3.1 Fluxo de Registro
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 30 | Acessar registro | Ir para `/register` | Formulário visível | ⬜ |
| 31 | Validação de email | Inserir email inválido | Erro de validação | ⬜ |
| 32 | Validação de senha | Senha < 6 caracteres | Erro de validação | ⬜ |
| 33 | Registro com sucesso | Preencher corretamente | Redirect para dashboard | ⬜ |
| 34 | Email duplicado | Registrar mesmo email | Erro "email já existe" | ⬜ |

### 3.2 Fluxo de Login
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 35 | Acessar login | Ir para `/login` | Formulário visível | ⬜ |
| 36 | Credenciais inválidas | Email/senha errados | Erro de autenticação | ⬜ |
| 37 | Login com sucesso | Credenciais corretas | Redirect para dashboard | ⬜ |
| 38 | Sessão persistida | Recarregar página | Continua logado | ⬜ |
| 39 | Logout | Clicar em sair | Redirect para login | ⬜ |

---

## 💰 4. SISTEMA DE CRÉDITOS

### 4.1 Visualização de Créditos
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 40 | Ver saldo | Ir para `/credits` | Saldo visível | ⬜ |
| 41 | Ver pacotes | Scroll para pacotes | 3 pacotes disponíveis | ⬜ |
| 42 | Ver histórico | Scroll para transações | Lista de transações | ⬜ |

### 4.2 Compra via PIX (Mercado Pago)
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 43 | Iniciar compra | Clicar em "Comprar" | Modal PIX abre | ⬜ |
| 44 | QR Code gerado | Aguardar carregamento | QR Code visível | ⬜ |
| 45 | Código PIX copia/cola | Clicar em "Copiar" | Código copiado | ⬜ |
| 46 | Timeout tratado | Aguardar expiração | Mensagem de timeout | ⬜ |

> **Nota:** Para teste real de pagamento em produção, use valores pequenos ou ambiente de sandbox se disponível.

---

## 🔄 5. CONVERSÕES

### 5.1 Upload de Arquivo
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 47 | Área de upload visível | Ir para dashboard | Dropzone visível | ⬜ |
| 48 | Arrastar arquivo | Drag & drop arquivo | Arquivo aceito | ⬜ |
| 49 | Click para upload | Clicar no dropzone | Seletor de arquivo abre | ⬜ |
| 50 | Arquivo inválido | Upload de .exe | Erro "tipo não suportado" | ⬜ |
| 51 | Arquivo muito grande | Upload > 100MB | Erro "arquivo muito grande" | ⬜ |

### 5.2 Conversão Simples (PNG → JPG)
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 52 | Upload PNG | Enviar arquivo .png | Arquivo aceito | ⬜ |
| 53 | Selecionar conversor | Escolher "PNG para JPG" | Conversor selecionado | ⬜ |
| 54 | Iniciar conversão | Clicar "Converter" | Processamento inicia | ⬜ |
| 55 | Conversão concluída | Aguardar | Status "Concluído" | ⬜ |
| 56 | Download disponível | Clicar "Download" | Arquivo .jpg baixado | ⬜ |
| 57 | Créditos debitados | Verificar saldo | Saldo reduzido | ⬜ |

### 5.3 Conversão MPP → XML (se disponível)
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 58 | Upload MPP | Enviar arquivo .mpp | Arquivo aceito | ⬜ |
| 59 | Conversor disponível | Verificar lista | "MPP para XML" visível | ⬜ |
| 60 | Conversão funciona | Executar conversão | XML gerado | ⬜ |

---

## 🔔 6. WEBHOOKS (Mercado Pago)

### 6.1 Verificação de Configuração
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 61 | URL configurada | Verificar painel MP | URL correta | ⬜ |
| 62 | Endpoint acessível | `curl -X POST https://SEU_DOMINIO/api/webhooks/mercadopago` | 200 ou 400 | ⬜ |
| 63 | Logs de webhook | `docker logs cannaconvert-backend \| grep webhook` | Logs presentes | ⬜ |

### 6.2 Teste de Webhook (via painel MP)
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 64 | Enviar teste | Usar "Testar" no painel MP | Webhook recebido | ⬜ |
| 65 | Verificar logs | Ver logs da aplicação | Evento processado | ⬜ |

---

## 📊 7. MONITORAMENTO E LOGS

### 7.1 Logs da Aplicação
| # | Teste | Comando | Status |
|---|-------|---------|--------|
| 66 | Logs frontend | `docker logs cannaconvert-frontend --tail 50` | ⬜ |
| 67 | Logs backend | `docker logs cannaconvert-backend --tail 50` | ⬜ |
| 68 | Logs PostgreSQL | `docker logs cannaconvert-postgres --tail 50` | ⬜ |
| 69 | Sem erros críticos | Verificar ausência de "ERROR", "FATAL" | ⬜ |

### 7.2 Logs NGINX
| # | Teste | Comando | Status |
|---|-------|---------|--------|
| 70 | Access log | `tail -f /var/log/nginx/cannaconvert_access.log` | ⬜ |
| 71 | Error log | `tail -f /var/log/nginx/cannaconvert_error.log` | ⬜ |
| 72 | Sem erros 5xx | `grep " 5[0-9][0-9] " /var/log/nginx/cannaconvert_access.log` | ⬜ |

---

## 🔒 8. SEGURANÇA

### 8.1 Headers de Segurança
| # | Teste | Verificação | Status |
|---|-------|-------------|--------|
| 73 | X-Frame-Options | `curl -I https://SEU_DOMINIO \| grep X-Frame` | ⬜ |
| 74 | X-Content-Type-Options | `curl -I https://SEU_DOMINIO \| grep X-Content` | ⬜ |
| 75 | Content-Security-Policy | `curl -I https://SEU_DOMINIO \| grep Content-Security` | ⬜ |
| 76 | Referrer-Policy | `curl -I https://SEU_DOMINIO \| grep Referrer` | ⬜ |

### 8.2 Rate Limiting
| # | Teste | Ação | Resultado Esperado | Status |
|---|-------|------|-------------------|--------|
| 77 | Rate limit funciona | Fazer 100+ requests rápidos | 429 Too Many Requests | ⬜ |
| 78 | Auth rate limit | 10+ tentativas de login | Bloqueio temporário | ⬜ |

---

## 📱 9. RESPONSIVIDADE

### 9.1 Testes Mobile
| # | Página | Viewport | Status |
|---|--------|----------|--------|
| 79 | Landing | 375x667 (iPhone SE) | ⬜ |
| 80 | Login | 375x667 | ⬜ |
| 81 | Dashboard | 375x667 | ⬜ |
| 82 | Credits | 375x667 | ⬜ |

### 9.2 Testes Tablet
| # | Página | Viewport | Status |
|---|--------|----------|--------|
| 83 | Landing | 768x1024 (iPad) | ⬜ |
| 84 | Dashboard | 768x1024 | ⬜ |

---

## 📢 10. GOOGLE ADS (se configurado)

| # | Teste | Verificação | Status |
|---|-------|-------------|--------|
| 85 | Slot header carrega | Verificar área de ADS no header | ⬜ |
| 86 | Slot sidebar carrega | Verificar área de ADS na sidebar | ⬜ |
| 87 | Sem erros no console | DevTools → Console | ⬜ |
| 88 | AdSense publisher ID correto | Verificar fonte da página | ⬜ |

---

## ✅ RESULTADO FINAL

### Resumo
| Categoria | Total | Passou | Falhou |
|-----------|-------|--------|--------|
| Infraestrutura | 18 | | |
| Endpoints | 11 | | |
| Autenticação | 10 | | |
| Créditos | 7 | | |
| Conversões | 11 | | |
| Webhooks | 5 | | |
| Monitoramento | 7 | | |
| Segurança | 6 | | |
| Responsividade | 6 | | |
| Google ADS | 4 | | |
| **TOTAL** | **85** | | |

### Status do Deploy
- [ ] ✅ **APROVADO** - Todos os testes passaram
- [ ] ⚠️ **APROVADO COM RESSALVAS** - Testes não críticos falharam
- [ ] ❌ **REPROVADO** - Testes críticos falharam

### Notas
```
Data do teste: ____/____/________
Responsável: _____________________
Versão: __________________________

Observações:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 📞 Em caso de falha crítica

1. **Não entre em pânico**
2. Verifique os logs: `docker compose logs -f`
3. Se necessário, faça rollback: `./rollback.sh`
4. Documente o problema
5. Abra uma issue no GitHub

---

**Documento gerado para CannaConvert - Dezembro 2024**
