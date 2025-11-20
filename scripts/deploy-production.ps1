#############################################################################
# 🚀 DEPLOY & PRODUCTION SETUP SCRIPT - Conversor MPP para XML (Windows)
# 
# Uso: .\deploy-production.ps1 -Command [start|stop|restart|status|logs|monitor]
# 
# Exemplos:
#   .\deploy-production.ps1 -Command start      # Iniciar servidor em produção
#   .\deploy-production.ps1 -Command stop       # Parar servidor
#   .\deploy-production.ps1 -Command restart    # Reiniciar
#   .\deploy-production.ps1 -Command logs       # Ver logs em tempo real
#   .\deploy-production.ps1 -Command monitor    # Monitoramento em tempo real
#############################################################################

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'monitor', 'health', 'cleanup', 'backup', 'install', 'help')]
    [string]$Command = 'status'
)

# Configurações
$AppName = "mpp-converter"
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$Port = $env:PORT -or 3000
$Env = $env:NODE_ENV -or 'production'
$LogDir = Join-Path $AppDir "logs"
$BackupDir = Join-Path $AppDir "backups"

# Cores para output
$Colors = @{
    Info    = 'Cyan'
    Success = 'Green'
    Error   = 'Red'
    Warning = 'Yellow'
}

function Write-Log {
    param([string]$Message, [string]$Type = 'Info')
    $icon = @{
        'Info'    = '[INFO]'
        'Success' = '[✓]'
        'Error'   = '[✗]'
        'Warning' = '[!]'
    }
    Write-Host "$($icon[$Type]) $Message" -ForegroundColor $Colors[$Type]
}

# Verificar Node.js
function Check-NodeJS {
    try {
        $nodeVersion = node -v
        Write-Log "Node.js versão: $nodeVersion" 'Info'
    }
    catch {
        Write-Log "Node.js não encontrado. Instale Node.js v16+ primeiro." 'Error'
        exit 1
    }
}

# Verificar PM2
function Check-PM2 {
    try {
        pm2 -v > $null
    }
    catch {
        Write-Log "PM2 não instalado. Instalando globalmente..." 'Warning'
        npm install -g pm2
    }
}

# Função de instalação
function Install-Dependencies {
    Write-Log "Instalando dependências..." 'Info'
    Push-Location $AppDir
    npm install --production
    Pop-Location
    Write-Log "Dependências instaladas" 'Success'
}

# Função de backup
function Backup-Current {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force > $null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupFile = Join-Path $BackupDir "backup-$timestamp.zip"
    
    Write-Log "Criando backup em: $BackupFile" 'Info'
    
    $excludeFolders = @('node_modules', '.git', 'logs', 'uploads')
    
    # Usar 7-Zip se disponível, senão usar Compress-Archive
    if (Get-Command 7z -ErrorAction SilentlyContinue) {
        & 7z a -tzip $BackupFile $AppDir `
            -x!node_modules `
            -x!.git `
            -x!logs `
            -x!uploads > $null
    }
    else {
        Compress-Archive -Path $AppDir -DestinationPath $BackupFile -Force
    }
    
    Write-Log "Backup criado" 'Success'
}

# Função de inicialização
function Start-Application {
    Write-Log "Iniciando aplicação em modo produção..." 'Info'
    Check-NodeJS
    Check-PM2
    
    Push-Location $AppDir
    
    # Criar diretórios necessários
    @(
        $LogDir,
        "$LogDir\audit",
        "$LogDir\disputes",
        "uploads\incoming",
        "uploads\processing",
        "uploads\converted",
        "uploads\expired",
        "uploads\quarantine"
    ) | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force > $null
        }
    }
    
    # Verificar se já está rodando
    try {
        $pmInfo = pm2 info $AppName 2>$null
        if ($pmInfo) {
            Write-Log "Aplicação já está rodando. Use 'restart' para reiniciar." 'Warning'
            Pop-Location
            return
        }
    }
    catch {
        # Aplicação não está rodando, prosseguir
    }
    
    # Definir variáveis de ambiente
    $env:NODE_ENV = 'production'
    $env:PORT = $Port
    
    # Iniciar com PM2
    pm2 start "api/server.js" -n $AppName --env production
    
    Write-Log "Aplicação iniciada" 'Success'
    
    # Esperar e verificar saúde
    Start-Sleep -Seconds 3
    Check-Health
    
    Pop-Location
}

