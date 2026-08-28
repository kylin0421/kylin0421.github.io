$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is required. Install it from https://nodejs.org/ and run this script again.' -ForegroundColor Red
  exit 1
}

$port = if ($env:EDITOR_PORT) { $env:EDITOR_PORT } else { '4310' }
$url = "http://127.0.0.1:$port"
Start-Process $url
Write-Host "Opening $url" -ForegroundColor Green
Write-Host 'Keep this window open while using the editor. Press Ctrl+C to stop it.' -ForegroundColor Yellow
node .\editor\server.js
