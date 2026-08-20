# Collavo - start everything for the demo (Windows PowerShell)
# Usage:  .\start-demo.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $env:TEMP "collavo\demo-logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function PortOpen($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (PortOpen 4000)) {
  Write-Host "Starting backend (port 4000) with demo data..."
  Start-Process -FilePath "node.exe" -ArgumentList @("src/server.js") -WorkingDirectory "$root\server" -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir "server.log") -RedirectStandardError (Join-Path $logDir "server.err.log")
} else {
  Write-Host "Backend already running on 4000."
}

if (-not (PortOpen 5173)) {
  Write-Host "Starting app frontend (port 5173)..."
  Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory "$root\client" -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir "client.log") -RedirectStandardError (Join-Path $logDir "client.err.log")
} else {
  Write-Host "App already running on 5173."
}

if (-not (PortOpen 5174)) {
  Write-Host "Starting admin frontend (port 5174)..."
  Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory "$root\admin-client" -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir "admin.log") -RedirectStandardError (Join-Path $logDir "admin.err.log")
} else {
  Write-Host "Admin already running on 5174."
}

Write-Host "Waiting for services..."
Start-Sleep -Seconds 25
foreach ($p in @(@(4000, "backend"), @(5173, "app"), @(5174, "admin"))) {
  try {
    Invoke-WebRequest -Uri "http://localhost:$($p[0])/" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "  http://localhost:$($p[0])  -> $($p[1]) OK"
  } catch {
    Write-Host "  http://localhost:$($p[0])  -> $($p[1]) FAIL (check $logDir)"
  }
}
Write-Host ""
Write-Host "App:  http://localhost:5173"
Write-Host "Admin: http://localhost:5174"
Write-Host ""
Write-Host "Demo logins (password Demo@1234):"
Write-Host "  Business (verified, Rs.5000 wallet): demo.business@collavo.app"
Write-Host "  Creator: demo.creator@collavo.app"
Write-Host "  Pending verification: demo.pending@collavo.app"
Write-Host "  Admin: admin@collavo.app / AdminPass123!"
