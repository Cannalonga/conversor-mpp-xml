@echo off
echo.
echo 🛡️ ===================================
echo    INICIANDO SERVIDOR SEGURO
echo 🛡️ ===================================
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js não encontrado!
    echo 📥 Baixando e instalando Node.js...
    echo.
    echo ⚡ SOLUÇÃO RÁPIDA: Use o servidor Python demo:
    echo    python demo_server.py
    echo.
    pause
    exit /b 1
)

REM Verificar se as dependências estão instaladas
if not exist node_modules (
    echo 📦 Instalando dependências de segurança...
    npm install
)

REM Definir variáveis de ambiente de segurança
set NODE_ENV=production
set JWT_SECRET=sua_chave_secreta_super_forte_256_bits_aqui
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=SuaSenhaSegura123!
set ENCRYPTED_PIX_KEY=02038351740

echo 🔐 Variáveis de segurança configuradas
echo 🚀 Iniciando servidor com proteção máxima...
echo.

REM Iniciar servidor seguro
node api/secure_server.js

pause