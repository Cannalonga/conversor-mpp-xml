# 🚀 **Conversor MPP para XML - Sistema de Monetização**

[![Deploy](https://img.shields.io/badge/deploy-ready-brightgreen.svg)](https://github.com/Cannalonga/conversor-mpp-xml)
[![Node.js](https://img.shields.io/badge/node.js-18+-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Production](https://img.shields.io/badge/production-ready-green.svg)](https://github.com/Cannalonga/conversor-mpp-xml)

## 📋 **Visão Geral**

Sistema web profissional para conversão de arquivos Microsoft Project (.mpp) para XML, com sistema de monetização integrado via PIX. Desenvolvido com foco em performance, segurança e facilidade de deployment.

### 🎯 **Características Principais**
- ✅ Conversão .mpp → .xml otimizada
- 💰 Sistema de pagamento PIX integrado (R$ 10,00/conversão)
- 🔐 Painel administrativo completo
- 🛡️ Segurança enterprise (rate limiting, sanitização, CORS)
- 🚀 Deploy automatizado para produção
- 📊 Analytics e controle financeiro
- 📱 Interface responsiva e moderna

## 🏗️ **Arquitetura**

```
conversor-mpp-xml/
├── public/           # Frontend (HTML, CSS, JS)
│   ├── index.html    # Página principal
│   ├── css/style.css # Estilos modernos
│   └── js/app.js     # JavaScript funcional
├── api/              # Backend Node.js + Express
│   ├── server-minimal.js  # Servidor principal
│   ├── upload-utils.js    # Utilitários de upload
│   └── secure-auth.js     # Sistema de autenticação
├── admin/            # Painel administrativo
│   ├── index.html    # Dashboard completo
│   └── login.html    # Login seguro
├── uploads/          # Arquivos temporários
├── .env.production   # Configurações de produção
├── Dockerfile        # Container Docker
├── docker-compose.yml # Orquestração
└── deploy.sh         # Script de deploy automático
```

## 🚀 **Deploy Rápido para Produção**

### **Opção 1: Deploy Automatizado (Recomendado)**
```bash
# 1. Clone o repositório
git clone https://github.com/Cannalonga/conversor-mpp-xml.git
cd conversor-mpp-xml

# 2. Execute o script de deploy
chmod +x deploy.sh
./deploy.sh

# 3. Edite as configurações
nano .env
```

### **Opção 2: Deploy Manual com PM2**
```bash
# 1. Instalar dependências
npm install --production

# 2. Configurar ambiente
cp .env.production .env
# Edite o arquivo .env com suas credenciais

# 3. Iniciar com PM2
npx pm2 start api/server-minimal.js --name "mpp-converter"
npx pm2 startup
npx pm2 save
```

### **Opção 3: Deploy com Docker**
```bash
# 1. Build e execução
docker-compose up -d --build

# 2. Verificar status
docker-compose ps
docker-compose logs -f
```

## ⚙️ **Configuração de Produção**

### **Variáveis de Ambiente Essenciais**
```bash
# .env
NODE_ENV=production
PORT=3000

# Admin (ALTERE ESTAS CREDENCIAIS!)
ADMIN_USERNAME=seu-usuario
ADMIN_PASSWORD=sua-senha-segura

# PIX Configuration
PIX_KEY=seu-email@exemplo.com
PIX_MERCHANT_NAME=Sua Empresa
PIX_MERCHANT_CITY=Sua Cidade

# Security
JWT_SECRET=seu-jwt-secret-super-seguro
CORS_ORIGIN=https://seu-dominio.com
```

## 📊 **Recursos do Sistema**

### **Frontend Otimizado**
- Interface moderna e responsiva
- Upload com arrastar e soltar
- Feedback visual em tempo real
- Validação client-side
- Download automático

### **Backend Robusto**
- Rate limiting por IP
- Validação de arquivos
- Logs de segurança
- Cleanup automático
- API RESTful

### **Painel Admin**
- Dashboard com métricas
- Controle de conversões
- Relatórios financeiros
- Logs de atividade
- Configurações do sistema

## 🛡️ **Segurança**

- ✅ Helmet.js para headers seguros
- ✅ Rate limiting configurável
- ✅ Validação de tipos de arquivo
- ✅ Sanitização de inputs
- ✅ CORS configurado
- ✅ Upload em diretórios seguros
- ✅ Cleanup automático de arquivos
- ✅ Logs de tentativas suspeitas

## 📈 **Monitoring & Analytics**

- 📊 Métricas de uso em tempo real
- 💰 Controle de receitas
- 📈 Relatórios de conversão
- 🔍 Logs detalhados
- 📱 Dashboard responsivo

## 🚀 **Serviços de Hospedagem Recomendados**

### **VPS/Cloud (Recomendado)**
- **DigitalOcean** - Droplet $5/mês
- **AWS Lightsail** - $3.50/mês
- **Vultr** - $2.50/mês
- **Linode** - $5/mês

### **Hospedagem Compartilhada com Node.js**
- **Hostinger** - Suporte Node.js
- **Hostgator** - VPS com Node.js
- **Locaweb** - Cloud com Node.js

### **Deploy Gratuito (para testes)**
- **Heroku** - Deploy direto do GitHub
- **Railway** - Deploy automático
- **Render** - Hosting gratuito

## 🔧 **Configuração do Servidor**

### **Requisitos Mínimos**
- Node.js 18+
- 1GB RAM
- 10GB disco
- Ubuntu 20.04+

### **Configuração Nginx**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📝 **Uso da API**

### **Upload de Arquivo**
```javascript
const formData = new FormData();
formData.append('file', file);

fetch('/api/upload-test', {
    method: 'POST',
    body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

### **Autenticação Admin**
```javascript
fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'admin',
        password: 'password'
    })
});
```

## 🐛 **Troubleshooting**

### **Problemas Comuns**
```bash
# Verificar status do PM2
npx pm2 status

# Ver logs em tempo real
npx pm2 logs mpp-converter

# Reiniciar aplicação
npx pm2 restart mpp-converter

# Verificar porta
netstat -tlnp | grep :3000
```

### **Performance**
- Implementar Redis para cache
- Usar CDN para assets estáticos
- Configurar compressão gzip
- Otimizar imagens

## 📞 **Suporte**

- 📧 **Email**: canna.vendasonline@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/Cannalonga/conversor-mpp-xml/issues)
- 📖 **Docs**: [Wiki do Projeto](https://github.com/Cannalonga/conversor-mpp-xml/wiki)

## 📄 **Licença**

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**💡 Projeto pronto para produção!** Basta fazer o deploy e começar a monetizar conversões de arquivos MPP.

[![Deploy Now](https://img.shields.io/badge/Deploy%20Now-brightgreen.svg?style=for-the-badge)](https://github.com/Cannalonga/conversor-mpp-xml)