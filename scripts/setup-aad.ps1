# =============================================================================
# scripts/setup-aad.ps1
# Azure AD App Registration setup for MeetMind
# Run AFTER: az login
#
# Usage: .\scripts\setup-aad.ps1 -TenantId "xxx" -Hostname "your-hostname.com"
# =============================================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$TenantId,

  [Parameter(Mandatory=$true)]
  [string]$Hostname,

  [string]$AppDisplayName = "MeetMind",
  [string]$LocalRedirectUri = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }

Step "Creating Azure AD App Registration: $AppDisplayName"

# Create the app registration
$app = az ad app create `
  --display-name $AppDisplayName `
  --sign-in-audience AzureADMyOrg `
  --web-redirect-uris $LocalRedirectUri "https://$Hostname" `
  --spa-redirect-uris $LocalRedirectUri "https://$Hostname" `
  | ConvertFrom-Json

$clientId = $app.appId
$objectId = $app.id
OK "App created — Client ID: $clientId"

# Set Application ID URI (required for Teams SSO)
$apiUri = "api://$Hostname/$clientId"
az ad app update --id $objectId --identifier-uris $apiUri | Out-Null
OK "App ID URI: $apiUri"

# Add MeetMind.ReadWrite scope
Step "Adding OAuth2 scope: MeetMind.ReadWrite"
$scopeId = [System.Guid]::NewGuid().ToString()
$scopeBody = @{
  api = @{
    oauth2PermissionScopes = @(
      @{
        id = $scopeId
        adminConsentDescription = "Allows MeetMind to read and write meeting data on behalf of the user"
        adminConsentDisplayName = "MeetMind Read/Write"
        userConsentDescription = "Allow MeetMind to access your meeting data"
        userConsentDisplayName = "MeetMind Read/Write"
        isEnabled = $true
        type = "User"
        value = "MeetMind.ReadWrite"
      }
    )
  }
} | ConvertTo-Json -Depth 5

$scopeBody | Out-File -FilePath "$env:TEMP\scope.json" -Encoding utf8
az ad app update --id $objectId --set (Get-Content "$env:TEMP\scope.json" -Raw | ConvertFrom-Json) | Out-Null
OK "Scope added: MeetMind.ReadWrite"

# Add required Graph API permissions
Step "Adding Microsoft Graph API permissions"
$graphApiId = "00000003-0000-0000-c000-000000000000"

$permissions = @(
  @{ id = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"; type = "Scope" }  # User.Read
  @{ id = "2219042f-cab5-40cc-b0d2-16b1540b4c5f"; type = "Scope" }  # OnlineMeetings.Read
  @{ id = "465a38f9-76ea-45b9-9f34-9e8b0d4b0b42"; type = "Scope" }  # Calendars.Read
  @{ id = "2b9c4092-424d-4249-948d-b43879977640"; type = "Scope" }  # Tasks.ReadWrite
  @{ id = "ba47897c-39ec-4d83-8086-ee8256fa737d"; type = "Scope" }  # Group.Read.All
) | ForEach-Object {
  az ad app permission add `
    --id $objectId `
    --api $graphApiId `
    --api-permissions "$($_.id)=$($_.type)" 2>&1 | Out-Null
}
OK "Graph API permissions added (admin consent required — see Azure Portal)"

# Create client secret
Step "Creating client secret (valid 24 months)"
$secret = az ad app credential reset `
  --id $objectId `
  --years 2 `
  | ConvertFrom-Json
$clientSecret = $secret.password
OK "Client secret created"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " AAD SETUP COMPLETE — Copy these values into your .env files" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "AZURE_AD_TENANT_ID=$TenantId"
Write-Host "AZURE_AD_CLIENT_ID=$clientId"
Write-Host "AZURE_AD_CLIENT_SECRET=$clientSecret"
Write-Host "GRAPH_TENANT_ID=$TenantId"
Write-Host "GRAPH_CLIENT_ID=$clientId"
Write-Host "GRAPH_CLIENT_SECRET=$clientSecret"
Write-Host ""
Write-Host "VITE_AZURE_AD_CLIENT_ID=$clientId"
Write-Host "VITE_AZURE_AD_TENANT_ID=$TenantId"
Write-Host "VITE_REDIRECT_URI=http://localhost:3000"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Grant admin consent in Azure Portal:" -ForegroundColor Yellow
Write-Host "  Portal → Azure AD → App registrations → $AppDisplayName"
Write-Host "  → API permissions → Grant admin consent for <your-org>"
Write-Host ""
Write-Host "teams-manifest.json values:" -ForegroundColor Yellow
Write-Host "  {{TEAMS_APP_ID}}      : $(New-Guid)"
Write-Host "  {{HOSTNAME}}          : $Hostname"
Write-Host "  {{AZURE_AD_CLIENT_ID}}: $clientId"
