#!/usr/bin/env pwsh

if (!(Test-Path "node_modules")) {
    Write-Host "[ERROR] Dependencies not installed. Run .\install.ps1 first!" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Starting Theta Field Principle Visualizer..." -ForegroundColor Cyan
Write-Host "    Server: http://localhost:3000" -ForegroundColor Green
Write-Host "    Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

node server.js