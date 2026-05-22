# Documented local workflow. From project root:
#   powershell -ExecutionPolicy Bypass -File ".\scripts\run-setup-and-dev.ps1"
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host "Project: $Root"
Copy-Item -Path ".env.example" -Destination ".env.local" -Force
Write-Host "Copied .env.example -> .env.local (set a real MONGODB_URI before seed if needed)."

npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run seed
if ($LASTEXITCODE -ne 0) {
  Write-Host "Seed failed: set MONGODB_URI in .env.local (Atlas or mongodb://127.0.0.1:27017/odelhub_pay) then run: npm run seed"
  exit $LASTEXITCODE
}

Write-Host "Starting dev server on http://localhost:3000"
npm run dev
