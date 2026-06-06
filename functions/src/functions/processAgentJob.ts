// =============================================================================
// functions/src/functions/processAgentJob.ts
// Service Bus triggered function – dequeues agent jobs and runs them
// =============================================================================

import { app } from '@azure/functions';
import type { ServiceBusMessage } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { AzureOpenAI } from '@azure/openai';
import type { AgentJob, Meeting } from '@meetmind/shared';
import { COSMOS_CONTAINERS, nowIso } from '@meetmind/shared';

const cosmos = new CosmosClient({
  endpoint: process.env['COSMOS_ENDPOINT']!,
  key: process.env['COSMOS_KEY']!,
});

const openai = new AzureOpenAI({
  endpoint: process.env['AZURE_OPENAI_ENDPOINT']!,
  apiKey: process.env['AZURE_OPENAI_API_KEY']!,
  apiVersion: process.env['AZURE_OPENAI_API_VERSION'] ?? '2024-04-01-preview',
});

const db = cosmos.database(process.env['COSMOS_DATABASE_NAME'] ?? 'meetmind');

app.serviceBusQueue('processAgentJob', {
  queueName: process.env['SERVICEBUS_QUEUE_NAME'] ?? 'meetmind-agent-jobs',
  connection: 'SERVICEBUS_CONNECTION_STRING',
  handler: async (message: ServiceBusMessage) => {
    const job = message as unknown as AgentJob;
    console.log(`Processing agent job: ${job.id} type=${job.type} meeting=${job.meetingId}`);

    const jobContainer = db.container(COSMOS_CONTAINERS.AGENT_JOBS);
    const meetingContainer = db.container(COSMOS_CONTAINERS.MEETINGS);

    // Mark job as running
    const { resource: jobDoc } = await jobContainer.item(job.id, job.tenantId).read<AgentJob>();
    if (!jobDoc) {
      console.error(`Job ${job.id} not found in Cosmos`);
      return;
    }

    await jobContainer.item(job.id, job.tenantId).replace({
      ...jobDoc,
      status: 'running',
      startedAt: nowIso(),
      attempts: (jobDoc.attempts ?? 0) + 1,
    });

    try {
      // Fetch the meeting
      const { resource: meeting } = await meetingContainer
        .item(job.meetingId, job.tenantId)
        .read<Meeting>();

      if (!meeting) throw new Error(`Meeting ${job.meetingId} not found`);

      let output: Record<string, unknown> = {};

      switch (job.type) {
        case 'post_meeting_summary':
          output = await runSummaryAgent(meeting);
          break;
        case 'action_item_extraction':
          output = await runActionItemAgent(meeting);
          break;
        case 'decision_extraction':
          output = await runDecisionAgent(meeting);
          break;
        case 'embedding_indexing':
          // Handled by separate indexing function
          output = { skipped: true, reason: 'Delegated to indexing function' };
          break;
        default:
          output = { skipped: true, reason: `Unhandled job type: ${job.type}` };
      }

      // Mark job as completed
      await jobContainer.item(job.id, job.tenantId).replace({
        ...jobDoc,
        status: 'completed',
        output,
        completedAt: nowIso(),
      });
    } catch (err) {
      console.error(`Job ${job.id} failed:`, err);
      await jobContainer.item(job.id, job.tenantId).replace({
        ...jobDoc,
        status: 'failed',
        error: String(err),
        completedAt: nowIso(),
      });
      throw err; // Re-throw to trigger Service Bus dead-letter
    }
  },
});

// ---------------------------------------------------------------------------
// Agent implementations
// ---------------------------------------------------------------------------

async function runSummaryAgent(meeting: Meeting): Promise<Record<string, unknown>> {
  const transcriptText = (meeting.transcript ?? [])
    .map((s) => `[${s.speakerName}]: ${s.text}`)
    .join('\n');

  if (!transcriptText) return { error: 'No transcript available' };

  const completion = await openai.chat.completions.create({
    model: process.env['AZURE_OPENAI_CHAT_DEPLOYMENT'] ?? 'gpt-4o',
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are MeetMind's summarization AI. Given a meeting transcript,
produce a JSON summary with these exact keys:
{
  "headline": "One sentence TL;DR",
  "overview": "2-3 paragraph overview",
  "keyPoints": ["array of key discussion points"],
  "decisions": ["array of decisions made"],
  "nextSteps": ["array of next steps"],
  "topics": ["array of topics covered"],
  "sentiment": "positive|neutral|negative|mixed"
}`,
      },
      {
        role: 'user',
        content: `Meeting title: ${meeting.title}\n\nTranscript:\n${transcriptText.slice(0, 30000)}`,
      },
    ],
  });

  const summaryJson = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  summaryJson.generatedAt = nowIso();

  // Persist summary back to the meeting
  const container = db.container(COSMOS_CONTAINERS.MEETINGS);
  const { resource: existing } = await container.item(meeting.id, meeting.partitionKey).read<Meeting>();
  if (existing) {
    await container.item(meeting.id, meeting.partitionKey).replace({
      ...existing,
      summary: summaryJson,
      status: 'completed',
      updatedAt: nowIso(),
    });
  }

  return { summary: summaryJson };
}

async function runActionItemAgent(meeting: Meeting): Promise<Record<string, unknown>> {
  const transcriptText = (meeting.transcript ?? [])
    .map((s) => `[${s.speakerName}]: ${s.text}`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: process.env['AZURE_OPENAI_CHAT_DEPLOYMENT'] ?? 'gpt-4o',
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract action items from the meeting transcript. Return JSON:
{
  "actionItems": [
    {
      "title": "short title",
      "description": "detail",
      "assigneeName": "person name or null",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "low|medium|high|urgent"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Meeting: ${meeting.title}\n\n${transcriptText.slice(0, 30000)}`,
      },
    ],
  });

  const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  return result;
}

async function runDecisionAgent(meeting: Meeting): Promise<Record<string, unknown>> {
  const transcriptText = (meeting.transcript ?? [])
    .map((s) => `[${s.speakerName}]: ${s.text}`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: process.env['AZURE_OPENAI_CHAT_DEPLOYMENT'] ?? 'gpt-4o',
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract decisions made during the meeting. Return JSON:
{
  "decisions": [
    {
      "title": "decision title",
      "description": "what was decided",
      "rationale": "why this was decided or null",
      "impact": "expected impact or null"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Meeting: ${meeting.title}\n\n${transcriptText.slice(0, 30000)}`,
      },
    ],
  });

  const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  return result;
}
