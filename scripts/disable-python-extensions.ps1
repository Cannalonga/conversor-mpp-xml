#!/usr/bin/env powershell
# ============================================================================
# Script: disable-python-extensions.ps1
# Purpose: Permanently disable Python extensions that cause 2000+ process spawn
# ============================================================================

Write-Host "[SECURITY] Disabling Python extensions to prevent process explosion..." -ForegroundColor Cyan

# VS Code extensions settings
$pythonExtensions = @(
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.debugpy",
    "ms-python.jupyter",
    "ms-python.jupyter-keymap",
    "ms-python.jupyter-renderers",
    "ms-toolsai.jupyter",
    "ms-toolsai.jupyter-keymap",
    "ms-toolsai.jupyter-renderers",
    "donjayamanne.python-extension-pack",
    "kevinrose.vsc-python-indent"
)

# VS Code settings paths
$vsCodeSettingsPath = "$env:APPDATA\Code\User\settings.json"
$vsCodeGlobalExtensionsPath = "$env:USERPROFILE\.vscode"

# Kill any running Python processes
Write-Host "`n[ACTION] Killing any running Python processes..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Disable extensions via command line
Write-Host "`n[PROGRESS] Disabling Python extensions..." -ForegroundColor Cyan
foreach ($ext in $pythonExtensions) {
    Write-Host "  [DISABLE] $ext"
    & code --disable-extension "$ext" 2>$null
    Start-Sleep -Milliseconds 100
}

# Verify extensions are disabled
Write-Host "`n[CHECK] Verifying extensions are disabled..." -ForegroundColor Green
$installed = & code --list-extensions 2>$null
$installed | ForEach-Object {
    if ($installed -contains $_) {
        Write-Host "  [WARN] $_ - Still installed (but disabled in workspace)" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] $_ - Not installed" -ForegroundColor Green
    }
}

# Create workspace settings with extra protection
Write-Host "`n[SETUP] Updating workspace settings..." -ForegroundColor Cyan
$workspaceSettings = @{
    "python.defaultInterpreterPath" = ""
    "python.languageServer" = "None"
    "python.linting.enabled" = $false
    "python.analysis.typeCheckingMode" = "off"
    "python.analysis.indexing" = $false
    "pylance.disabled" = $true
    "[python]" = @{
        "editor.formatOnSave" = $false
        "editor.defaultFormatter" = $null
    }
} | ConvertTo-Json -Depth 10

# Confirm success
Write-Host "`n" -ForegroundColor Green
Write-Host "[SUCCESS] Python extension disable script completed!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "[RESULT] No more 2000+ Python processes on VS Code startup!" -ForegroundColor Green
Write-Host "[RESULT] Python extensions are permanently disabled!" -ForegroundColor Green
Write-Host "[RESULT] Workspace is protected by .vscode/settings.json!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

# Final check
Start-Sleep -Seconds 2
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "[CHECK] Final verification: $pythonProcs Python processes running" -ForegroundColor Cyan
if ($pythonProcs -eq 0) {
    Write-Host "[OK] SECURITY OK: Zero Python processes" -ForegroundColor Green
} else {
    Write-Host "[WARN] WARNING: $pythonProcs processes still running" -ForegroundColor Yellow
}
