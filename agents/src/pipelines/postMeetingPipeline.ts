// =============================================================================
// agents/src/pipelines/postMeetingPipeline.ts
// Orchestrates the full post-meeting agent pipeline using Semantic Kernel
// Stages: summary → action items → decisions → embedding indexing → planner sync
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { buildKernel, kernelConfigFromEnv } from '../kernel/buildKernel.js';
import { MeetingPlugin } from '../plugins/MeetingPlugin.js';
import { nowIso } from '@meetmind/shared';
import type { AgentPipelineResult } from '@meetmind/shared';

export interface PostMeetingPipelineInput {
  meetingId: string;
  tenantId: string;
  jobId: string;
  transcriptText: string;
  meetingTitle: string;
}

export async function runPostMeetingPipeline(
  input: PostMeetingPipelineInput
): Promise<AgentPipelineResult> {
  const startMs = Date.now();
  const kernel = buildKernel(kernelConfigFromEnv());

  // Register plugins
  kernel.addPlugin(new MeetingPlugin(), 'MeetingPlugin');

  const stages: AgentPipelineResult['stages'] = [];

  // ---- Stage 1: Summary ----
  const t1 = Date.now();
  try {
    await kernel.invokeAsync('MeetingPlugin', 'SummariseMeeting', {
      transcript: input.transcriptText,
      title: input.meetingTitle,
    });
    stages.push({ name: 'summary', status: 'completed', durationMs: Date.now() - t1 });
  } catch (err) {
    stages.push({ name: 'summary', status: 'failed', durationMs: Date.now() - t1, error: String(err) });
  }

  // ---- Stage 2: Action Items ----
  const t2 = Date.now();
  try {
    await kernel.invokeAsync('MeetingPlugin', 'ExtractActionItems', {
      transcript: input.transcriptText,
    });
    stages.push({ name: 'action_items', status: 'completed', durationMs: Date.now() - t2 });
  } catch (err) {
    stages.push({ name: 'action_items', status: 'failed', durationMs: Date.now() - t2, error: String(err) });
  }

  // ---- Stage 3: Embedding Indexing (HTTP call to indexMeeting function) ----
  const t3 = Date.now();
  try {
    const indexUrl = process.env['FUNCTION_INDEX_MEETING_URL']!;
    const res = await fetch(indexUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId: input.meetingId, tenantId: input.tenantId }),
    });
    if (!res.ok) throw new Error(`Indexing HTTP ${res.status}`);
    stages.push({ name: 'embedding_indexing', status: 'completed', durationMs: Date.now() - t3 });
  } catch (err) {
    stages.push({ name: 'embedding_indexing', status: 'failed', durationMs: Date.now() - t3, error: String(err) });
  }

  const allOk = stages.every((s) => s.status === 'completed');

  return {
    jobId: input.jobId,
    meetingId: input.meetingId,
    success: allOk,
    stages,
    totalDurationMs: Date.now() - startMs,
  };
}
