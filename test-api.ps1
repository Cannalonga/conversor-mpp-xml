# test-api.ps1
# Testes da API sem interferência do terminal

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=== TESTE DA API ===" -ForegroundColor Cyan
Write-Host ""

# Teste 1: Listar conversores
Write-Host "1. Listando conversores..." -ForegroundColor Yellow
$converters = curl.exe -s "http://127.0.0.1:3001/api/converters/list" | ConvertFrom-Json
Write-Host "   Conversores encontrados: $($converters.count)" -ForegroundColor Green

# Teste 2: Criar job
Write-Host ""
Write-Host "2. Criando job..." -ForegroundColor Yellow
$jobData = '{"fileId":"file_123","converter":"png-to-jpg"}'
$jobResult = curl.exe -s -X POST -H "Content-Type: application/json" -d $jobData "http://127.0.0.1:3001/api/jobs/create" | ConvertFrom-Json
Write-Host "   Job ID: $($jobResult.jobId)" -ForegroundColor Green
Write-Host "   Status: $($jobResult.status)" -ForegroundColor Green

# Teste 3: Verificar status do job
if ($jobResult.jobId) {
    Write-Host ""
    Write-Host "3. Aguardando 4 segundos e verificando status..." -ForegroundColor Yellow
    Start-Sleep -Seconds 4
    
    $statusResult = curl.exe -s "http://127.0.0.1:3001/api/jobs/$($jobResult.jobId)/status" | ConvertFrom-Json
    Write-Host "   Status final: $($statusResult.job.status)" -ForegroundColor Green
    Write-Host "   Progress: $($statusResult.job.progress)%" -ForegroundColor Green
    if ($statusResult.job.downloadUrl) {
        Write-Host "   Download URL: $($statusResult.job.downloadUrl)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== TESTES CONCLUÍDOS ===" -ForegroundColor Cyan
