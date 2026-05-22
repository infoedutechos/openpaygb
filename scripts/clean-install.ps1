# Fixes ENOENT / ENOTEMPTY / broken node_modules on Windows.
# Close dev servers first. If this still locks, pause OneDrive antivirus on this folder
# or move the repo to a short path like C:\dev\odelhub-pay (avoids MAX_PATH depth issues).

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$modules = Join-Path $Root "node_modules"
Write-Host "[clean-install] Project: $Root"
Write-Host "[clean-install] Tip: EPERM during npm usually means Cursor/Defender/OneDrive has files open."
Write-Host "[clean-install] Close this workspace (or exit Cursor), then run from an external PowerShell, or copy the repo to e.g. C:\dev\odelhub-pay"
Write-Host ""
Write-Host "[clean-install] (1/3) Removing node_modules …"

function Remove-NodeModulesHard {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $true }

  Write-Host "[clean-install]     trying cmd rmdir …"
  $p = $Path.TrimEnd('\')
  & cmd.exe /c "rmdir /s /q `"$p`""

  if (-not (Test-Path -LiteralPath $Path)) { return $true }

  Write-Host "[clean-install]     rmdir incomplete; trying robocopy mirror empty folder …"
  $empty = Join-Path $env:TEMP "odelhub_empty_$(Get-Random)"
  New-Item -ItemType Directory -Path $empty -Force | Out-Null
  try {
    cmd /c "robocopy `"$empty`" `"$Path`" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP" | Out-Null
    cmd /c "rmdir /s /q `"$Path`""
  } finally {
    Remove-Item -LiteralPath $empty -Recurse -Force -ErrorAction SilentlyContinue
  }

  return -not (Test-Path -LiteralPath $Path)
}

if (-not (Remove-NodeModulesHard -Path $modules)) {
  Write-Host ""
  Write-Host "[clean-install] ERROR: Could not delete node_modules." -ForegroundColor Red
  Write-Host "  Close Cursor/VS Code (or Reload Window), kill any Node processes,"
  Write-Host "  exclude this folder from real-time antivirus, then run: npm run clean:win"
  exit 1
}

if (Test-Path -LiteralPath $modules) {
  Write-Host ""
  Write-Host "[clean-install] ERROR: node_modules still on disk (delete was incomplete)." -ForegroundColor Red
  Write-Host "  Fully quit Cursor, stop 'node.exe' in Task Manager, retry; or run from another account/folder."
  exit 1
}

Write-Host "[clean-install] (2/3) Removing package-lock.json for a clean resolve …"
Remove-Item -LiteralPath (Join-Path $Root "package-lock.json") -Force -ErrorAction SilentlyContinue

Write-Host "[clean-install] (3/3) npm install …"
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[clean-install] npm install failed." -ForegroundColor Red
  Write-Host "Try: copy project to C:\dev\odelhub-pay, run npm install there (shorter paths)."
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[clean-install] Done. Next: npm run build   (then prisma db push if needed)"
