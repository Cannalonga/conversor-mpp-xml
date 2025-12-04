#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala FFmpeg automaticamente no Windows

.DESCRIPTION
    Este script baixa e instala o FFmpeg no Windows, adicionando ao PATH do sistema.
    Requer execução como Administrador.

.EXAMPLE
    .\install-ffmpeg.ps1

.NOTES
    Projeto: Conversor MPP XML
    Autor: Equipe de Desenvolvimento
#>

$ErrorActionPreference = "Stop"

# Configurações
$FFMPEG_VERSION = "7.0"
$INSTALL_DIR = "$env:ProgramFiles\ffmpeg"
$DOWNLOAD_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
$TEMP_ZIP = "$env:TEMP\ffmpeg.zip"
$TEMP_EXTRACT = "$env:TEMP\ffmpeg_extract"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FFmpeg Installer for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se já está instalado
$existingFFmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($existingFFmpeg) {
    Write-Host "[INFO] FFmpeg já está instalado em: $($existingFFmpeg.Source)" -ForegroundColor Yellow
    $version = & ffmpeg -version 2>&1 | Select-Object -First 1
    Write-Host "[INFO] Versão: $version" -ForegroundColor Yellow
    
    $confirm = Read-Host "Deseja reinstalar? (s/N)"
    if ($confirm -ne "s" -and $confirm -ne "S") {
        Write-Host "[OK] Instalação cancelada." -ForegroundColor Green
        exit 0
    }
}

# Verificar privilégios de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[ERRO] Este script requer privilégios de administrador!" -ForegroundColor Red
    Write-Host "Execute o PowerShell como Administrador e tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Criando diretório de instalação..." -ForegroundColor Cyan
if (Test-Path $INSTALL_DIR) {
    Write-Host "      Removendo instalação anterior..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $INSTALL_DIR
}
New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null

Write-Host "[2/5] Baixando FFmpeg (isso pode demorar)..." -ForegroundColor Cyan
try {
    # Usar TLS 1.2
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Baixar com progresso
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($DOWNLOAD_URL, $TEMP_ZIP)
    
    Write-Host "      Download concluído: $TEMP_ZIP" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha ao baixar FFmpeg: $_" -ForegroundColor Red
    
    # Tentar URL alternativa
    Write-Host "[INFO] Tentando URL alternativa..." -ForegroundColor Yellow
    $ALT_URL = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    try {
        $webClient.DownloadFile($ALT_URL, $TEMP_ZIP)
        Write-Host "      Download concluído (fonte alternativa)" -ForegroundColor Green
    } catch {
        Write-Host "[ERRO] Todas as tentativas de download falharam: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[3/5] Extraindo arquivos..." -ForegroundColor Cyan
try {
    # Limpar diretório temporário
    if (Test-Path $TEMP_EXTRACT) {
        Remove-Item -Recurse -Force $TEMP_EXTRACT
    }
    
    # Extrair ZIP
    Expand-Archive -Path $TEMP_ZIP -DestinationPath $TEMP_EXTRACT -Force
    
    # Encontrar o diretório extraído (pode ter nome diferente dependendo da fonte)
    $extractedDir = Get-ChildItem -Path $TEMP_EXTRACT -Directory | Select-Object -First 1
    
    if ($extractedDir) {
        # Copiar conteúdo do bin para o diretório de instalação
        $binPath = Join-Path $extractedDir.FullName "bin"
        if (Test-Path $binPath) {
            Copy-Item -Path "$binPath\*" -Destination $INSTALL_DIR -Recurse -Force
        } else {
            # Se não tem pasta bin, copiar tudo
            Copy-Item -Path "$($extractedDir.FullName)\*" -Destination $INSTALL_DIR -Recurse -Force
        }
    }
    
    Write-Host "      Arquivos extraídos para: $INSTALL_DIR" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha ao extrair: $_" -ForegroundColor Red
    exit 1
}

Write-Host "[4/5] Adicionando ao PATH do sistema..." -ForegroundColor Cyan
try {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    
    if ($currentPath -notlike "*$INSTALL_DIR*") {
        $newPath = "$currentPath;$INSTALL_DIR"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        
        # Atualizar PATH da sessão atual
        $env:Path = "$env:Path;$INSTALL_DIR"
        
        Write-Host "      PATH atualizado com sucesso" -ForegroundColor Green
    } else {
        Write-Host "      FFmpeg já está no PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[AVISO] Não foi possível adicionar ao PATH automaticamente" -ForegroundColor Yellow
    Write-Host "        Adicione manualmente: $INSTALL_DIR" -ForegroundColor Yellow
}

Write-Host "[5/5] Limpando arquivos temporários..." -ForegroundColor Cyan
Remove-Item -Path $TEMP_ZIP -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TEMP_EXTRACT -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  FFmpeg instalado com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verificar instalação
try {
    $ffmpegPath = Join-Path $INSTALL_DIR "ffmpeg.exe"
    if (Test-Path $ffmpegPath) {
        $version = & $ffmpegPath -version 2>&1 | Select-Object -First 1
        Write-Host "[OK] Versão instalada: $version" -ForegroundColor Cyan
        Write-Host "[OK] Localização: $ffmpegPath" -ForegroundColor Cyan
    }
} catch {
    Write-Host "[AVISO] Não foi possível verificar a versão" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "IMPORTANTE: Reinicie o PowerShell/CMD para usar o novo PATH" -ForegroundColor Yellow
Write-Host ""

# Testar se está funcionando
Write-Host "Testando FFmpeg..." -ForegroundColor Cyan
try {
    & "$INSTALL_DIR\ffmpeg.exe" -version 2>&1 | Select-Object -First 3
    Write-Host ""
    Write-Host "[OK] FFmpeg está funcionando corretamente!" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] FFmpeg instalado mas pode precisar de reiniciar o terminal" -ForegroundColor Yellow
}
