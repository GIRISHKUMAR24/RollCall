# ============================================================
# AttendanceHub - Open Windows Firewall for Mobile Access
# Run this script as Administrator ONCE to allow mobile devices
# on the same WiFi to reach both the Vite dev server (port 3000)
# and the Express backend (port 4000).
# ============================================================

Write-Host ""
Write-Host "--- AttendanceHub Firewall Setup ---" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# --- Helper: Add or replace a firewall rule ---
function Set-FirewallRule {
    param([string]$Name, [int]$Port)
    $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $Name
        Write-Host "[-] Removed old rule: $Name" -ForegroundColor Yellow
    }
    New-NetFirewallRule `
        -DisplayName $Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Port `
        -Profile Private `
        -Description "Allow AttendanceHub traffic on port $Port for mobile access on local WiFi" | Out-Null
    Write-Host "[+] Rule added: $Name (port $Port)" -ForegroundColor Green
}

# --- Port 3000 - Vite dev server (frontend) ---
Set-FirewallRule -Name "AttendanceHub-Vite-3000"    -Port 3000

# --- Port 4000 - Express backend API ---
Set-FirewallRule -Name "AttendanceHub-Backend-4000" -Port 4000

# --- Allow Node.js through the firewall (by executable) ---
$nodePaths = @()
if (Test-Path "$env:ProgramFiles\nodejs\node.exe") { $nodePaths += "$env:ProgramFiles\nodejs\node.exe" }
if (Test-Path "$env:LOCALAPPDATA\nvm\current\node.exe") { $nodePaths += "$env:LOCALAPPDATA\nvm\current\node.exe" }

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd -and (Test-Path $nodeCmd.Source)) { $nodePaths += $nodeCmd.Source }

$finalNodePath = $nodePaths | Select-Object -First 1

if ($finalNodePath) {
    $nodeRuleName = "AttendanceHub-NodeJS"
    $existingNode = Get-NetFirewallRule -DisplayName $nodeRuleName -ErrorAction SilentlyContinue
    if ($existingNode) { Remove-NetFirewallRule -DisplayName $nodeRuleName }
    New-NetFirewallRule `
        -DisplayName $nodeRuleName `
        -Direction Inbound `
        -Action Allow `
        -Program $finalNodePath `
        -Profile Private `
        -Description "Allow Node.js (AttendanceHub) inbound on private network" | Out-Null
    Write-Host "[+] Node.js rule added: $finalNodePath" -ForegroundColor Green
} else {
    Write-Host "[!] Node.js executable not found; skipping app-level rule." -ForegroundColor Yellow
}

Write-Host ""

# --- Detect WiFi IP ---
Write-Host "[*] Detecting WiFi IP address..." -ForegroundColor Cyan

$allIps = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.InterfaceAlias -notlike "*Loopback*" -and
        $_.InterfaceAlias -notlike "*VMware*" -and
        $_.InterfaceAlias -notlike "*VirtualBox*" -and
        $_.InterfaceAlias -notlike "*Hyper-V*" -and
        $_.IPAddress -ne "127.0.0.1"
    } |
    Select-Object InterfaceAlias, IPAddress

Write-Host ""
Write-Host "Adapters detected:" -ForegroundColor Cyan
$allIps | Format-Table -AutoSize

# Best guess: prefer Wi-Fi adapter
$wifiIp = ($allIps |
    Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*WiFi*" } |
    Select-Object -Last 1).IPAddress

# Fallback: any 192.168.x.x
if (-not $wifiIp) {
    $wifiIp = ($allIps |
        Where-Object { $_.IPAddress -like "192.168.*" } |
        Select-Object -Last 1).IPAddress
}

Write-Host ""
if ($wifiIp) {
    Write-Host "Selected WiFi IP : $wifiIp" -ForegroundColor Green
    Write-Host ""
    Write-Host "Frontend scanner : http://$($wifiIp):3000" -ForegroundColor Green
    Write-Host "Backend API      : http://$($wifiIp):4000/api/ping" -ForegroundColor Green
    Write-Host "Verify local IP  : http://$($wifiIp):3000/api/local-ip" -ForegroundColor Green
    Write-Host ""
    Write-Host "Scanner URLs in email QR codes will use:" -ForegroundColor Cyan
    Write-Host "   http://$($wifiIp):3000/scan/from-email?token=<JWT>" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[!] Make sure APP_BASE_URL in .env is commented out (or set to http://$wifiIp:3000)" -ForegroundColor Yellow
} else {
    Write-Host "[!] Could not detect a WiFi IP." -ForegroundColor Yellow
    Write-Host "   Run 'ipconfig' and look for your Wi-Fi adapter's IPv4 Address." -ForegroundColor Yellow
    Write-Host "   Then set APP_BASE_URL=http://<YOUR_IP>:3000 in .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verification: Current AttendanceHub Rules" -ForegroundColor Cyan
Get-NetFirewallRule -DisplayName "AttendanceHub*" | Select-Object DisplayName, Enabled, Direction, Action | Format-Table -AutoSize

Write-Host ""
Write-Host "Setup complete. Now start the dev server: npm run dev" -ForegroundColor Cyan
Write-Host ""
