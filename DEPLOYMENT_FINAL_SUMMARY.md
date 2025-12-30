CANNACONVERT - DEPLOYMENT SUMMARY
=================================

Data: 29 de Dezembro de 2025
Status: DEPLOYED
Dominio: cannaconvert.store
IP Servidor: 213.199.35.118
Provedor: Contabo VPS

TIMELINE DO DEPLOYMENT
======================

1. Diagnostico Inicial
   - Servidor estava offline
   - Acionado power-on no painel Contabo
   - Servidor iniciou com sucesso em 3 minutos

2. Teste de Conectividade
   - Test-NetConnection retornou TRUE para porta 22
   - SSH conectado com sucesso

3. Deploy da Aplicacao
   - Script: deploy-production-clean.sh
   - Repositorio: https://github.com/Cannalonga/conversor-mpp-xml.git
   - Branch: deploy/production
   - Node.js: 20.19.6
   - npm ci executado com sucesso
   - Dependencias instaladas: 35+ pacotes

4. Configuracao de Servicos
   - systemd service criado
   - NGINX configurado como reverse proxy
   - Porta: 3000 (app) -> 80/443 (NGINX)
   - Dominio: cannaconvert.store

5. Resolucao de Problemas
   - Memory leak detectado
   - Multiplos processos Node rodando simultaneamente
   - Problema: heapUsagePercent atingindo 94%
   - Solucao: Limitar a 128MB com --expose-gc

ARQUITETURA FINAL
=================

Frontend:
  - HTML/CSS/JavaScript em /opt/cannaconvert/public
  - Servido via NGINX
  - Cache-Control implementado

Backend:
  - Node.js 20.x rodando api/server.js
  - Express.js framework
  - SQLite database em /opt/cannaconvert/data
  - Uploads em /opt/cannaconvert/uploads
  - Logs em /opt/cannaconvert/logs

Proxy:
  - NGINX listening on port 80
  - Reverse proxy para localhost:3000
  - Server blocks para cannaconvert.store e www.cannaconvert.store

Gerenciamento:
  - systemd service: cannaconvert.service
  - Auto-restart ativado
  - Memory limits: 128MB heap, 200MB max

VERIFICACOES REALIZADAS
=======================

Teste 1: Health Check
Command: curl http://localhost:3000/health
Result: PASSED (JSON response com status)

Teste 2: Conectividade DNS
Domain: cannaconvert.store
Status: Resolvendo corretamente para 213.199.35.118

Teste 3: NGINX
Status: Running
Config: /etc/nginx/sites-available/cannaconvert

Teste 4: Node.js Process
Status: Running via systemd
PID: Dinamico (systemd gerencia)

COMANDOS UTEIS PARA MANUTENCAO
==============================

Ver status da aplicacao:
  systemctl status cannaconvert.service

Ver logs em tempo real:
  journalctl -u cannaconvert.service -f

Reiniciar aplicacao:
  systemctl restart cannaconvert.service

Ver memoria usage:
  ps aux | grep "node api"

Testar saude:
  curl http://localhost:3000/health

Ver status do NGINX:
  systemctl status nginx
  nginx -t (test config)

DEPENDENCIAS DOCUMENTADAS
========================

Backend (Node.js):
- express 4.18.2
- multer 1.4.5-lts.1 (upload)
- cors 2.8.5
- helmet 7.1.0 (security)
- compression 1.8.1
- jsonwebtoken 9.0.2 (JWT)
- bcryptjs 3.0.3 (password hash)
- sqlite3 5.1.7
- redis 5.9.0 (cache)
- bull 4.16.5 (queue)
- prom-client 15.1.3 (metrics)
- winston 3.18.3 (logging)
- xlsx 0.18.5 (excel/csv)
- xml2js 0.6.2 (xml parsing)

Python (requirements.txt):
- flask >=2.3.0
- python-dotenv >=1.0.0

Detalhes completos em: DEPENDENCIAS_PROJETO.md

PROXIMOS PASSOS (TODO)
======================

1. MEMORIA LEAK INVESTIGATION
   - Investigar heapUsagePercent alto
   - Verificar listeners nao removidos
   - Revisar cache implementation
   - Considerar usar worker threads

2. SSL/HTTPS
   - Instalar certbot
   - Gerar certificado Let's Encrypt
   - Atualizar NGINX para SSL
   - Redirect HTTP -> HTTPS

3. MONITORING
   - Setup Prometheus para metrics
   - Setup Grafana para dashboards
   - Alertas para memory/cpu

4. BACKUP
   - SQLite database backup diario
   - Uploads directory backup
   - Version control hooks

5. LOAD TESTING
   - Testar capacidade com ab ou k6
   - Validar performance sob carga
   - Otimizar timeouts

NOTAS IMPORTANTES
=================

- Servidor tem 4 cores, 4GB RAM (tipico Contabo)
- Memory leak CRITICA - investigar API code
- Script de restart automatico recomendado
- DNS ja propagado e funcionando
- NGINX configurado corretamente

CONTATOS E ACESSO
=================

Servidor: root@213.199.35.118
Painel Contabo: https://my.contabo.com
Repositorio: https://github.com/Cannalonga/conversor-mpp-xml
Branch Production: deploy/production

=================================
Deployment finalizado com sucesso
Aplicacao ONLINE em: cannaconvert.store
=================================
