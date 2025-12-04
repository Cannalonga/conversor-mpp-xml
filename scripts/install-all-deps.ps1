#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala todas as dependências dos conversores no Windows

.DESCRIPTION
    Este script instala: FFmpeg, Ghostscript, Poppler, Pandoc, LibreOffice
    Requer execução como Administrador.

.PARAMETER All
    Instala todas as dependências

.PARAMETER FFmpeg
    Instala apenas FFmpeg

.PARAMETER Ghostscript
    Instala apenas Ghostscript

.PARAMETER Poppler
    Instala apenas Poppler

.PARAMETER Pandoc
    Instala apenas Pandoc

.PARAMETER LibreOffice
    Instala apenas LibreOffice

.EXAMPLE
    .\install-all-deps.ps1 -All
    .\install-all-deps.ps1 -FFmpeg -Pandoc

.NOTES
    Projeto: Conversor MPP XML
#>

param(
    [switch]$All,
    [switch]$FFmpeg,
    [switch]$Ghostscript,
    [switch]$Poppler,
    [switch]$Pandoc,
    [switch]$LibreOffice
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$TOOLS_DIR = "$env:ProgramFiles\ConverterTools"
$BIN_DIR = "$TOOLS_DIR\bin"

# Se nenhum parâmetro, mostrar ajuda
if (-not ($All -or $FFmpeg -or $Ghostscript -or $Poppler -or $Pandoc -or $LibreOffice)) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Instalador de Dependências" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\install-all-deps.ps1 [opcoes]" -ForegroundColor White
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "  -All          Instala todas as dependências"
    Write-Host "  -FFmpeg       Instala FFmpeg (conversões de vídeo/áudio)"
    Write-Host "  -Ghostscript  Instala Ghostscript (compressão PDF)"
    Write-Host "  -Poppler      Instala Poppler (PDF para imagem)"
    Write-Host "  -Pandoc       Instala Pandoc (conversões de documento)"
    Write-Host "  -LibreOffice  Instala LibreOffice (DOCX para PDF, etc)"
    Write-Host ""
    Write-Host "Exemplo:" -ForegroundColor Green
    Write-Host "  .\install-all-deps.ps1 -All"
    Write-Host "  .\install-all-deps.ps1 -FFmpeg -Pandoc"
    exit 0
}

# Verificar admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[ERRO] Execute como Administrador!" -ForegroundColor Red
    exit 1
}

# Criar diretórios
Write-Host "[SETUP] Criando diretórios..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $TOOLS_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null

# Função para adicionar ao PATH
function Add-ToPath {
    param([string]$PathToAdd)
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$PathToAdd*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$PathToAdd", "Machine")
        $env:Path = "$env:Path;$PathToAdd"
        Write-Host "      Adicionado ao PATH: $PathToAdd" -ForegroundColor Green
    }
}

# Função genérica de download
function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($Url, $OutputPath)
}

# ==========================================
# FFmpeg
# ==========================================
if ($All -or $FFmpeg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Instalando FFmpeg" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $FFMPEG_DIR = "$TOOLS_DIR\ffmpeg"
    $FFMPEG_ZIP = "$env:TEMP\ffmpeg.zip"
    $FFMPEG_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    
    try {
        Write-Host "[1/3] Baixando FFmpeg..." -ForegroundColor Yellow
        Download-File -Url $FFMPEG_URL -OutputPath $FFMPEG_ZIP
        
        Write-Host "[2/3] Extraindo..." -ForegroundColor Yellow
        $extractDir = "$env:TEMP\ffmpeg_extract"
        Expand-Archive -Path $FFMPEG_ZIP -DestinationPath $extractDir -Force
        
        $sourceDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
        if (Test-Path $FFMPEG_DIR) { Remove-Item -Recurse -Force $FFMPEG_DIR }
        Move-Item -Path "$($sourceDir.FullName)\bin" -Destination $FFMPEG_DIR -Force
        
        Write-Host "[3/3] Configurando PATH..." -ForegroundColor Yellow
        Add-ToPath $FFMPEG_DIR
        
        # Limpeza
        Remove-Item $FFMPEG_ZIP -Force -ErrorAction SilentlyContinue
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host "[OK] FFmpeg instalado!" -ForegroundColor Green
        & "$FFMPEG_DIR\ffmpeg.exe" -version 2>&1 | Select-Object -First 1
    } catch {
        Write-Host "[ERRO] Falha ao instalar FFmpeg: $_" -ForegroundColor Red
    }
}

