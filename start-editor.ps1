$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is required. Install it from https://nodejs.org/ and run this script again.' -ForegroundColor Red
  exit 1
}

Write-Host 'Keep this window open while using the editor. Press Ctrl+C to stop it.' -ForegroundColor Yellow
$previousOpenBrowser = $env:EDITOR_OPEN_BROWSER
try {
  $env:EDITOR_OPEN_BROWSER = '1'
  node .\editor\server.js
  if ($LASTEXITCODE -ne 0) { throw 'Editor failed to start. See the error above.' }
} finally {
  $env:EDITOR_OPEN_BROWSER = $previousOpenBrowser
}
