@echo off
cls
echo.
echo ============================================
echo   CONVERSOR MPP PARA XML - INICIANDO
echo ============================================
echo.

REM Parar servidores anteriores
echo Parando servidores anteriores...
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 >nul

REM Iniciar servidor em background
echo Iniciando servidor...
start /B python simple_working_server.py

REM Aguardar servidor iniciar
echo Aguardando servidor inicializar...
timeout /t 3 >nul

REM Abrir navegador
echo Abrindo navegador...
start http://localhost:8080

echo.
echo ============================================
echo   SERVIDOR ATIVO!
echo ============================================
echo   URL: http://localhost:8080
echo   Pressione qualquer tecla para parar
echo ============================================
echo.

pause >nul

REM Parar servidor ao sair
echo Parando servidor...
taskkill /f /im python.exe >nul 2>&1
echo Servidor parado!
timeout /t 2 >nul