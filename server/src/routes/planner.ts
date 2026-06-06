// =============================================================================
// server/src/routes/planner.ts
// Microsoft Planner sync endpoints
// =============================================================================

import { Router } from 'express';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { config } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getMeetingsContainer } from '../db/cosmosClient.js';
import { createError } from '../middleware/errorHandler.js';
import { nowIso } from '@meetmind/shared';
import type { Meeting } from '@meetmind/shared';

export const plannerRouter = Router();

function getGraphClient(): GraphClient {
  const credential = new ClientSecretCredential(
    config.graph.tenantId,
    config.graph.clientId,
    config.graph.clientSecret
  );
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });
  return GraphClient.initWithMiddleware({ authProvider });
}

// POST /api/v1/planner/sync/:meetingId
// Creates Planner tasks for all action items in a meeting
plannerRouter.post('/sync/:meetingId', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const { meetingId } = req.params as { meetingId: string };

  const container = await getMeetingsContainer();
  const { resource: meeting } = await container.item(meetingId, tenantId).read<Meeting>();
  if (!meeting) throw createError('Meeting not found', 404);

  const actionItems = meeting.actionItems ?? [];
  const graph = getGraphClient();
  const created: string[] = [];
  const failed: Array<{ actionItemId: string; error: string }> = [];

  for (const item of actionItems) {
    if (item.plannerTaskId) continue; // already synced

    try {
      const task = await graph.api('/planner/tasks').post({
        planId: config.planner.planId,
        title: item.title,
        dueDateTime: item.dueDate,
        assignments: item.assigneeId
          ? { [item.assigneeId]: { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } }
          : undefined,
        details: item.description
          ? { description: item.description }
          : undefined,
      });
      item.plannerTaskId = task.id as string;
      item.status = 'assigned';
      created.push(task.id as string);
    } catch (err) {
      failed.push({ actionItemId: item.id, error: String(err) });
    }
  }

  // Persist updated action items back to Cosmos
  const updated: Meeting = { ...meeting, actionItems, updatedAt: nowIso() };
  await container.item(meetingId, tenantId).replace(updated);

  res.json({ meetingId, createdTasks: created, failedTasks: failed, syncedAt: nowIso() });
});

// GET /api/v1/planner/plans
plannerRouter.get('/plans', async (_req: AuthenticatedRequest, res) => {
  const graph = getGraphClient();
  const plans = await graph.api(`/groups/${config.planner.groupId}/planner/plans`).get();
  res.json(plans);
});
