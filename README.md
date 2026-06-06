# MeetMind 🧠

> **AI co-pilot for Microsoft Teams** — turns every meeting into a searchable, actionable knowledge artifact.

[![CI](https://github.com/ankit-sengupta05/MeetMind/actions/workflows/ci.yml/badge.svg)](https://github.com/ankit-sengupta05/MeetMind/actions)
![Node 20](https://img.shields.io/badge/node-20-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.5-blue)
![License MIT](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Prerequisites](#prerequisites)
4. [Local Dev Setup](#local-dev-setup)
5. [Azure Resource Provisioning](#azure-resource-provisioning)
6. [Teams App Sideloading](#teams-app-sideloading)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Phase 2 Checkpoint](#phase-2-checkpoint)

---

## Architecture Overview

```
Teams Client (Tab + Bot)
        │
        ▼
  React 18 + Fluent UI v9  ──► Azure Static Web Apps
        │  (MSAL SSO)
        ▼
  Express API (Node 20)  ──────► Azure App Service B2/B3
        │
   ┌────┴────────────┐
   │                 │
   ▼                 ▼
Cosmos DB       Azure Cognitive
(meetings,      Search (vector +
 jobs, config)  semantic index)
                       ▲
               Azure Functions ──► GPT-4o (Azure OpenAI)
               (background        text-embedding-3-small
                processing)
                       │
               Semantic Kernel
               (agent pipeline)
                       │
                Microsoft Planner
                (via Graph API)
```

---

## Monorepo Structure

```
meetmind/
├── shared/              # Shared TypeScript types, constants, utils
│   └── src/
│       ├── types/       # Meeting, User, Agent, Search, Planner types
│       ├── constants/   # App-wide constants
│       └── utils/       # Pure date/text/validation helpers
├── client/              # React 18 + Fluent UI v9 Teams Tab
│   └── src/
│       ├── api/         # Typed Axios wrappers (meetingsApi, searchApi, etc.)
│       ├── components/  # Shared UI components (AppShell, etc.)
│       ├── config/      # MSAL config
│       ├── pages/       # Dashboard, Search, MeetingDetail, Actions, Settings
│       ├── store/       # Zustand UI state
│       └── styles/      # Global CSS
├── server/              # Express REST API + Bot Framework webhook
│   └── src/
│       ├── config/      # Zod-validated env config
│       ├── db/          # Cosmos DB client
│       ├── middleware/  # Auth (MSAL JWT), error handler, rate limiter
│       ├── routes/      # meetings, search, planner, agents, bot, health
│       └── utils/       # Winston logger
├── functions/           # Azure Functions v4 (background processing)
│   └── src/functions/
│       ├── processAgentJob.ts   # Service Bus trigger → GPT-4o agents
│       └── indexMeeting.ts      # HTTP trigger → embedding + search index
├── agents/              # Semantic Kernel orchestration
│   └── src/
│       ├── kernel/      # SK kernel builder
│       ├── plugins/     # MeetingPlugin (SK functions)
│       └── pipelines/   # postMeetingPipeline
├── .env.example         # ALL required env variables with inline comments
├── teams-manifest.json  # Teams app manifest v1.16
├── package.json         # npm workspaces root
└── tsconfig.base.json   # Shared TypeScript base config
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| npm | 10.x | Bundled with Node 20 |
| Azure CLI | latest | `winget install Microsoft.AzureCLI` |
| Azure Functions Core Tools | v4 | `npm i -g azure-functions-core-tools@4` |
| Teams Toolkit VS Code ext | latest | VS Code Extensions marketplace |
| ngrok (local Teams testing) | latest | [ngrok.com](https://ngrok.com) |

---

## Local Dev Setup

### 1. Clone and install dependencies
```powershell
git clone https://github.com/ankit-sengupta05/MeetMind.git
cd MeetMind
npm install
```

### 2. Configure environment variables
```powershell
# Server env
copy .env.example server\.env

# Client env (VITE_ prefixed variables only)
copy .env.example client\.env.local
```
Edit both files and fill in your Azure resource values (see [Environment Variables Reference](#environment-variables-reference)).

### 3. Build the shared package (required first)
```powershell
npm run build --workspace=shared
```

### 4. Start dev servers
```powershell
# Terminal 1 – API server (port 3001)
npm run dev:server

# Terminal 2 – React client (port 3000)
npm run dev:client

# Terminal 3 – Azure Functions (optional, port 7071)
npm run dev:functions
```

### 5. Expose localhost for Teams (requires HTTPS)
```powershell
ngrok http 3000
# Copy the https://xxxxx.ngrok-free.app URL
# Update VITE_API_BASE_URL and teams-manifest.json {{HOSTNAME}}
```

---

## Azure Resource Provisioning

### Required Resources & Recommended SKUs

| Resource | SKU | Est. Monthly Cost |
|----------|-----|-------------------|
| **Azure App Service** (API server) | B2 (2 core, 3.5 GB) | ~$25 |
| **Azure Static Web Apps** (client) | Standard | ~$9 |
| **Azure Cosmos DB** (NoSQL) | Serverless → Provisioned 1000 RU/s | ~$0–25 |
| **Azure OpenAI** (GPT-4o + embeddings) | Pay-per-token | ~$20–100 (usage) |
| **Azure AI Search** | Standard S1 (semantic ranker required) | ~$250 |
| **Azure Functions** (Consumption plan) | Consumption | ~$0–5 |
| **Azure Service Bus** (Standard) | Standard | ~$10 |
| **Azure Blob Storage** | LRS, Hot tier | ~$2 |
| **Azure Bot Service** | F0 (dev) / S1 (prod) | $0–15 |
| **Azure AD App Registration** | Free | $0 |
| **Application Insights** | Pay-per-use | ~$5 |
| **TOTAL (estimated)** | | **~$320–440/mo** |

> 💡 **Cost tip:** Use Cosmos DB Serverless for dev/test (pay per RU). Switch to provisioned throughput for production. Azure AI Search Standard S1 is the largest cost driver but required for semantic ranking.

### Provision with Azure CLI

```powershell
# 1. Login and set subscription
az login
az account set --subscription "<your-subscription-id>"

# 2. Create resource group
az group create --name rg-meetmind-prod --location eastus

# 3. Cosmos DB (NoSQL Serverless)
az cosmosdb create `
  --name meetmind-cosmos `
  --resource-group rg-meetmind-prod `
  --kind GlobalDocumentDB `
  --capabilities EnableServerless `
  --default-consistency-level Session

# 4. Azure OpenAI
az cognitiveservices account create `
  --name meetmind-openai `
  --resource-group rg-meetmind-prod `
  --kind OpenAI `
  --sku S0 `
  --location eastus

# Deploy models (requires access approval)
az cognitiveservices account deployment create `
  --name meetmind-openai `
  --resource-group rg-meetmind-prod `
  --deployment-name gpt-4o `
  --model-name gpt-4o `
  --model-version "2024-05-13" `
  --model-format OpenAI `
  --sku-capacity 10 `
  --sku-name Standard

az cognitiveservices account deployment create `
  --name meetmind-openai `
  --resource-group rg-meetmind-prod `
  --deployment-name text-embedding-3-small `
  --model-name text-embedding-3-small `
  --model-version "1" `
  --model-format OpenAI `
  --sku-capacity 50 `
  --sku-name Standard

# 5. Azure AI Search (Standard S1 for semantic ranker)
az search service create `
  --name meetmind-search `
  --resource-group rg-meetmind-prod `
  --sku Standard `
  --partition-count 1 `
  --replica-count 1

# 6. Azure Service Bus
az servicebus namespace create `
  --name meetmind-sb `
  --resource-group rg-meetmind-prod `
  --sku Standard

az servicebus queue create `
  --name meetmind-agent-jobs `
  --namespace-name meetmind-sb `
  --resource-group rg-meetmind-prod

# 7. Azure App Service
az appservice plan create `
  --name meetmind-plan `
  --resource-group rg-meetmind-prod `
  --sku B2 `
  --is-linux

az webapp create `
  --name meetmind-api `
  --resource-group rg-meetmind-prod `
  --plan meetmind-plan `
  --runtime "NODE:20-lts"

# 8. Azure Functions App
az functionapp create `
  --name meetmind-functions `
  --resource-group rg-meetmind-prod `
  --consumption-plan-location eastus `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --storage-account meetmindstorage

# 9. Azure Static Web Apps (client)
az staticwebapp create `
  --name meetmind-client `
  --resource-group rg-meetmind-prod `
  --source https://github.com/ankit-sengupta05/MeetMind `
  --location eastus2 `
  --branch main `
  --app-location "/client" `
  --output-location "dist" `
  --login-with-github
```

### Azure AD App Registration

1. Go to **Azure Portal → Azure Active Directory → App registrations → New registration**
2. Name: `MeetMind`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URI: `Single-page application (SPA)` → `http://localhost:3000` (add prod URL later)
5. After creation, go to **Expose an API**:
   - Set Application ID URI: `api://<your-hostname>/<client-id>`
   - Add scope: `MeetMind.ReadWrite` (consent: Admins and users)
6. Go to **API permissions**, add:
   - Microsoft Graph: `User.Read`, `Tasks.ReadWrite`, `Calendars.Read`, `OnlineMeetings.Read`, `Group.Read.All`
   - Click **Grant admin consent**

---

## Teams App Sideloading

### Prerequisites
- Teams admin must enable **custom app uploads** in Teams Admin Center → Teams apps → Setup policies
- Or use a developer tenant from [M365 Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)

### Steps

1. **Replace placeholders in `teams-manifest.json`:**
   ```json
   {
     "id": "<your-guid>",               // Generate with: node -e "console.log(require('crypto').randomUUID())"
     "{{HOSTNAME}}": "your-app.azurestaticapps.net",
     "{{BOT_APP_ID}}": "<bot-app-id>",
     "{{AZURE_AD_CLIENT_ID}}": "<client-id>"
   }
   ```

2. **Create app icons** (required for manifest):
   - `icons/color.png` – 192×192 px full-color icon
   - `icons/outline.png` – 32×32 px white/transparent outline icon

3. **Package the app:**
   ```powershell
   New-Item -ItemType Directory -Force -Path teams-package
   Copy-Item teams-manifest.json teams-package\manifest.json
   Copy-Item -Recurse icons teams-package\icons
   Compress-Archive -Path teams-package\* -DestinationPath meetmind-teams-app.zip -Force
   ```

4. **Sideload in Teams:**
   - Open Microsoft Teams → Apps → Manage your apps
   - Click **Upload an app** → **Upload a custom app**
   - Select `meetmind-teams-app.zip`
   - Click **Add** to install

5. **Test the bot:**
   - Start a chat with MeetMind bot
   - Send `help` to verify the bot responds

### Teams Toolkit (Alternative)
If using VS Code Teams Toolkit:
```
Teams Toolkit → Provision → Deploy → Publish to Teams
```
The toolkit handles manifest injection, bot registration, and sideloading automatically.

---

## Environment Variables Reference

See [.env.example](.env.example) for the full list with inline comments explaining each variable, where to find it in the Azure Portal, and which services require it.

**Quick reference table:**

| Variable | Source |
|----------|--------|
| `AZURE_AD_*` | Azure AD → App registrations → Your app |
| `COSMOS_*` | Cosmos DB account → Keys |
| `AZURE_OPENAI_*` | Azure OpenAI → Resource → Keys and Endpoint |
| `AZURE_SEARCH_*` | AI Search service → Settings → Keys |
| `GRAPH_*` | Azure AD → App registrations (may be same as AD app) |
| `PLANNER_*` | Graph Explorer: `/me/joinedGroups`, `/groups/{id}/planner/plans` |
| `BOT_*` | Azure Bot Service → Configuration |
| `SERVICEBUS_*` | Service Bus → Shared access policies |
| `AZURE_STORAGE_*` | Storage account → Access keys |

---

## Phase 2 Checkpoint

Before proceeding to Phase 2, verify the following:

### Infrastructure
- [ ] All Azure resources provisioned and accessible
- [ ] Azure AD app registration complete with correct redirect URIs
- [ ] Admin consent granted for all Graph API permissions
- [ ] Cosmos DB database `meetmind` and containers created (auto-created on first API call)
- [ ] Azure AI Search index created (auto-created on first `indexMeeting` function call)
- [ ] Both GPT-4o and text-embedding-3-small model deployments are active

### Local Development
- [ ] `npm install` completes without errors
- [ ] `npm run build --workspace=shared` succeeds
- [ ] `npm run dev:server` starts on port 3001 with no startup errors
- [ ] `npm run dev:client` starts on port 3000 and serves the login page
- [ ] `.env` files are populated with real values (copy from `.env.example`)
- [ ] MSAL login popup completes successfully in browser
- [ ] `GET /api/v1/health/live` returns `{ "status": "ok" }`
- [ ] `POST /api/v1/meetings` creates a meeting in Cosmos DB

### Teams Integration
- [ ] `teams-manifest.json` has all `{{PLACEHOLDER}}` values replaced
- [ ] App icons exist at `icons/color.png` and `icons/outline.png`
- [ ] Teams app package (`.zip`) created and sideloaded successfully
- [ ] MeetMind tab loads inside Teams without blank screen
- [ ] Bot responds to `help` command in Teams chat

### Code Quality
- [ ] `npm run typecheck` passes across all workspaces
- [ ] `npm run lint` passes across all workspaces
- [ ] Pre-commit hooks run without errors on a test commit
- [ ] No `.env` files committed to git

---

*Built for the Microsoft Hackathon 2026 · MeetMind v1.0.0*
