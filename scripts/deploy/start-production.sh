#!/bin/bash
# Script de inicialização para produção

echo "🚀 Iniciando MPP Converter em modo produção..."

# Parar processos PM2 existentes
pm2 delete mpp-converter-prod 2>/dev/null || true

# Iniciar com PM2
pm2 start ecosystem.config.json --env production

# Mostrar status
pm2 status

echo "✅ Servidor iniciado com PM2!"
echo "📊 Monitoramento: pm2 monit"
echo "📋 Logs: pm2 logs mpp-converter-prod"
echo "🔄 Restart: pm2 restart mpp-converter-prod"
echo "⛔ Stop: pm2 stop mpp-converter-prod"