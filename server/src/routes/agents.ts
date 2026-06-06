// =============================================================================
// server/src/routes/agents.ts
// Trigger and status-check for Semantic Kernel agent jobs
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getAgentJobsContainer } from '../db/cosmosClient.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { nowIso } from '@meetmind/shared';
import type { AgentJob, AgentJobType } from '@meetmind/shared';

export const agentsRouter = Router();

const JOB_TYPES: AgentJobType[] = [
  'pre_meeting_brief',
  'real_time_tag',
  'post_meeting_summary',
  'action_item_extraction',
  'decision_extraction',
  'embedding_indexing',
  'planner_sync',
];

// POST /api/v1/agents/jobs – enqueue an agent job
agentsRouter.post('/jobs', async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    meetingId: z.string().uuid(),
    type: z.enum(JOB_TYPES as [AgentJobType, ...AgentJobType[]]),
    input: z.record(z.unknown()).optional(),
    scheduledAt: z.string().datetime().optional(),
  });

  const body = schema.parse(req.body);
  const container = await getAgentJobsContainer();
  const now = nowIso();

  const job: AgentJob = {
    id: uuidv4(),
    meetingId: body.meetingId,
    tenantId: req.user!.tid,
    type: body.type,
    status: 'queued',
    input: body.input,
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: body.scheduledAt ?? now,
    createdAt: now,
  };

  const { resource } = await container.items.create(job);
  res.status(202).json(resource);
});

// GET /api/v1/agents/jobs/:id – poll job status
agentsRouter.get('/jobs/:id', async (req: AuthenticatedRequest, res) => {
  const container = await getAgentJobsContainer();
  const { resource } = await container.item(req.params['id']!, req.user!.tid).read<AgentJob>();
  if (!resource) throw createError('Agent job not found', 404);
  res.json(resource);
});

// GET /api/v1/agents/jobs?meetingId=... – list jobs for a meeting
agentsRouter.get('/jobs', async (req: AuthenticatedRequest, res) => {
  const meetingId = z.string().uuid().parse(req.query['meetingId']);
  const container = await getAgentJobsContainer();
  const { resources } = await container.items.query<AgentJob>({
    query: 'SELECT * FROM c WHERE c.tenantId = @tid AND c.meetingId = @mid ORDER BY c.createdAt DESC',
    parameters: [
      { name: '@tid', value: req.user!.tid },
      { name: '@mid', value: meetingId },
    ],
  }).fetchAll();
  res.json({ items: resources });
});
