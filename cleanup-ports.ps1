# Port Cleanup Script
# Use this to terminate all processes running on development ports after testing

Write-Host "🧹 Cleaning up development ports..." -ForegroundColor Yellow

# Kill processes on common development ports
$ports = @(3000, 3001, 5000, 8000, 8080, 5432)

foreach ($port in $ports) {
    try {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($processes) {
            foreach ($process in $processes) {
                $pid = $process.OwningProcess
                if ($pid) {
                    try {
                        $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
                        Write-Host "Terminating process $processName (PID: $pid) on port $port" -ForegroundColor Red
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    } catch {
                        Write-Host "Could not terminate process on port $port" -ForegroundColor Yellow
                    }
                }
            }
        }
    } catch {
        Write-Host "No process found on port $port" -ForegroundColor Green
    }
}

# Also kill all Node.js processes as backup
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Terminating all Node.js processes..." -ForegroundColor Red
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "No Node.js processes found" -ForegroundColor Green
}

Write-Host "✅ Port cleanup completed!" -ForegroundColor Green
Write-Host "You can now restart your development servers." -ForegroundColor Cyan
