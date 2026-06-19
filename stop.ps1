# Stop the Get It dev server (Windows)
# Usage: .\stop.ps1

$process = Get-Process -Name "node" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "next dev" }

if ($process) {
  Write-Host "Stopping Get It dev server (PID: $($process.Id))..."
  $process | Stop-Process -Force
  Start-Sleep -Seconds 1
  Write-Host "Stopped."
} else {
  Write-Host "Get It dev server is not running."
}
