#!/usr/bin/env pwsh
# Theta Field Principle Visualizer - Installer
# =============================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Theta Field Principle Visualizer - Setup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[*] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "        Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
Write-Host "[*] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] npm found: v$npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "[ERROR] npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check files
if (!(Test-Path "server.js")) {
    Write-Host "[ERROR] server.js not found in current directory!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "ThetaFieldPrincipleVisualizer")) {
    Write-Host "[ERROR] ThetaFieldPrincipleVisualizer directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Directory structure verified" -ForegroundColor Green
Write-Host ""

# Clean install - remove existing node_modules and package files
if (Test-Path "node_modules") {
    Write-Host "[*] Removing existing node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "[OK] Cleaned node_modules" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Write-Host "[*] Removing existing package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json"
    Write-Host "[OK] Cleaned package-lock.json" -ForegroundColor Green
}

Write-Host ""

# Create package.json
Write-Host "[*] Creating package.json..." -ForegroundColor Yellow

$packageJson = @{
    name = "theta-field-principle-visualizer"
    version = "1.0.0"
    type = "module"
    description = "Express server for Theta Field Principle Visualizer"
    main = "server.js"
    scripts = @{
        start = "node server.js"
    }
    dependencies = @{
        express = "^4.18.2"
        compression = "^1.7.4"
        helmet = "^7.1.0"
        cors = "^2.8.5"
    }
    engines = @{
        node = ">=16.0.0"
    }
} | ConvertTo-Json -Depth 10

$packageJson | Out-File -FilePath "package.json" -Encoding UTF8
Write-Host "[OK] package.json created" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "[*] Installing npm dependencies..." -ForegroundColor Yellow
Write-Host ""
try {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] npm install failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Error during npm install: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server:" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Or run:" -ForegroundColor Cyan
Write-Host "  .\start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "The server will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""