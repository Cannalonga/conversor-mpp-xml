# test-job-create.ps1
# Script para testar criação de job

$baseDir = "C:\Users\rafae\Desktop\PROJETOS DE ESTUDOS\CONVERSOR MPP XML"
$token = "eyJpZCI6ImNtaXF3aDNlejAwMDAxM3piazdraWg1NGIiLCJlbWFpbCI6ImwycmVxdWVzdHNAZ21haWwuY29tIiwiaWF0IjoxNzY0ODIwMzU4NDAwfQ=="

Set-Location $baseDir

Write-Host "=== TESTE 1: Backend direto (3001) ===" -ForegroundColor Cyan
Write-Host ""

try {
    $result = curl.exe -s -X POST `
        -H "Authorization: Bearer $token" `
        -F "file=@scripts/samples/sample.png" `
        -F "converter=png-to-jpg" `
        "http://127.0.0.1:3001/api/jobs/create"
    
    Write-Host "Resposta do Backend:" -ForegroundColor Green
    Write-Host $result
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TESTE 2: Via Proxy (3000) ===" -ForegroundColor Cyan
Write-Host ""

try {
    $result2 = curl.exe -s -X POST `
        -H "Authorization: Bearer $token" `
        -F "file=@scripts/samples/sample.png" `
        -F "converter=png-to-jpg" `
        "http://localhost:3000/backend/api/jobs/create"
    
    Write-Host "Resposta via Proxy:" -ForegroundColor Green
    Write-Host $result2
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TESTE 3: Lista de Conversores ===" -ForegroundColor Cyan

try {
    $converters = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/converters/list" -Method Get
    Write-Host "Conversores disponíveis: $($converters.count)" -ForegroundColor Green
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
