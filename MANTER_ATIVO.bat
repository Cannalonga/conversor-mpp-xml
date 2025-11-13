@echo off
title MPP Converter - Sempre Ativo
color 0A
cls

echo.
echo  ████████████████████████████████████
echo  █                                  █
echo  █     MPP CONVERTER - ESTÁVEL      █
echo  █                                  █
echo  ████████████████████████████████████
echo.
echo  🚀 Sistema de Auto-Restart Ativo
echo  🌐 URL: http://localhost:8082
echo  🛡️  Monitoramento Contínuo
echo  🛑 Feche esta janela para parar
echo.
echo  ════════════════════════════════════
echo.

python inicializador_robusto.py

echo.
echo  👋 Sistema parado.
echo  💡 Execute novamente para reiniciar.
echo.
pause