# =============================================================================
# scripts/provision-azure.ps1
# One-shot Azure resource provisioning for MeetMind
# Run AFTER: az login && az account set --subscription "<id>"
#
# Usage: .\scripts\provision-azure.ps1 -SubscriptionId "xxx" -Location "eastus"
# =============================================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$SubscriptionId,

  [string]$Location = "eastus",
  [string]$ResourceGroup = "rg-meetmind-prod",
  [string]$AppName = "meetmind"
)

$ErrorActionPreference = "Stop"

function Step($msg) {
  Write-Host "`n[$([DateTime]::Now.ToString('HH:mm:ss'))] $msg" -ForegroundColor Cyan
}
function OK($msg) { Write-Host "  OK: $msg" -ForegroundColor Green }
function WARN($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow }

Step "Setting active subscription"
az account set --subscription $SubscriptionId
OK "Subscription: $SubscriptionId"

Step "Creating resource group: $ResourceGroup"
az group create --name $ResourceGroup --location $Location | Out-Null
OK "Resource group ready"

# ---- Storage (needed by Functions) ----------------------------------------
Step "Creating Storage Account"
$storageName = "$($AppName)storage$(Get-Random -Minimum 1000 -Maximum 9999)"
az storage account create `
  --name $storageName `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku Standard_LRS `
  --kind StorageV2 | Out-Null
az storage container create `
  --name "$AppName-artifacts" `
  --account-name $storageName | Out-Null
OK "Storage: $storageName"

# ---- Cosmos DB ---------------------------------------------------------------
Step "Creating Cosmos DB (Serverless)"
az cosmosdb create `
  --name "$AppName-cosmos" `
  --resource-group $ResourceGroup `
  --kind GlobalDocumentDB `
  --capabilities EnableServerless `
  --default-consistency-level Session `
  --locations regionName=$Location | Out-Null
OK "Cosmos DB: $AppName-cosmos"

# ---- Service Bus -------------------------------------------------------------
Step "Creating Service Bus (Standard)"
az servicebus namespace create `
  --name "$AppName-sb" `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku Standard | Out-Null
az servicebus queue create `
  --name "$AppName-agent-jobs" `
  --namespace-name "$AppName-sb" `
  --resource-group $ResourceGroup | Out-Null
OK "Service Bus + queue: $AppName-agent-jobs"

# ---- Azure AI Search ---------------------------------------------------------
Step "Creating Azure AI Search (Standard S1 — required for semantic ranker)"
az search service create `
  --name "$AppName-search" `
  --resource-group $ResourceGroup `
  --sku Standard `
  --partition-count 1 `
  --replica-count 1 | Out-Null
OK "AI Search: $AppName-search"

# ---- Azure OpenAI ------------------------------------------------------------
Step "Creating Azure OpenAI resource"
az cognitiveservices account create `
  --name "$AppName-openai" `
  --resource-group $ResourceGroup `
  --kind OpenAI `
  --sku S0 `
  --location $Location `
  --yes | Out-Null
OK "Azure OpenAI: $AppName-openai"

Write-Host ""
WARN "ACTION REQUIRED: Deploy GPT-4o and text-embedding-3-small models manually."
WARN "  Portal: Azure OpenAI Studio → Deployments → Create"
WARN "  Or wait for your subscription to get GPT-4o access approval."

# ---- App Service (API server) -----------------------------------------------
Step "Creating App Service Plan + Web App (API)"
az appservice plan create `
  --name "$AppName-plan" `
  --resource-group $ResourceGroup `
  --sku B2 `
  --is-linux | Out-Null
az webapp create `
  --name "$AppName-api" `
  --resource-group $ResourceGroup `
  --plan "$AppName-plan" `
  --runtime "NODE:20-lts" | Out-Null
OK "App Service: $AppName-api"

# ---- Azure Functions ---------------------------------------------------------
Step "Creating Azure Functions App"
az functionapp create `
  --name "$AppName-functions" `
  --resource-group $ResourceGroup `
  --consumption-plan-location $Location `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --storage-account $storageName | Out-Null
OK "Functions App: $AppName-functions"

# ---- Output connection strings -----------------------------------------------
Step "Fetching connection strings for .env"

$cosmosKeys = az cosmosdb keys list --name "$AppName-cosmos" --resource-group $ResourceGroup | ConvertFrom-Json
$sbKeys = az servicebus namespace authorization-rule keys list `
  --resource-group $ResourceGroup `
  --namespace-name "$AppName-sb" `
  --name RootManageSharedAccessKey | ConvertFrom-Json
$searchKeys = az search admin-key show --service-name "$AppName-search" --resource-group $ResourceGroup | ConvertFrom-Json
$openaiKeys = az cognitiveservices account keys list --name "$AppName-openai" --resource-group $ResourceGroup | ConvertFrom-Json
$openaiEndpoint = (az cognitiveservices account show --name "$AppName-openai" --resource-group $ResourceGroup | ConvertFrom-Json).properties.endpoint
$storageConn = (az storage account show-connection-string --name $storageName --resource-group $ResourceGroup | ConvertFrom-Json).connectionString

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " COPY THESE VALUES INTO server\.env" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "COSMOS_ENDPOINT=https://$AppName-cosmos.documents.azure.com:443/"
Write-Host "COSMOS_KEY=$($cosmosKeys.primaryMasterKey)"
Write-Host "AZURE_OPENAI_ENDPOINT=$openaiEndpoint"
Write-Host "AZURE_OPENAI_API_KEY=$($openaiKeys.key1)"
Write-Host "AZURE_SEARCH_ENDPOINT=https://$AppName-search.search.windows.net"
Write-Host "AZURE_SEARCH_ADMIN_KEY=$($searchKeys.primaryKey)"
Write-Host "SERVICEBUS_CONNECTION_STRING=$($sbKeys.primaryConnectionString)"
Write-Host "AZURE_STORAGE_CONNECTION_STRING=$storageConn"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Provisioning complete!" -ForegroundColor Green
Write-Host "Next: Register Azure AD App, fill remaining .env values, deploy." -ForegroundColor Yellow