# ==========================================
# Ghostscript
# ==========================================
if ($All -or $Ghostscript) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Instalando Ghostscript" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Ghostscript precisa de instalador, vamos usar a versão portable
    $GS_DIR = "$TOOLS_DIR\ghostscript"
    $GS_VERSION = "10.02.1"
    $GS_ZIP = "$env:TEMP\gs.zip"
    $GS_URL = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10021/gs10021w64.exe"
    
    try {
        Write-Host "[INFO] Ghostscript requer instalador manual." -ForegroundColor Yellow
        Write-Host "[INFO] Baixe de: https://ghostscript.com/releases/gsdnld.html" -ForegroundColor Yellow
        Write-Host "[INFO] Ou use: winget install ArtifexSoftware.Ghostscript" -ForegroundColor Yellow
        
        # Verificar se já está instalado
        $gsPath = Get-Command gswin64c -ErrorAction SilentlyContinue
        if ($gsPath) {
            Write-Host "[OK] Ghostscript já está instalado: $($gsPath.Source)" -ForegroundColor Green
        } else {
            Write-Host "[AVISO] Ghostscript não encontrado no sistema" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERRO] Falha: $_" -ForegroundColor Red
    }
}

# ==========================================
# Poppler
# ==========================================
if ($All -or $Poppler) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Instalando Poppler" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $POPPLER_DIR = "$TOOLS_DIR\poppler"
    $POPPLER_ZIP = "$env:TEMP\poppler.zip"
    # Usar build do osdn
    $POPPLER_URL = "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.02.0-0/Release-24.02.0-0.zip"
    
    try {
        Write-Host "[1/3] Baixando Poppler..." -ForegroundColor Yellow
        Download-File -Url $POPPLER_URL -OutputPath $POPPLER_ZIP
        
        Write-Host "[2/3] Extraindo..." -ForegroundColor Yellow
        $extractDir = "$env:TEMP\poppler_extract"
        Expand-Archive -Path $POPPLER_ZIP -DestinationPath $extractDir -Force
        
        $sourceDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
        if (Test-Path $POPPLER_DIR) { Remove-Item -Recurse -Force $POPPLER_DIR }
        
        $binPath = Join-Path $sourceDir.FullName "Library\bin"
        if (Test-Path $binPath) {
            New-Item -ItemType Directory -Path $POPPLER_DIR -Force | Out-Null
            Copy-Item -Path "$binPath\*" -Destination $POPPLER_DIR -Recurse -Force
        } else {
            Move-Item -Path $sourceDir.FullName -Destination $POPPLER_DIR -Force
        }
        
        Write-Host "[3/3] Configurando PATH..." -ForegroundColor Yellow
        Add-ToPath $POPPLER_DIR
        
        # Limpeza
        Remove-Item $POPPLER_ZIP -Force -ErrorAction SilentlyContinue
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host "[OK] Poppler instalado!" -ForegroundColor Green
        $pdftoppm = Join-Path $POPPLER_DIR "pdftoppm.exe"
        if (Test-Path $pdftoppm) {
            & $pdftoppm -v 2>&1 | Select-Object -First 1
        }
    } catch {
        Write-Host "[ERRO] Falha ao instalar Poppler: $_" -ForegroundColor Red
    }
}

