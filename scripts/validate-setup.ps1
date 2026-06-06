# =============================================================================
# scripts/validate-setup.ps1
# Local development environment validation script
# Run before starting dev servers to catch missing config early
# Usage: .\scripts\validate-setup.ps1
# =============================================================================

$ErrorActionPreference = "SilentlyContinue"
$pass = 0; $fail = 0; $warn = 0

function Check($label, $expr, $type = "FAIL") {
  if (& $expr) {
    Write-Host "  [PASS] $label" -ForegroundColor Green
    $script:pass++
  } else {
    $color = if ($type -eq "WARN") { "Yellow" } else { "Red" }
    $prefix = if ($type -eq "WARN") { "[WARN]" } else { "[FAIL]" }
    Write-Host "  $prefix $label" -ForegroundColor $color
    if ($type -eq "WARN") { $script:warn++ } else { $script:fail++ }
  }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " MeetMind Local Setup Validator" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ---- Tools ----
Write-Host "`n[Tools]" -ForegroundColor White
Check "Node.js >= 20" { (node --version 2>$null) -match "v2[0-9]\." }
Check "npm >= 10"     { (npm --version 2>$null) -match "^1[0-9]\." }
Check "Azure CLI installed" { (az --version 2>$null) -ne $null }
Check "Azure Functions Core Tools v4" { (func --version 2>$null) -match "^4\." } "WARN"
Check "git installed" { (git --version 2>$null) -ne $null }

# ---- node_modules ----
Write-Host "`n[Dependencies]" -ForegroundColor White
Check "Root node_modules exists"      { Test-Path "node_modules" }
Check "Shared workspace installed"    { Test-Path "shared\node_modules" }
Check "Client workspace installed"    { Test-Path "client\node_modules" }
Check "Server workspace installed"    { Test-Path "server\node_modules" }
Check "Functions workspace installed" { Test-Path "functions\node_modules" }
Check "Agents workspace installed"    { Test-Path "agents\node_modules" } "WARN"

# ---- .env files ----
Write-Host "`n[Environment Files]" -ForegroundColor White
Check "server\.env exists"         { Test-Path "server\.env" }
Check "client\.env.local exists"   { Test-Path "client\.env.local" }

# ---- Check critical env vars in server\.env ----
Write-Host "`n[Server .env Values]" -ForegroundColor White
if (Test-Path "server\.env") {
  $env = Get-Content "server\.env" | Where-Object { $_ -notmatch "^#" -and $_ -match "=" }
  $envMap = @{}
  $env | ForEach-Object { $parts = $_ -split "=", 2; $envMap[$parts[0].Trim()] = $parts[1].Trim() }

  $required = @(
    "AZURE_AD_TENANT_ID", "AZURE_AD_CLIENT_ID", "AZURE_AD_CLIENT_SECRET",
    "COSMOS_ENDPOINT", "COSMOS_KEY",
    "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY",
    "AZURE_SEARCH_ENDPOINT", "AZURE_SEARCH_ADMIN_KEY",
    "BOT_APP_ID", "BOT_APP_PASSWORD",
    "SERVICEBUS_CONNECTION_STRING",
    "AZURE_STORAGE_CONNECTION_STRING",
    "JWT_SECRET"
  )

  foreach ($key in $required) {
    $val = $envMap[$key]
    $isFilled = $val -and $val -ne "" -and $val -notmatch "^\*+$" -and $val -notmatch "your-" -and $val -notmatch "xxxxxxx"
    Check "$key is set with real value" { $isFilled }
  }
} else {
  Write-Host "  [SKIP] server\.env not found — skipping value checks" -ForegroundColor DarkGray
}

# ---- Client .env ----
Write-Host "`n[Client .env.local Values]" -ForegroundColor White
if (Test-Path "client\.env.local") {
  $clientEnv = Get-Content "client\.env.local" | Where-Object { $_ -notmatch "^#" -and $_ -match "=" }
  $clientMap = @{}
  $clientEnv | ForEach-Object { $parts = $_ -split "=", 2; $clientMap[$parts[0].Trim()] = $parts[1].Trim() }

  foreach ($key in @("VITE_AZURE_AD_CLIENT_ID", "VITE_AZURE_AD_TENANT_ID")) {
    $val = $clientMap[$key]
    $isFilled = $val -and $val -notmatch "xxxxxxx"
    Check "$key is set" { $isFilled }
  }
}

# ---- Icons ----
Write-Host "`n[Teams App Icons]" -ForegroundColor White
Check "icons\color.png exists (192x192)"   { Test-Path "icons\color.png" }
Check "icons\outline.png exists (32x32)"   { Test-Path "icons\outline.png" }

# ---- teams-manifest.json placeholders ----
Write-Host "`n[Teams Manifest]" -ForegroundColor White
if (Test-Path "teams-manifest.json") {
  $manifest = Get-Content "teams-manifest.json" -Raw
  Check "No {{PLACEHOLDER}} tokens remaining in teams-manifest.json" {
    -not ($manifest -match '\{\{[A-Z_]+\}\}')
  }
}

# ---- Summary ----
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Results: $pass passed  |  $warn warnings  |  $fail failed" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if ($fail -gt 0) {
  Write-Host "`nFix the FAIL items above before starting dev servers." -ForegroundColor Red
  exit 1
} elseif ($warn -gt 0) {
  Write-Host "`nSetup mostly ready. Review WARN items." -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "`nAll checks passed! Run: npm run dev" -ForegroundColor Green
  exit 0
}
