@echo off
echo 🚀 Criando atalho na área de trabalho...

set "desktop=%USERPROFILE%\Desktop"
set "target=%CD%\MANTER_ATIVO.bat"
set "shortcut=%desktop%\MPP Converter.lnk"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%shortcut%'); $Shortcut.TargetPath = '%target%'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.IconLocation = 'shell32.dll,21'; $Shortcut.Description = 'Conversor MPP para XML - Sempre Ativo'; $Shortcut.Save()"

if exist "%shortcut%" (
    echo ✅ Atalho criado na área de trabalho!
    echo 📁 Nome: "MPP Converter.lnk"
    echo 💡 Clique duas vezes no atalho para iniciar
) else (
    echo ❌ Erro ao criar atalho
)

echo.
pause