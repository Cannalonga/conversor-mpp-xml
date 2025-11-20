# 🚀 Guia de Deploy em Produção - Conversor MPP para XML

## Sumário Executivo

Este guia fornece instruções passo-a-passo para fazer deploy do Conversor MPP para XML em um servidor de produção (VPS, Cloud, etc) com alta disponibilidade, monitoramento automático e recuperação de falhas.

## Pré-requisitos

### Hardware Mínimo Recomendado
- **CPU**: 2 cores (4+ recomendado)
- **RAM**: 2GB (4GB+ para bom desempenho)
- **Disco**: 20GB (SSD recomendado)
- **Banda**: 1Mbps dedicado

### Software Necessário
- **Node.js**: v18+ (recomendado v20+)
- **npm**: v9+
- **PM2**: gerenciador de processos Node.js
- **Git**: para versionamento
- **OpenSSL**: para HTTPS (opcional)

## Instalação do Node.js

### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # Verificar versão
npm -v   # Verificar npm
```

### CentOS/RHEL
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install nodejs
```

### Windows Server
1. Download: https://nodejs.org/en/download/
2. Executar instalador
3. Verificar: `node -v` e `npm -v`

## Instalação do PM2

```bash
npm install -g pm2
pm2 startup
pm2 save
```

## Deploy em Produção

### Opção 1: Deployment Manual

#### 1. Clonar repositório
```bash
cd /opt  # ou seu diretório de escolha
git clone <seu-repo-url> mpp-converter
cd mpp-converter
```

#### 2. Instalar dependências
```bash
npm install --production
```

#### 3. Configurar variáveis de ambiente
```bash
# Criar arquivo .env.production
cp .env.example .env.production

# Editar configurações
nano .env.production
```

Variáveis importantes:
```
NODE_ENV=production
PORT=3000
PIX_KEY=seu-chave-pix
LOG_LEVEL=INFO
MAX_FILE_SIZE=100000000
```

#### 4. Iniciar aplicação
```bash
NODE_ENV=production npm start
```

### Opção 2: Deployment com Script (Recomendado)

#### Windows PowerShell
```powershell
# Navegar para o diretório do projeto
cd C:\mpp-converter

# Executar script de deploy
.\scripts\deploy-production.ps1 -Command start

# Verificar status
.\scripts\deploy-production.ps1 -Command status

# Ver logs
.\scripts\deploy-production.ps1 -Command logs

# Iniciar monitoramento
.\scripts\deploy-production.ps1 -Command monitor
```

#### Linux/VPS
```bash
# Navegar para o diretório do projeto
cd /opt/mpp-converter

# Dar permissão de execução
chmod +x scripts/deploy-production.sh

# Executar deploy
./scripts/deploy-production.sh start

# Verificar status
./scripts/deploy-production.sh status

# Ver logs
./scripts/deploy-production.sh logs

# Iniciar monitoramento
./scripts/deploy-production.sh monitor
```

## Configuração com PM2

### Arquivo `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'mpp-converter',
      script: 'api/server.js',
      instances: 'max',  // Usar todos os cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'INFO'
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      instance_var: 'INSTANCE_ID'
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'seu-servidor.com',
      ref: 'origin/main',
      repo: 'git@github.com:seu-usuario/mpp-converter.git',
      path: '/opt/mpp-converter',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production'
    }
  }
};
```

### Iniciar com PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Configuração de Servidor Web (Nginx)

### Reverse Proxy
```nginx
upstream mpp_converter {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
    keepalive 64;
}

