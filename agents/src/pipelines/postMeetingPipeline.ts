// =============================================================================
// agents/src/pipelines/postMeetingPipeline.ts
// Post-meeting agent pipeline — SK v0.3.0 compatible
// Plugin methods are called directly (SK v0.3.0; no invokeAsync on kernel yet).
// Actual LLM work is done in Azure Functions (processAgentJob) via @azure/openai.
// This layer handles: orchestration order, error isolation, result aggregation.
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { buildKernel, kernelConfigFromEnv } from '../kernel/buildKernel.js';
import { MeetingPlugin } from '../plugins/MeetingPlugin.js';

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

  // Build SK kernel (v0.3.0) and instantiate plugin
  buildKernel(kernelConfigFromEnv()); // kernel wired for future SK v1.x
  const plugin = new MeetingPlugin();
  const stages: AgentPipelineResult['stages'] = [];

  // ---- Stage 1: Summary (delegates to Azure Function via HTTP) ----
  const t1 = Date.now();
  try {
    await plugin.summariseMeeting(input.transcriptText, input.meetingTitle);
    stages.push({ name: 'summary', status: 'completed', durationMs: Date.now() - t1 });
  } catch (err) {
    stages.push({
      name: 'summary',
      status: 'failed',
      durationMs: Date.now() - t1,
      error: String(err),
    });
  }

  // ---- Stage 2: Action Item Extraction ----
  const t2 = Date.now();
  try {
    await plugin.extractActionItems(input.transcriptText);
    stages.push({ name: 'action_items', status: 'completed', durationMs: Date.now() - t2 });
  } catch (err) {
    stages.push({
      name: 'action_items',
      status: 'failed',
      durationMs: Date.now() - t2,
      error: String(err),
    });
  }

  // ---- Stage 3: Embedding Indexing (HTTP trigger to Azure Function) ----
  const t3 = Date.now();
  try {
    const indexUrl = process.env['FUNCTION_INDEX_MEETING_URL'];
    if (!indexUrl) throw new Error('FUNCTION_INDEX_MEETING_URL not configured');

    const res = await fetch(indexUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId: input.meetingId,
        tenantId: input.tenantId,
      }),
    });
    if (!res.ok) throw new Error(`Indexing function returned HTTP ${res.status}`);
    stages.push({ name: 'embedding_indexing', status: 'completed', durationMs: Date.now() - t3 });
  } catch (err) {
    stages.push({
      name: 'embedding_indexing',
      status: 'failed',
      durationMs: Date.now() - t3,
      error: String(err),
    });
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
