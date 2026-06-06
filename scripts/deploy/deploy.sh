#!/usr/bin/env bash
# =============================================================================
# scripts/deploy/deploy.sh
# Full Azure resource provisioning for MeetMind
# 
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh --env prod --location eastus
#
# Estimated Monthly Cost Breakdown (USD):
# ─────────────────────────────────────────────────────
#   Azure OpenAI (GPT-4o, 1M tokens/month)     ~$30
#   Azure OpenAI (ada-002 embeddings)           ~$5
#   Cosmos DB (serverless, 10M RUs/month)       ~$10
#   Azure AI Search (Basic tier)               ~$75
#   App Service Plan (B2, 2 cores)             ~$75
#   Azure Functions (Consumption)              ~$0–5
#   Bot Service (F0 free tier)                 ~$0
#   Azure Container Registry (Basic)           ~$5
#   Application Insights                       ~$5
# ─────────────────────────────────────────────────────
#   TOTAL ESTIMATED:                           ~$205/month
# =============================================================================

set -euo pipefail

# --- Arguments & Defaults ---
ENVIRONMENT="${ENVIRONMENT:-prod}"
LOCATION="${LOCATION:-eastus}"
APP_NAME="meetmind"
RESOURCE_GROUP="${APP_NAME}-${ENVIRONMENT}-rg"
BOT_APP_ID="${BOT_APP_ID:?'BOT_APP_ID env var is required'}"
BOT_APP_PASSWORD="${BOT_APP_PASSWORD:?'BOT_APP_PASSWORD env var is required'}"
AAD_CLIENT_ID="${AAD_CLIENT_ID:?'AAD_CLIENT_ID env var is required'}"
AAD_CLIENT_SECRET="${AAD_CLIENT_SECRET:?'AAD_CLIENT_SECRET env var is required'}"
AAD_TENANT_ID="${AAD_TENANT_ID:?'AAD_TENANT_ID env var is required'}"

log() { echo -e "\n\033[1;34m[MeetMind Deploy]\033[0m $1"; }

log "Starting MeetMind deployment to environment: ${ENVIRONMENT} in ${LOCATION}"

# ─── 1. Resource Group ───────────────────────────────────────────────────────
log "Creating Resource Group: ${RESOURCE_GROUP}"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=meetmind environment="$ENVIRONMENT"

# ─── 2. Azure OpenAI ─────────────────────────────────────────────────────────
log "Deploying Azure OpenAI account"
OPENAI_NAME="${APP_NAME}-openai-${ENVIRONMENT}"
az cognitiveservices account create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --kind OpenAI \
  --sku S0 \
  --yes

log "Deploying GPT-4o model"
az cognitiveservices account deployment create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "gpt-4o" \
  --model-name "gpt-4o" \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 50

log "Deploying text-embedding-ada-002"
az cognitiveservices account deployment create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "text-embedding-ada-002" \
  --model-name "text-embedding-ada-002" \
  --model-version "2" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 50

OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.endpoint" -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "key1" -o tsv)

log "OpenAI Endpoint: ${OPENAI_ENDPOINT}"

# ─── 3. Cosmos DB ────────────────────────────────────────────────────────────
log "Deploying Cosmos DB account (serverless)"
COSMOS_NAME="${APP_NAME}-cosmos-${ENVIRONMENT}"
az cosmosdb create \
  --name "$COSMOS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --kind GlobalDocumentDB \
  --capabilities EnableServerless \
  --default-consistency-level Session

az cosmosdb sql database create \
  --account-name "$COSMOS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --name "meetmind"

for CONTAINER in meetings actionitems transcripts; do
  az cosmosdb sql container create \
    --account-name "$COSMOS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --database-name "meetmind" \
    --name "$CONTAINER" \
    --partition-key-path "/partitionKey"
done

COSMOS_ENDPOINT=$(az cosmosdb show \
  --name "$COSMOS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "documentEndpoint" -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
  --name "$COSMOS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryMasterKey" -o tsv)

log "Cosmos DB Endpoint: ${COSMOS_ENDPOINT}"

