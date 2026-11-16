# Persistent SSH tunnel to remote MySQL, auto-restarts if the connection drops.
# Usage: powershell -File start-tunnel.ps1
while ($true) {
    Write-Host "Starting SSH tunnel (local 3307 -> remote 127.0.0.1:3306)..."
    ssh -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes `
        -L 3307:127.0.0.1:3306 bookmystudyguide@187.127.163.56
    Write-Host "Tunnel dropped (exit code $LASTEXITCODE). Reconnecting in 3s..."
    Start-Sleep -Seconds 3
}
