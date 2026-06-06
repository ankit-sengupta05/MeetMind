// =============================================================================
// shared/src/types/agent.ts
// Semantic Kernel agent job and pipeline types
// =============================================================================

export type AgentJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentJobType =
  | 'pre_meeting_brief'
  | 'real_time_tag'
  | 'post_meeting_summary'
  | 'action_item_extraction'
  | 'decision_extraction'
  | 'embedding_indexing'
  | 'planner_sync';

export interface AgentJob {
  id: string;
  meetingId: string;
  tenantId: string;
  type: AgentJobType;
  status: AgentJobStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AgentPipelineResult {
  jobId: string;
  meetingId: string;
  success: boolean;
  stages: {
    name: string;
    status: 'skipped' | 'completed' | 'failed';
    durationMs: number;
    output?: unknown;
    error?: string;
  }[];
  totalDurationMs: number;
}

export interface SkKernelConfig {
  azureOpenAiEndpoint: string;
  azureOpenAiApiKey: string;
  chatDeploymentName: string;
  embeddingDeploymentName: string;
  maxTokens: number;
  temperature: number;
}
