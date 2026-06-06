# =============================================================================
# scripts/package-teams-app.ps1
# Packages the Teams app manifest + icons into a deployable .zip
# Run: .\scripts\package-teams-app.ps1
#
# Usage:
#   .\scripts\package-teams-app.ps1 `
#     -AppId "your-guid" `
#     -Hostname "meetmind-client.azurestaticapps.net" `
#     -BotAppId "bot-app-id" `
#     -AzureClientId "azure-ad-client-id"
# =============================================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$AppId,

  [Parameter(Mandatory=$true)]
  [string]$Hostname,

  [Parameter(Mandatory=$true)]
  [string]$BotAppId,

  [Parameter(Mandatory=$true)]
  [string]$AzureClientId,

  [string]$OutputPath = "meetmind-teams-app.zip"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " MeetMind Teams App Packager" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Validate icons exist
if (-not (Test-Path "icons\color.png")) {
  Write-Host "ERROR: icons\color.png not found (must be 192x192 PNG)" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path "icons\outline.png")) {
  Write-Host "ERROR: icons\outline.png not found (must be 32x32 PNG)" -ForegroundColor Red
  exit 1
}

# Create temp package directory
$tmpDir = "teams-package"
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
New-Item -ItemType Directory -Force -Path "$tmpDir\icons" | Out-Null

# Read and replace manifest placeholders
$manifest = Get-Content "teams-manifest.json" -Raw
$manifest = $manifest `
  -replace '\{\{TEAMS_APP_ID\}\}', $AppId `
  -replace '\{\{HOSTNAME\}\}', $Hostname `
  -replace '\{\{BOT_APP_ID\}\}', $BotAppId `
  -replace '\{\{AZURE_AD_CLIENT_ID\}\}', $AzureClientId

# Write processed manifest
Set-Content "$tmpDir\manifest.json" $manifest -Encoding utf8

# Copy icons
Copy-Item "icons\color.png"   "$tmpDir\icons\color.png"
Copy-Item "icons\outline.png" "$tmpDir\icons\outline.png"

# Create zip
Remove-Item $OutputPath -ErrorAction SilentlyContinue
Compress-Archive -Path "$tmpDir\*" -DestinationPath $OutputPath -Force

# Cleanup temp
Remove-Item -Recurse -Force $tmpDir

Write-Host ""
Write-Host "Package created: $OutputPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Microsoft Teams"
Write-Host "  2. Go to: Apps → Manage your apps → Upload an app"
Write-Host "  3. Select: $OutputPath"
Write-Host "  4. Click Add and test the bot with 'help'"
Write-Host ""
Write-Host "Manifest values used:" -ForegroundColor Cyan
Write-Host "  App ID    : $AppId"
Write-Host "  Hostname  : $Hostname"
Write-Host "  Bot ID    : $BotAppId"
Write-Host "  Client ID : $AzureClientId"
