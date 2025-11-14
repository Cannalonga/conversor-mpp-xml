@echo off
echo ========================================
echo    CONVERSOR MPP - RESTART COMPLETO
echo ========================================
echo.

cd /d "C:\Users\rafae\Desktop\PROJETOS DE ESTUDOS\CONVERSOR MPP XML"

echo 1. Configurando environment...
set PATH=%PATH%;C:\Program Files\nodejs;C:\Users\rafae\AppData\Roaming\npm

echo 2. Parando processos anteriores...
taskkill /f /im node.exe >nul 2>&1
pm2 delete all >nul 2>&1

echo 3. Iniciando servidor PM2...
pm2 start ecosystem.config.json --env production

echo 4. Verificando status...
pm2 status

echo 5. Testando servidor...
timeout /t 3 /nobreak >nul
curl -s http://localhost:3000/api/health || echo Servidor ainda iniciando...

echo.
echo ========================================
echo    SISTEMA INICIADO COM SUCESSO!
echo ========================================
echo.
echo Interfaces disponiveis:
echo - Frontend: http://localhost:3000
echo - Admin: http://localhost:3000/admin
echo.
echo Para verificar logs: pm2 logs mpp-converter-prod
echo Para parar: pm2 stop mpp-converter-prod
echo.

start http://localhost:3000
pause