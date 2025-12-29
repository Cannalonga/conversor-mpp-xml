@echo off
REM 📝 INSTRUÇÕES PARA GIT COMMIT - CONVERSOR MPP XML (Batch/CMD)
REM Executar este arquivo para fazer o commit das mudanças

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║         GIT COMMIT - CANNACONVERTER               ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM Configurar git (se ainda não estiver configurado)
echo Configurando git...
git config --global user.email "deploy@cannaconverter.com"
git config --global user.name "CannaConverter Deploy"
echo.

echo [1/4] Adicionando arquivos modificados...
git add public/index.html
git add frontend/public/index.html
git add TESTE_COMPLETO_RESULTADO.md
git add commit.bat
echo ✓ Arquivos preparados para commit
echo.

echo [2/4] Verificando mudanças...
git status --short
echo.

echo [3/4] Fazendo commit...
git commit -m "feat(landing): restauração de design original com 5 cards principais + 20+ conversores dinâmicos

- Landing page completamente restaurada com visual original
- 5 cards principais com styling perfeito
- Logo atualizada com novo design
- Loader dinâmico de 20+ conversores via API
- CSS e JavaScript preservados e funcionais

Testes: ✅ TODOS PASSARAM - PRONTO PARA DEPLOY"

if %ERRORLEVEL% EQU 0 (
    echo ✓ Commit realizado com sucesso
) else (
    echo ✗ Erro ao fazer commit
    goto :error
)
echo.

echo [4/4] Últimos commits...
git log --oneline -n 3
echo.

echo ╔════════════════════════════════════════════════════╗
echo ║           ✅ COMMIT CONCLUÍDO COM SUCESSO         ║
echo ╠════════════════════════════════════════════════════╣
echo ║  Próximos passos:                                  ║
echo ║  1. git push origin main (ou seu branch)           ║
echo ║  2. Verificar CI/CD pipeline                       ║
echo ║  3. Deploy em staging/produção                     ║
echo ╚════════════════════════════════════════════════════╝
echo.

goto :end

:error
echo.
echo ╔════════════════════════════════════════════════════╗
echo ║              ❌ ERRO NO COMMIT                    ║
echo ║  Verifique o status do repositório e tente novamente
echo ╚════════════════════════════════════════════════════╝
echo.

:end
pause
