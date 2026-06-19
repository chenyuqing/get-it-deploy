# Restart the Get It dev server (browser mode, Windows)
# Usage: .\restart.ps1 [-Port <number>]

param(
  [int]$Port = 3000
)

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ProjectDir "logs"
$LogFile = Join-Path $LogDir "dev.log"

Write-Host "=== Get It Dev Server Restart (Windows) ==="

# Stop existing server
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }

if ($process) {
  Write-Host "Stopping server on port $Port (PID: $($process.Id))..."
  $process | Stop-Process -Force
  Start-Sleep -Seconds 2
  Write-Host "Stopped."
} else {
  Write-Host "No server running on port $Port."
}

# Clean .next cache
$NextDir = Join-Path $ProjectDir ".next"
if (Test-Path $NextDir) {
  Write-Host "Cleaning .next cache..."
  Remove-Item -Recurse -Force $NextDir
}

# Set data directory to project-local .getit-data for portability
$env:GETIT_DATA_DIR = Join-Path $ProjectDir ".getit-data"
New-Item -ItemType Directory -Force -Path $env:GETIT_DATA_DIR | Out-Null

# Start server
Write-Host "Starting dev server on port $Port..."
Write-Host "Data directory: $env:GETIT_DATA_DIR"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Clear-Content $LogFile -ErrorAction SilentlyContinue

$job = Start-Job -ScriptBlock {
  param($dir, $log)
  Set-Location $dir
  $env:GETIT_DATA_DIR = Join-Path $dir ".getit-data"
  npm run browser:dev *>> $log
} -ArgumentList $ProjectDir, $LogFile

Write-Host "Server starting in background (job ID: $($job.Id))..."
Write-Host "Logs: $LogFile"
Write-Host "Server will be ready at http://localhost:$Port"
