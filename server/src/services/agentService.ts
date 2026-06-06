// =============================================================================
// server/src/services/agentService.ts
// Internal server-side wrapper that triggers agent workflows.
// This avoids cross-package rootDir violations — the server never imports
// from the agents/ workspace directly. Instead, agents are called via
// this thin orchestration service that lives inside server/src.
// =============================================================================

import { AzureOpenAI } from 'openai';
import { OpenAIService } from './openai.js';
import { CognitiveSearchService } from './search.js';
import { GraphService } from './graph.js';
import { MeetingRepository } from '../db/repositories.js';
import { getMeetingsContainer } from '../db/cosmosClient.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface UpcomingMeetingContext {
  id: string;
  title: string;
  startTime: string;
  attendees: { name: string; email: string }[];
  tenantId: string;
}

export class AgentService {
  private static openai = new AzureOpenAI({
    endpoint: config.openai.endpoint,
    apiKey: config.openai.apiKey,
    apiVersion: config.openai.apiVersion,
  });

  // ---------------------------------------------------------------------------
  // Post-Meeting Pipeline
  // Analyzes transcript, syncs tasks, indexes to search, sends email.
  // ---------------------------------------------------------------------------
  static async runPostMeetingPipeline(
    meetingId: string,
    tenantId: string,
    planId: string = config.planner.planId
  ): Promise<void> {
    logger.info(`[AgentService] Starting post-meeting pipeline for ${meetingId}`);

    const meeting = await MeetingRepository.getById(meetingId, tenantId);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);
    if (!meeting.transcript || meeting.transcript.length === 0) {
      throw new Error('No transcript to process');
    }

    const fullText = meeting.transcript.map(s => `${s.speakerName}: ${s.text}`).join('\n');

    // Step 1: Analyze with OpenAI
    logger.info(`[AgentService] Step 1: Analyzing transcript...`);
    const analysis = await OpenAIService.analyzeMeetingTranscript(fullText);

    // Step 2: Persist results to Cosmos
    const now = new Date().toISOString();
    const updatedMeeting = {
      ...meeting,
      status: 'completed' as const,
      tags: analysis.keyTopics,
      summary: { ...analysis.summary, generatedAt: now },
      actionItems: analysis.actionItems.map((ai, idx) => ({
        ...ai,
        id: `ai-${idx}-${Date.now()}`,
        meetingId,
        status: 'pending' as const,
        priority: (ai.priority ?? 'medium') as any,
        createdAt: now,
        updatedAt: now,
      })),
      decisions: analysis.decisions.map((d, idx) => ({
        ...d,
        id: `dec-${idx}-${Date.now()}`,
        meetingId,
        createdAt: now,
      })),
    };

    const container = await getMeetingsContainer();
    await container.item(meetingId, tenantId).replace(updatedMeeting);
    logger.info(`[AgentService] Step 2: Saved analysis results to Cosmos.`);

    // Step 3: Sync to Planner (fail-soft per item)
    logger.info(`[AgentService] Step 3: Syncing ${updatedMeeting.actionItems.length} tasks to Planner...`);
    for (const ai of updatedMeeting.actionItems) {
      try {
        await GraphService.createPlannerTask(ai, planId);
      } catch (err: any) {
        logger.warn(`[AgentService] Planner sync failed for task "${ai.title}": ${err.message}`);
      }
    }

    // Step 4: Index into Cognitive Search
    logger.info(`[AgentService] Step 4: Indexing meeting into Cognitive Search...`);
    await CognitiveSearchService.indexMeeting(updatedMeeting as any);

    // Step 5: Send summary email
    logger.info(`[AgentService] Step 5: Sending summary email...`);
    const recipients = meeting.participants.map(p => p.email).filter(Boolean);
    if (recipients.length > 0) {
      await GraphService.sendEmailSummary(meetingId, tenantId, recipients);
    }

    logger.info(`[AgentService] Post-meeting pipeline complete for ${meetingId}`);
  }

  // ---------------------------------------------------------------------------
  // Pre-Meeting Briefing
  // Searches past meeting knowledge and generates a personalized brief.
  // ---------------------------------------------------------------------------
  static async runPreMeetingBriefing(meeting: UpcomingMeetingContext): Promise<void> {
    logger.info(`[AgentService] Starting pre-meeting briefing for "${meeting.title}"`);

    const searchQuery = `${meeting.title} ${meeting.attendees.map(a => a.name).join(' ')}`;
    const pastMeetings = await CognitiveSearchService.semanticSearch(searchQuery, meeting.tenantId, 3);
    const pastContext = pastMeetings.map(m => `- ${m.title}: ${m.summaryText}`).join('\n');

    for (const attendee of meeting.attendees) {
      const prompt = `You are MeetMind, an AI meeting copilot. Write a brief, friendly pre-meeting briefing email in HTML for ${attendee.name}.
Meeting: "${meeting.title}" at ${meeting.startTime}

Past context from similar meetings:
${pastContext || 'No past meetings found on this topic.'}

Include:
1. Key decisions made previously on this topic
2. Suggested talking points
Keep it concise — 150 words max.`;

      try {
        const res = await this.openai.chat.completions.create({
          model: config.openai.chatDeployment,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 400,
        });

        const briefHtml = res.choices[0]?.message?.content ?? '<p>No briefing available.</p>';
        logger.info(`[AgentService] Briefing for ${attendee.email}:\n${briefHtml.slice(0, 120)}...`);
        // In production, dispatch via GraphService.sendMail(...)
      } catch (err: any) {
        logger.warn(`[AgentService] Briefing generation failed for ${attendee.email}: ${err.message}`);
      }
    }

    logger.info(`[AgentService] Pre-meeting briefing complete for "${meeting.title}"`);
  }
}