server {
    listen 80;
    server_name converter.seudominio.com;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name converter.seudominio.com;
    
    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/converter.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/converter.seudominio.com/privkey.pem;
    
    # Compressão
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    
    # Upload máximo
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://mpp_converter;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Endpoints de monitoramento
    location /health {
        proxy_pass http://mpp_converter;
        access_log off;
    }
    
    location /metrics {
        proxy_pass http://mpp_converter;
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

## Configuração de HTTPS com Let's Encrypt

```bash
# Instalar certbot
sudo apt-get install certbot python3-certbot-nginx

# Obter certificado
sudo certbot certonly --nginx -d converter.seudominio.com

# Auto-renovação
sudo systemctl enable certbot.timer
```

## Monitoramento e Alertas

### Prometheus + Grafana

#### Configurar Prometheus
```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mpp-converter'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

#### Configurar Grafana
1. Adicionar Prometheus como data source
2. Importar dashboard ou criar novo
3. Configurar alertas baseado em métricas

### Verificação de Saúde Automática

```bash
# Script de health check (cron job)
#!/bin/bash

HEALTH=$(curl -s http://localhost:3000/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH" != "HEALTHY" ] && [ "$HEALTH" != "DEGRADED" ]; then
    # Enviar alerta
    mail -s "Alerta: Servidor MPP Converter com problema!" admin@seudominio.com
    
    # Tentar reiniciar
    pm2 restart mpp-converter
fi
```

Adicionar ao crontab:
```bash
# Verificar a cada 5 minutos
*/5 * * * * /opt/mpp-converter/scripts/health-check.sh
```

## Backup e Recuperação

### Backup Automático
```bash
#!/bin/bash
# /opt/mpp-converter/scripts/backup.sh

BACKUP_DIR="/backups/mpp-converter"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup database e arquivos importantes
tar -czf $BACKUP_FILE \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    /opt/mpp-converter

# Remover backups antigos (>30 dias)
find $BACKUP_DIR -type f -mtime +30 -delete

# Upload para armazenamento (opcional)
aws s3 cp $BACKUP_FILE s3://meu-bucket/backups/
```

Adicionar ao crontab:
```bash
# Backup diário às 2 AM
0 2 * * * /opt/mpp-converter/scripts/backup.sh
```

## Escalabilidade

### Múltiplas Instâncias
```javascript
// ecosystem.config.js
instances: 4,  // Em vez de 'max'
```

### Load Balancing
```nginx
upstream mpp_cluster {
    least_conn;  # Usa algoritmo de conexões mínimas
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}
```

## Performance Tuning

### Node.js
```bash
# Aumentar max file descriptors
ulimit -n 65535

# Usar mais memória (se disponível)
NODE_OPTIONS="--max-old-space-size=1024" npm start
```

### Sistema
```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
```

## Segurança

### Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Usuário Dedicado
```bash
sudo useradd -m -s /bin/bash nodeapp
sudo usermod -aG sudo nodeapp
sudo chown -R nodeapp:nodeapp /opt/mpp-converter
```

### Variáveis de Ambiente Seguras
```bash
# Não commitar .env em git
echo ".env.production" >> .gitignore

# Usar gerenciador de secrets
# Exemplo: AWS Secrets Manager, HashiCorp Vault
```

## Troubleshooting

### Servidor não inicia
```bash
# Verificar porta em uso
lsof -i :3000

# Verificar logs
pm2 logs mpp-converter

# Testar localmente
NODE_ENV=production node api/server.js
```

### Memória crescendo
```bash
# Ver tamanho do heap
node --expose-gc api/server.js

# Limpar caches
pm2 restart mpp-converter
```

### Disco cheio
```bash
# Verificar tamanho de logs
du -sh logs/

# Limpar logs antigos
./scripts/deploy-production.sh cleanup

# Limpar uploads expirados
rm -rf uploads/expired/*
```

## Checklist de Deploy

- ✅ Node.js v18+ instalado
- ✅ PM2 instalado e configurado
- ✅ Variáveis de ambiente configuradas
- ✅ Dependências instaladas (`npm install`)
- ✅ HTTPS/SSL configurado
- ✅ Nginx reverse proxy funcionando
- ✅ Backup automático agendado
- ✅ Monitoramento ativo (Prometheus/Grafana)
- ✅ Health check automático
- ✅ Firewall configurado
- ✅ Logs sendo rotacionados
- ✅ Teste de failover completado

## Suporte e Contato

Para dúvidas ou problemas:
- 📧 Email: suporte@seudominio.com
- 💬 Chat: https://seu-chat.com
- 📖 Docs: https://docs.seudominio.com

---

**Última atualização**: 2025-11-18  
**Versão**: 1.0.0
