@echo off
title Conversor MPP para XML - Servidor
echo.
echo ========================================
echo    CONVERSOR MPP PARA XML - SERVIDOR
echo ========================================
echo.
echo 🚀 Iniciando servidor...
echo.

cd /d "%~dp0"

:START
python simple_working_server.py
echo.
echo ⚠️ Servidor parou. Pressione qualquer tecla para reiniciar ou feche a janela para sair.
pause >nul
goto START