# ==========================================
# Pandoc
# ==========================================
if ($All -or $Pandoc) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Instalando Pandoc" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $PANDOC_DIR = "$TOOLS_DIR\pandoc"
    $PANDOC_ZIP = "$env:TEMP\pandoc.zip"
    $PANDOC_URL = "https://github.com/jgm/pandoc/releases/download/3.1.12/pandoc-3.1.12-windows-x86_64.zip"
    
    try {
        Write-Host "[1/3] Baixando Pandoc..." -ForegroundColor Yellow
        Download-File -Url $PANDOC_URL -OutputPath $PANDOC_ZIP
        
        Write-Host "[2/3] Extraindo..." -ForegroundColor Yellow
        $extractDir = "$env:TEMP\pandoc_extract"
        Expand-Archive -Path $PANDOC_ZIP -DestinationPath $extractDir -Force
        
        $sourceDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
        if (Test-Path $PANDOC_DIR) { Remove-Item -Recurse -Force $PANDOC_DIR }
        Move-Item -Path $sourceDir.FullName -Destination $PANDOC_DIR -Force
        
        Write-Host "[3/3] Configurando PATH..." -ForegroundColor Yellow
        Add-ToPath $PANDOC_DIR
        
        # Limpeza
        Remove-Item $PANDOC_ZIP -Force -ErrorAction SilentlyContinue
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host "[OK] Pandoc instalado!" -ForegroundColor Green
        & "$PANDOC_DIR\pandoc.exe" --version 2>&1 | Select-Object -First 1
    } catch {
        Write-Host "[ERRO] Falha ao instalar Pandoc: $_" -ForegroundColor Red
    }
}

# ==========================================
# LibreOffice
# ==========================================
if ($All -or $LibreOffice) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  LibreOffice" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "[INFO] LibreOffice requer instalação manual." -ForegroundColor Yellow
    Write-Host "[INFO] Baixe de: https://www.libreoffice.org/download/download/" -ForegroundColor Yellow
    Write-Host "[INFO] Ou use: winget install TheDocumentFoundation.LibreOffice" -ForegroundColor Yellow
    
    # Verificar se já está instalado
    $soffice = Get-Command soffice -ErrorAction SilentlyContinue
    if ($soffice) {
        Write-Host "[OK] LibreOffice já está instalado: $($soffice.Source)" -ForegroundColor Green
    } else {
        # Procurar em locais comuns
        $commonPaths = @(
            "$env:ProgramFiles\LibreOffice\program\soffice.exe",
            "${env:ProgramFiles(x86)}\LibreOffice\program\soffice.exe"
        )
        foreach ($p in $commonPaths) {
            if (Test-Path $p) {
                Write-Host "[OK] LibreOffice encontrado: $p" -ForegroundColor Green
                Add-ToPath (Split-Path $p)
                break
            }
        }
    }
}

# ==========================================
# Resumo Final
# ==========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Instalação Concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verificando ferramentas instaladas:" -ForegroundColor Cyan
Write-Host ""

$tools = @(
    @{ name = "ffmpeg"; cmd = "ffmpeg" },
    @{ name = "ghostscript"; cmd = "gswin64c" },
    @{ name = "pdftoppm"; cmd = "pdftoppm" },
    @{ name = "pandoc"; cmd = "pandoc" },
    @{ name = "soffice"; cmd = "soffice" }
)

foreach ($tool in $tools) {
    $found = Get-Command $tool.cmd -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "  [OK] $($tool.name): $($found.Source)" -ForegroundColor Green
    } else {
        # Tentar no diretório de ferramentas
        $toolPath = "$TOOLS_DIR\$($tool.name)\$($tool.cmd).exe"
        if (Test-Path $toolPath) {
            Write-Host "  [OK] $($tool.name): $toolPath" -ForegroundColor Green
        } else {
            Write-Host "  [--] $($tool.name): não encontrado" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "IMPORTANTE: Reinicie o PowerShell para aplicar as mudanças no PATH" -ForegroundColor Yellow
Write-Host ""