# Função de parada
function Stop-Application {
    Write-Log "Parando aplicação..." 'Info'
    
    try {
        $pmInfo = pm2 info $AppName 2>$null
        if ($pmInfo) {
            pm2 stop $AppName
            Write-Log "Aplicação parada" 'Success'
        }
        else {
            Write-Log "Aplicação não está rodando" 'Warning'
        }
    }
    catch {
        Write-Log "Aplicação não está rodando" 'Warning'
    }
}

# Função de reinicialização
function Restart-Application {
    Write-Log "Reiniciando aplicação..." 'Info'
    
    try {
        $pmInfo = pm2 info $AppName 2>$null
        if ($pmInfo) {
            pm2 restart $AppName
            Start-Sleep -Seconds 3
            Check-Health
            Write-Log "Aplicação reiniciada" 'Success'
        }
        else {
            Start-Application
        }
    }
    catch {
        Start-Application
    }
}

# Verificar saúde da aplicação
function Check-Health {
    Write-Log "Verificando saúde da aplicação..." 'Info'
    
    for ($i = 1; $i -le 10; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -ErrorAction SilentlyContinue
            $health = $response.Content | ConvertFrom-Json
            $status = $health.status
            
            if ($status) {
                switch ($status) {
                    'HEALTHY' {
                        Write-Log "Status: $status ✓" 'Success'
                        return $true
                    }
                    'DEGRADED' {
                        Write-Log "Status: $status (funcionando com avisos)" 'Warning'
                        return $true
                    }
                    'CRITICAL' {
                        Write-Log "Status: $status" 'Error'
                        return $false
                    }
                    'OFFLINE' {
                        Write-Log "Status: $status" 'Error'
                        return $false
                    }
                }
            }
        }
        catch {
            if ($i -lt 10) {
                Start-Sleep -Seconds 1
            }
        }
    }
    
    Write-Log "Não foi possível verificar saúde" 'Warning'
    return $false
}

# Status da aplicação
function Show-Status {
    Write-Log "Status da aplicação:" 'Info'
    
    try {
        $pmInfo = pm2 info $AppName 2>$null
        if ($pmInfo) {
            pm2 info $AppName
        }
        else {
            Write-Log "Aplicação não está rodando" 'Warning'
        }
    }
    catch {
        Write-Log "Aplicação não está rodando" 'Warning'
    }
    
    Write-Host ""
    Check-Health
    
    # Mostrar métricas
    Write-Log "Métricas do sistema:" 'Info'
    try {
        $metrics = Invoke-RestMethod -Uri "http://localhost:$Port/metrics/summary" -ErrorAction SilentlyContinue
        if ($metrics) {
            $metrics.summary | ConvertTo-Json | Write-Host -ForegroundColor Gray
        }
    }
    catch {
        Write-Log "Não foi possível obter métricas" 'Warning'
    }
}

# Visualizar logs
function Show-Logs {
    Write-Log "Exibindo logs (Ctrl+C para sair)..." 'Info'
    
    try {
        $pmInfo = pm2 info $AppName 2>$null
        if ($pmInfo) {
            pm2 logs $AppName
        }
        else {
            $logFile = Get-ChildItem "$LogDir/app-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($logFile) {
                Get-Content $logFile.FullName -Tail 100 -Wait
            }
            else {
                Write-Log "Nenhum arquivo de log encontrado" 'Error'
            }
        }
    }
    catch {
        Write-Log "Erro ao exibir logs: $_" 'Error'
    }
}

