# MeetMind — Production Readiness Checklist

> **Status:** Pre-launch review for hackathon submission.  
> Review each section before going to production.

---

## 1. Security

| Check | Status | Notes |
|---|---|---|
| Azure AD token validation on all protected routes | ✅ | `authMiddleware.ts` validates JWT using `jwks-rsa` |
| Bot Framework request signature validation | ✅ | `CloudAdapter` validates `Authorization` header from BF |
| Graph webhook clientState validation | ✅ | `webhooks.ts` checks `clientState` matches `BOT_APP_ID` |
| No secrets in source code or `.env` committed | ✅ | `.gitignore` covers all `.env*` files |
| Cosmos DB accessed via managed identity in prod | ⚠️ | Currently uses key auth; migrate to `DefaultAzureCredential` for prod |
| RBAC on Azure resources (no wildcard permissions) | ⚠️ | Set App Service managed identity with `Cosmos DB Built-in Data Contributor` |
| Secret rotation policy | ⚠️ | Use Azure Key Vault for all secrets; set 90-day rotation reminders |
| HTTPS only (HTTP redirect on App Service) | ✅ | Enforced via `helmet` + App Service HTTPS-only setting |
| Rate limiting on API routes | ✅ | `express-rate-limit` 100 req/min per IP |

### Action Items Before Production:
1. Migrate Cosmos and Search key auth → `DefaultAzureCredential` (managed identity).
2. Move all secrets to Azure Key Vault + reference them in App Service settings.
3. Enable Azure Defender for App Service.

---

## 2. Performance & Latency Budget

| Route | Expected P50 | Expected P95 | Notes |
|---|---|---|---|
| `GET /api/v1/health` | < 5ms | < 20ms | No DB calls |
| `GET /api/v1/meetings` | < 80ms | < 200ms | Single Cosmos query |
| `GET /api/v1/meetings/:id` | < 60ms | < 150ms | Point read (optimal) |
| `POST /api/v1/meetings/:id/analyze` | 3–8s | 12s | GPT-4o call, may hit limits |
| `GET /api/v1/meetings/search?q=` | 400ms–1s | 2s | Embedding generation + Search |
| `POST /api/bot/messages` | < 100ms | < 300ms | Must return 202 within 15s per BF SLA |

### Cosmos DB RU Budget (per meeting):
- Write meeting record (full): ~50 RUs
- Append transcript segment: ~5 RUs
- List all meetings for tenant: ~20–80 RUs (scales with count)
- Point read by ID: ~1 RU

**Recommendation:** Enable Cosmos DB autoscale (max 4,000 RUs) for production.

---

## 3. Privacy & Compliance

| Topic | Notes |
|---|---|
| **Data Residency** | All data stays within the tenant's Azure subscription. No cross-tenant data sharing. |
| **GDPR — Right to Erasure** | Implement a `/api/admin/tenants/:id/purge` endpoint that hard-deletes all Cosmos documents for a tenant. |
| **GDPR — Transcript Storage** | Transcripts contain personal conversation data. Store with 90-day TTL by default; make configurable per tenant. |
| **GDPR — Lawful Basis** | Consent must be obtained before recording. The Teams Bot posts a notice when joining a meeting. |
| **OpenAI Data Policy** | Azure OpenAI does **not** use customer data for model training. Clearly communicate this to enterprise buyers. |
| **Attendee Opt-Out** | Future: Allow individual attendees to opt out of transcript inclusion. |
| **Audit Logs** | All data access should be logged to Application Insights for compliance audit trails. |

---

## 4. Known Limitations (Disclose Honestly)

1. **Transcript Accuracy:** The pipeline currently mocks Graph transcript data for local dev. Production requires `OnlineMeeting.ReadAll.All` Microsoft Graph permission and a licensed Teams Premium tenant.

2. **Teams Meeting End Webhook Latency:** Graph `callRecords` change notifications can be delayed by 5–15 minutes after a call ends. Real-time webhook behavior requires additional testing.

3. **Planner Sync — Personal Plans:** Planner task sync requires a `planId`. If the meeting organizer has no existing Planner plan, the sync will fail gracefully (logged, not surfaced to user).

4. **No Conflict Resolution:** If two agents run concurrently for the same meeting (e.g., two functions fire on a race condition), Cosmos DB `replace` will overwrite the earlier result. Optimistic concurrency via `_etag` is not yet implemented.

5. **Bot in Large Channels:** The bot does not filter noise in channels with > 1,000 members. At scale, proactive messaging costs should be monitored.

---

## 5. Next Features (If This Wins)

1. **🎙️ Real-Time Audio Ingestion**  
   Integrate Azure Cognitive Services Speech SDK directly into the Teams meeting audio stream for sub-second, speaker-attributed transcription. Current polling from Graph adds 10s of latency.

2. **📊 Organizational Analytics Dashboard**  
   Aggregate data across all tenant meetings to surface insights: "Which teams have the most open action items?", "What topics came up most this quarter?", "Which decisions were never acted on?" — executive intelligence dashboard.

3. **🤖 Copilot Plugin**  
   Publish MeetMind as a Microsoft Copilot for M365 plugin (Message Extension + Declarative Agent). This allows users to query meeting knowledge directly inside Copilot: `@MeetMind What did we decide about the budget last month?`