# ─── 4. Azure AI Search ──────────────────────────────────────────────────────
log "Deploying Azure AI Search (Basic tier)"
SEARCH_NAME="${APP_NAME}-search-${ENVIRONMENT}"
az search service create \
  --name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Basic \
  --partition-count 1 \
  --replica-count 1

SEARCH_ENDPOINT="https://${SEARCH_NAME}.search.windows.net"
SEARCH_KEY=$(az search admin-key show \
  --service-name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryKey" -o tsv)

# ─── 5. App Service Plan + Web App ───────────────────────────────────────────
log "Deploying App Service Plan (B2)"
PLAN_NAME="${APP_NAME}-plan-${ENVIRONMENT}"
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku B2 \
  --is-linux

APP_SERVICE_NAME="${APP_NAME}-api-${ENVIRONMENT}"
log "Deploying Web App: ${APP_SERVICE_NAME}"
az webapp create \
  --name "$APP_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "NODE:20-lts"

API_ENDPOINT="https://${APP_SERVICE_NAME}.azurewebsites.net"

# ─── 6. Azure Functions ──────────────────────────────────────────────────────
log "Deploying Azure Functions (Consumption)"
STORAGE_NAME="${APP_NAME}storage${ENVIRONMENT}"
FUNC_NAME="${APP_NAME}-functions-${ENVIRONMENT}"

az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS

az functionapp create \
  --name "$FUNC_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-account "$STORAGE_NAME" \
  --consumption-plan-location "$LOCATION" \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4

# ─── 7. Bot Service ──────────────────────────────────────────────────────────
log "Deploying Azure Bot Service (F0 free tier)"
BOT_NAME="${APP_NAME}-bot-${ENVIRONMENT}"
az bot create \
  --name "$BOT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --appid "$BOT_APP_ID" \
  --kind webapp \
  --endpoint "${API_ENDPOINT}/api/bot/messages" \
  --sku F0

az bot msteams create \
  --name "$BOT_NAME" \
  --resource-group "$RESOURCE_GROUP"

# ─── 8. Application Insights ─────────────────────────────────────────────────
log "Deploying Application Insights"
APPINSIGHTS_NAME="${APP_NAME}-insights-${ENVIRONMENT}"
az monitor app-insights component create \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --kind web

APPINSIGHTS_KEY=$(az monitor app-insights component show \
  --app "$APPINSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "instrumentationKey" -o tsv)

# ─── 9. Set App Service Environment Variables ─────────────────────────────────
log "Setting App Service environment variables"
az webapp config appsettings set \
  --name "$APP_SERVICE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    COSMOS_ENDPOINT="$COSMOS_ENDPOINT" \
    COSMOS_KEY="$COSMOS_KEY" \
    COSMOS_DB_NAME=meetmind \
    OPENAI_ENDPOINT="$OPENAI_ENDPOINT" \
    OPENAI_KEY="$OPENAI_KEY" \
    OPENAI_CHAT_DEPLOYMENT=gpt-4o \
    OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002 \
    SEARCH_ENDPOINT="$SEARCH_ENDPOINT" \
    SEARCH_KEY="$SEARCH_KEY" \
    SEARCH_INDEX_NAME=meetmind-meetings \
    AZURE_TENANT_ID="$AAD_TENANT_ID" \
    AZURE_CLIENT_ID="$AAD_CLIENT_ID" \
    AZURE_CLIENT_SECRET="$AAD_CLIENT_SECRET" \
    BOT_APP_ID="$BOT_APP_ID" \
    BOT_APP_PASSWORD="$BOT_APP_PASSWORD" \
    BOT_APP_ENDPOINT="$API_ENDPOINT" \
    APPINSIGHTS_INSTRUMENTATIONKEY="$APPINSIGHTS_KEY"

# ─── Done ─────────────────────────────────────────────────────────────────────
log "✅  All resources deployed successfully!"
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │             MeetMind Deployment Summary          │"
echo "  ├─────────────────────────────────────────────────┤"
echo "  │  API URL:       ${API_ENDPOINT}   │"
echo "  │  Bot Messages:  ${API_ENDPOINT}/api/bot/messages│"
echo "  │  Resource Group: ${RESOURCE_GROUP}│"
echo "  └─────────────────────────────────────────────────┘"
echo ""
echo "  Next step: push to main to trigger GitHub Actions CI/CD."
