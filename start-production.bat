@echo off
REM Script de inicialização para Windows

echo 🚀 Iniciando MPP Converter em modo produção...

REM Parar processos PM2 existentes
pm2 delete mpp-converter-prod >nul 2>&1

REM Iniciar com PM2
pm2 start ecosystem.config.json --env production

REM Mostrar status
pm2 status

echo ✅ Servidor iniciado com PM2!
echo 📊 Monitoramento: pm2 monit
echo 📋 Logs: pm2 logs mpp-converter-prod
echo 🔄 Restart: pm2 restart mpp-converter-prod
echo ⛔ Stop: pm2 stop mpp-converter-prod

pause