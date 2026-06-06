// =============================================================================
// server/src/routes/meetings.ts
// CRUD + OpenAI analysis, Semantic Search, and Planner Sync endpoints
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { MeetingRepository, ActionItemRepository } from '../db/repositories.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { OpenAIService } from '../services/openai.js';
import { CognitiveSearchService } from '../services/search.js';
import { GraphService } from '../services/graph.js';
import type { CreateMeetingDto, ActionItem } from '@meetmind/shared';

export const meetingsRouter = Router();

// GET /api/v1/meetings/search?q=
meetingsRouter.get('/search', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const q = req.query['q'] as string;
  const topK = Number(req.query['topK'] ?? 5);

  if (!q) {
    throw createError('Query parameter "q" is required', 400);
  }

  const results = await CognitiveSearchService.semanticSearch(q, tenantId, topK);
  res.json({ results });
});

// POST /api/v1/meetings
meetingsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    type: z.enum(['one_on_one', 'team', 'all_hands', 'interview', 'standup', 'retrospective', 'other']),
    startTime: z.string().datetime(),
    description: z.string().max(2000).optional(),
    participants: z.array(z.object({
      id: z.string(),
      displayName: z.string(),
      email: z.string().email(),
      role: z.enum(['organizer', 'required', 'optional']),
    })).optional(),
  });

  const body = schema.parse(req.body) as CreateMeetingDto;
  const tenantId = req.user!.tid;
  
  // Enforce organizer is the caller
  body.organizer = {
    id: req.user!.oid,
    displayName: req.user!.name ?? 'Unknown',
    email: req.user!.email ?? '',
    role: 'organizer',
  };

  const meeting = await MeetingRepository.create(body, tenantId);
  res.status(201).json(meeting);
});

// GET /api/v1/meetings
meetingsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const status = req.query['status'] as string | undefined;
  
  const meetings = await MeetingRepository.list(tenantId, status);
  res.json({ items: meetings });
});

// GET /api/v1/meetings/:id
meetingsRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const meeting = await MeetingRepository.getById(req.params['id']!, tenantId);
  if (!meeting) throw createError('Meeting not found', 404);
  res.json(meeting);
});

// POST /api/v1/meetings/:id/analyze
meetingsRouter.post('/:id/analyze', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const meetingId = req.params['id']!;

  const meeting = await MeetingRepository.getById(meetingId, tenantId);
  if (!meeting) throw createError('Meeting not found', 404);
  if (!meeting.transcript || meeting.transcript.length === 0) {
    throw createError('Meeting has no transcript to analyze', 400);
  }

  // Combine transcript segments into text
  const fullText = meeting.transcript.map(s => `${s.speakerName}: ${s.text}`).join('\n');

  // 1. Call Azure OpenAI to analyze
  const analysis = await OpenAIService.analyzeMeetingTranscript(fullText);

  // 2. Update meeting in CosmosDB with results
  const now = new Date().toISOString();
  
  const formattedActionItems: ActionItem[] = analysis.actionItems.map((ai, index) => ({
    ...ai,
    id: `ai-${index}-${Date.now()}`,
    meetingId,
    status: 'pending',
    priority: ai.priority as any ?? 'medium',
    createdAt: now,
    updatedAt: now,
  }));

  const formattedDecisions = analysis.decisions.map((d, index) => ({
    ...d,
    id: `dec-${index}-${Date.now()}`,
    meetingId,
    createdAt: now,
  }));

  const updatedMeeting = await MeetingRepository.update(meetingId, tenantId, {
    status: 'completed',
    tags: analysis.keyTopics,
  });

  // Since ActionItems and Decisions and Summary are on the whole document, we need a custom update
  // or add them directly to the DTO and force type bypass if DTO doesn't include them, 
  // but let's just do a manual replace since the repository handles generic Meeting replace.
  
  const container = await import('../db/cosmosClient.js').then(m => m.getMeetingsContainer());
  const finalMeeting = {
    ...updatedMeeting,
    summary: { ...analysis.summary, generatedAt: now },
    actionItems: formattedActionItems,
    decisions: formattedDecisions,
  };
  
  await container.item(meetingId, tenantId).replace(finalMeeting);

  // 3. Index into Cognitive Search
  await CognitiveSearchService.indexMeeting(finalMeeting);

  res.json({ message: 'Analysis complete', meeting: finalMeeting });
});

// GET /api/v1/meetings/:id/summary
meetingsRouter.get('/:id/summary', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const meeting = await MeetingRepository.getById(req.params['id']!, tenantId);
  if (!meeting) throw createError('Meeting not found', 404);
  if (!meeting.summary) throw createError('No summary available', 404);
  
  res.json(meeting.summary);
});

// POST /api/v1/meetings/:id/sync-tasks
meetingsRouter.post('/:id/sync-tasks', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const meetingId = req.params['id']!;
  const schema = z.object({
    planId: z.string().min(1),
    bucketId: z.string().optional()
  });

  const { planId, bucketId } = schema.parse(req.body);

  const meeting = await MeetingRepository.getById(meetingId, tenantId);
  if (!meeting) throw createError('Meeting not found', 404);
  if (!meeting.actionItems || meeting.actionItems.length === 0) {
    throw createError('No action items to sync', 400);
  }

  const syncedTasks = [];
  const errors = [];

  for (const item of meeting.actionItems) {
    if (item.plannerTaskId) {
      continue; // Already synced
    }
    
    try {
      const taskId = await GraphService.createPlannerTask(item, planId, bucketId);
      
      // Update item in DB
      await ActionItemRepository.update(meetingId, tenantId, item.id, {
        plannerTaskId: taskId,
        status: 'assigned'
      });
      
      syncedTasks.push({ id: item.id, plannerTaskId: taskId });
    } catch (err: any) {
      errors.push({ id: item.id, error: err.message });
    }
  }

  res.json({
    message: `Synced ${syncedTasks.length} tasks`,
    syncedTasks,
    errors
  });
});