# Monitoramento em tempo real
function Start-Monitor {
    Write-Log "Iniciando monitoramento em tempo real (Ctrl+C para sair)..." 'Info'
    Write-Host ""
    
    while ($true) {
        Clear-Host
        Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║  Monitoramento - Conversor MPP para XML        ║" -ForegroundColor Cyan
        Write-Host "║  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                              ║" -ForegroundColor Cyan
        Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
        
        # Health Check
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -ErrorAction SilentlyContinue
            $health = $response.Content | ConvertFrom-Json
            $status = $health.status
            
            $statusColor = switch ($status) {
                'HEALTHY' { 'Green' }
                'DEGRADED' { 'Yellow' }
                default { 'Red' }
            }
            
            Write-Host "Status Geral:    " -NoNewline
            Write-Host $status -ForegroundColor $statusColor
        }
        catch {
            Write-Host "Status Geral:    " -NoNewline
            Write-Host "OFFLINE" -ForegroundColor Red
        }
        
        # Métricas
        try {
            $metricsResponse = Invoke-WebRequest -Uri "http://localhost:$Port/metrics/json" -ErrorAction SilentlyContinue
            $metrics = $metricsResponse.Content | ConvertFrom-Json
            
            Write-Host "Uptime:          $($metrics.uptime.hours) horas"
            Write-Host "Memória:         $($metrics.memory.rss_mb) MB"
            Write-Host "Conversões:      $($metrics.conversions.successful)"
            Write-Host "Receita:         $($metrics.payments.totalRevenueR$)"
        }
        catch {
            Write-Host "Métricas:        Indisponíveis" -ForegroundColor Yellow
        }
        
        # PM2 Info
        try {
            $pmInfo = pm2 info $AppName 2>$null
            if ($pmInfo) {
                $pmUptime = $pmInfo | Select-String "pm2 uptime" | ForEach-Object { $_ -split ":" | Select-Object -Last 1 }
                Write-Host "PM2 Uptime:      $pmUptime"
            }
        }
        catch { }
        
        Write-Host ""
        Write-Host "Pressione Ctrl+C para sair..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
    }
}

# Limpeza de logs antigos
function Cleanup-OldFiles {
    Write-Log "Limpando logs antigos..." 'Info'
    
    # Remover logs com mais de 30 dias
    Get-ChildItem "$LogDir/*.log" -ErrorAction SilentlyContinue | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
    
    # Remover arquivos expirados
    Get-ChildItem "$AppDir/uploads/expired" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        Remove-Item -Force
    
    Write-Log "Limpeza concluída" 'Success'
}

# Função de ajuda
function Show-Help {
    Write-Host "Uso: $($MyInvocation.MyCommand.Name) -Command [COMANDO]"
    Write-Host ""
    Write-Host "Comandos disponíveis:"
    Write-Host "  start          Iniciar servidor em produção"
    Write-Host "  stop           Parar servidor"
    Write-Host "  restart        Reiniciar servidor"
    Write-Host "  status         Mostrar status e métricas"
    Write-Host "  logs           Visualizar logs em tempo real"
    Write-Host "  monitor        Monitoramento contínuo"
    Write-Host "  health         Verificar saúde da aplicação"
    Write-Host "  cleanup        Limpar logs e arquivos antigos"
    Write-Host "  backup         Fazer backup da aplicação"
    Write-Host "  install        Instalar dependências"
    Write-Host "  help           Mostrar esta mensagem"
    Write-Host ""
    Write-Host "Exemplos:"
    Write-Host "  .\deploy-production.ps1 -Command start"
    Write-Host "  .\deploy-production.ps1 -Command restart"
    Write-Host "  .\deploy-production.ps1 -Command monitor"
}

# Main
switch ($Command) {
    'start'   { Start-Application }
    'stop'    { Stop-Application }
    'restart' { Stop-Application; Start-Sleep -Seconds 2; Start-Application }
    'status'  { Show-Status }
    'logs'    { Show-Logs }
    'monitor' { Start-Monitor }
    'health'  { Check-Health }
    'cleanup' { Cleanup-OldFiles }
    'backup'  { Backup-Current }
    'install' { Install-Dependencies }
    'help'    { Show-Help }
    default   { Write-Log "Comando desconhecido: $Command" 'Error'; Write-Host ""; Show-Help }
}
