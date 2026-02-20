$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not (Test-Path ".\\node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

Write-Host "Starting dev server..."
npm run dev -- --host
