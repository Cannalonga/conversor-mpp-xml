# 🚀 Conversor MPP para XML - Sistema Enterprise

[![Status](https://img.shields.io/badge/Status-Produção-green.svg)](http://localhost:3000)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-blue.svg)](https://nodejs.org/)
[![PM2](https://img.shields.io/badge/PM2-Enabled-brightgreen.svg)](https://pm2.keymetrics.io/)

> Sistema profissional para conversão de arquivos Microsoft Project (.mpp) para XML com interface web moderna, controle financeiro e painel administrativo completo.

## 📋 Características Principais

### ✨ Funcionalidades Core
- **Conversão MPP → XML** - Interface web intuitiva
- **Upload Seguro** - Validação de arquivos e rate limiting  
- **Download Automático** - Arquivos XML gerados instantaneamente
- **Sistema de Cobrança** - R$ 10,00 por conversão
- **Disclaimer Transparente** - Informações sobre limitações técnicas

### 🛡️ Segurança Enterprise
- **Autenticação Admin** - Login protegido com credenciais
- **Rate Limiting** - Proteção contra abuso de API
- **Validação de Arquivos** - Verificação de tipos e tamanhos
- **Logs Centralizados** - Monitoramento completo de atividades

### 💰 Sistema Financeiro
- **Controle de Receitas** - Rastreamento automático de transações
- **Calculadora IR 2025** - Tabelas atualizadas do Imposto de Renda
- **Relatórios Detalhados** - Estatísticas diárias, mensais e anuais
- **Dashboard Administrativo** - Interface completa de gestão

### 🔧 Infraestrutura de Produção
- **PM2 Process Manager** - Estabilidade e auto-restart
- **Zero Downtime** - Sistema robusto para produção
- **Logs Persistentes** - Monitoramento e debugging
- **Scripts de Deploy** - Inicialização automática

## 🚀 Quick Start

### 1. Inicialização Rápida
```bash
# Execute o script automático
restart-completo.bat
```

### 2. Inicialização Manual
```bash
# Navegar para o diretório
cd "C:\Users\rafae\Desktop\PROJETOS DE ESTUDOS\CONVERSOR MPP XML"

# Iniciar com PM2
pm2 start ecosystem.config.json --env production

# Verificar status
pm2 status
```

### 3. Acessar o Sistema
- **Frontend:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Health Check:** http://localhost:3000/api/health

## 🔐 Credenciais de Admin

### Acesso do Proprietário
```
Usuário: Alcap0ne
Senha: C@rolin@36932025
Email 2FA: rafaelcannalonga2@hotmail.com
```

### Recursos de Segurança
- **Autenticação personalizada** - Credenciais exclusivas do proprietário
- **2FA via Email** - Notificações de login para rafaelcannalonga2@hotmail.com
- **Logs de acesso** - Monitoramento completo de tentativas de login
- **Sessão segura** - Token-based authentication com timeout

> ⚠️ **SEGURANÇA:** Credenciais configuradas exclusivamente para o proprietário Rafael Cannalonga

## 🏗️ Estrutura do Projeto

```
📦 conversor-mpp-xml/
├── 📁 api/                    # Backend Node.js
│   ├── server-minimal.js      # Servidor principal
│   └── ...
├── 📁 public/                 # Frontend
│   ├── index.html            # Interface principal
│   ├── 📁 css/
│   │   └── style.css         # Estilos responsivos
│   └── 📁 js/
│       └── app_clean_new.js   # JavaScript principal
├── 📁 admin/                  # Painel Administrativo
│   ├── login.html            # Página de login
│   └── dashboard.html        # Dashboard completo
├── 📁 uploads/                # Diretório de arquivos
│   ├── 📁 incoming/          # Arquivos recebidos
│   ├── 📁 converted/         # XMLs gerados
│   ├── 📁 processing/        # Em processamento
│   └── 📁 expired/           # Arquivos expirados
├── 📁 logs/                   # Logs do sistema
├── ecosystem.config.json     # Configuração PM2
├── package.json              # Dependências Node.js
├── restart-completo.bat      # Script de inicialização
└── README.md                 # Esta documentação
```

## ⚙️ Configuração de Produção

### Variáveis de Ambiente
```bash
# Opcional: Credenciais admin customizadas
ADMIN_USER=seu_usuario
ADMIN_PASS=sua_senha_super_segura

# Opcional: Configurações do servidor
PORT=3000
NODE_ENV=production
```

### Comandos PM2
```bash
# Status do sistema
pm2 status

# Logs em tempo real
pm2 logs mpp-converter-prod

# Reiniciar serviço
pm2 restart mpp-converter-prod

# Parar serviço
pm2 stop mpp-converter-prod

# Salvar configuração
pm2 save
```

## 📊 Painel Administrativo

### Funcionalidades do Dashboard
1. **Estatísticas em Tempo Real**
   - Conversões do dia
   - Total de arquivos processados
   - Status do servidor
   - Uso de disco

2. **Gestão Financeira**
   - Receita total e diária
   - Calculadora de IR 2025
   - Histórico de transações
   - Relatórios exportáveis

3. **Monitoramento**
   - Logs do sistema em tempo real
   - Atividade recente
   - Gestão de arquivos
   - Configurações do servidor

## 🚀 Deploy em Produção

### Checklist de Produção
- [ ] Credenciais admin alteradas
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] DNS apontando corretamente

### Problemas Comuns
1. **Porta em uso:** Altere a porta no `ecosystem.config.json`
2. **Falha no PM2:** Reinstale com `npm install -g pm2`
3. **Erro 500:** Verifique logs com `pm2 logs`
4. **Admin não carrega:** Limpe localStorage do navegador

## 📝 Changelog

### v1.0 (13/11/2025)
- ✅ Sistema completo de conversão MPP → XML
- ✅ Interface web moderna e responsiva  
- ✅ Painel administrativo com autenticação
- ✅ Sistema financeiro com calculadora IR 2025
- ✅ Infraestrutura PM2 para produção
- ✅ Segurança com rate limiting
- ✅ Disclaimer transparente sobre limitações

---

**🏆 Sistema Enterprise Completo - Pronto para Produção! 🏆**

*Desenvolvido em Novembro 2025*