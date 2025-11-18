#!/usr/bin/env powershell
# ============================================================================
# Script: monitor-python-processes.ps1
# Purpose: Continuous monitoring to prevent Python process explosion
# Run this BEFORE opening VS Code
# ============================================================================

param(
    [int]$CheckInterval = 2,           # Check every 2 seconds
    [int]$MaxProcesses = 50,           # Kill if more than 50 Python processes
    [bool]$ContinuousMode = $true      # Run continuously
)

$processKilledCount = 0
$monitorStartTime = Get-Date

Write-Host "[MONITOR] Python Process Monitor Started" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "[CONFIG] Check Interval: ${CheckInterval}s" -ForegroundColor Gray
Write-Host "[CONFIG] Kill Threshold: ${MaxProcesses} processes" -ForegroundColor Gray
Write-Host "[CONFIG] Continuous Mode: ${ContinuousMode}" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Initial kill of any existing Python processes
Write-Host "[SCAN] Initial scan..." -ForegroundColor Yellow
$initialProcesses = @(Get-Process python -ErrorAction SilentlyContinue)
if ($initialProcesses.Count -gt 0) {
    Write-Host "   [WARN] Found $($initialProcesses.Count) Python processes - killing them" -ForegroundColor Yellow
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Continuous monitoring loop
$iteration = 0
while ($ContinuousMode) {
    $iteration++
    $pythonProcs = @(Get-Process python -ErrorAction SilentlyContinue)
    $procCount = $pythonProcs.Count
    
    # Print status every 5 iterations to reduce spam
    if ($iteration % 5 -eq 0) {
        $elapsedTime = (Get-Date) - $monitorStartTime
        Write-Host "[STATUS] $procCount Python processes | Elapsed: $($elapsedTime.TotalSeconds)s | Killed: $processKilledCount" -ForegroundColor Green
    }
    
    # Kill processes if threshold exceeded
    if ($procCount -gt $MaxProcesses) {
        Write-Host "[ALERT] $procCount Python processes detected (threshold: $MaxProcesses)" -ForegroundColor Red
        Write-Host "   [ACTION] Killing all Python processes..." -ForegroundColor Red
        
        foreach ($proc in $pythonProcs) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                $processKilledCount++
                Write-Host "   [KILLED] PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor Yellow
            } catch {
                Write-Host "   [ERROR] Failed to kill PID $($proc.Id)" -ForegroundColor Gray
            }
        }
    }
    
    Start-Sleep -Seconds $CheckInterval
}

Write-Host ""
Write-Host "[DONE] Monitor stopped" -ForegroundColor Green
Write-Host "[STATS] Total processes killed: $processKilledCount" -ForegroundColor Green
