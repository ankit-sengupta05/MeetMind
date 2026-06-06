// =============================================================================
// server/src/bot/meetMindBot.ts
// Bot Framework TeamsActivityHandler for MeetMind
// =============================================================================

import { TeamsActivityHandler, TurnContext, MessageFactory } from 'botbuilder';
import { MeetingRepository } from '../db/repositories.js';
import { TranscriptPipeline } from '../services/transcriptPipeline.js';
import { CognitiveSearchService } from '../services/search.js';
import { AgentService } from '../services/agentService.js';
import { createMeetingSummaryCard } from './cards/meetingSummaryCard.js';
import { createSearchResultCard } from './cards/searchResultCard.js';
import { logger } from '../utils/logger.js';

export class MeetMindBot extends TeamsActivityHandler {
  // Conversation reference store for proactive messaging
  private conversationReferences = new Map<string, any>();

  constructor() {
    super();

    // 1. Welcome new members
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded ?? [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            `👋 Hello! I'm **MeetMind** — your AI meeting copilot.\n\n` +
            `I automatically capture decisions, extract action items, and sync them to Planner — ` +
            `all while you focus on the conversation.\n\n` +
            `During a meeting, try:\n• \`@MeetMind search [topic]\`\n• \`@MeetMind status\``
          );
        }
      }
      await next();
    });

    // 2. Message commands
    this.onMessage(async (context, next) => {
      // Strip @mention and normalize
      const raw = context.activity.text ?? '';
      const text = raw.replace(/<at>[^<]+<\/at>/gi, '').trim().toLowerCase();

      if (text.startsWith('search')) {
        const query = raw.replace(/<at>[^<]+<\/at>/gi, '').replace(/^search\s*/i, '').trim();
        await this.handleSearchCommand(context, query);
      } else if (text.startsWith('status')) {
        await this.handleStatusCommand(context);
      } else {
        await context.sendActivity(
          `I didn't understand that. Try:\n• \`@MeetMind search [topic]\`\n• \`@MeetMind status\``
        );
      }

      await next();
    });
  }

  // ---------------------------------------------------------------------------
  // Teams Meeting Lifecycle
  // ---------------------------------------------------------------------------

  protected async handleTeamsMeetingStartEvent(
    context: TurnContext,
    meeting: any
  ): Promise<void> {
    const tenantId = context.activity.conversation.tenantId ?? 'unknown-tenant';
    logger.info(`[MeetMindBot] Meeting started — Teams ID: ${meeting?.id}`);

    // Store conversation reference for proactive messages after meeting ends
    this.conversationReferences.set(meeting?.id, TurnContext.getConversationReference(context.activity));

    // Create record in Cosmos DB
    const record = await MeetingRepository.create(
      {
        title: meeting?.subject ?? 'Teams Meeting',
        type: 'team',
        startTime: new Date().toISOString(),
        organizer: {
          id: context.activity.from?.id ?? 'unknown',
          displayName: context.activity.from?.name ?? 'Unknown',
          email: 'unknown@example.com',
          role: 'organizer'
        }
      },
      tenantId
    );

    // Begin transcript polling
    TranscriptPipeline.startTranscriptCapture(record.id, tenantId, meeting?.id ?? record.id);

    await context.sendActivity(`✅ MeetMind is active. I'll track decisions and action items in real time.`);
  }

  protected async handleTeamsMeetingEndEvent(
    context: TurnContext,
    meeting: any
  ): Promise<void> {
    const tenantId = context.activity.conversation.tenantId ?? 'unknown-tenant';
    logger.info(`[MeetMindBot] Meeting ended — Teams ID: ${meeting?.id}`);

    // Look up our internal meeting ID by teamsCallId convention
    const meetings = await MeetingRepository.list(tenantId);
    const matched = meetings.find(m => m.metadata?.onlineMeetingId === meeting?.id || m.status === 'in_progress');
    const meetingId = matched?.id;

    if (!meetingId) {
      await context.sendActivity(`Meeting ended. (Could not locate meeting record to process.)`);
      return;
    }

    // Stop transcript polling
    TranscriptPipeline.stopTranscriptCapture(meetingId);

    await context.sendActivity(`⏳ Meeting ended. Generating summary and syncing action items...`);

    try {
      await AgentService.runPostMeetingPipeline(meetingId, tenantId);

      const finalMeeting = await MeetingRepository.getById(meetingId, tenantId);
      const summary = finalMeeting?.summary?.headline ?? 'Summary generated.';

      const card = createMeetingSummaryCard(
        finalMeeting?.title ?? 'Meeting',
        summary,
        meetingId
      );
      await context.sendActivity(MessageFactory.attachment(card));
    } catch (err: any) {
      logger.error(`[MeetMindBot] Post-meeting pipeline error: ${err.message}`);
      await context.sendActivity(`⚠️ Processing encountered an issue. The summary may be incomplete.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handlers
  // ---------------------------------------------------------------------------

  private async handleSearchCommand(context: TurnContext, query: string): Promise<void> {
    if (!query) {
      await context.sendActivity('Please provide a search query. Example: `@MeetMind search Q3 pricing`');
      return;
    }

    const tenantId = context.activity.conversation.tenantId ?? 'unknown-tenant';
    await context.sendActivity(`🔍 Searching for: *${query}*...`);

    try {
      const results = await CognitiveSearchService.semanticSearch(query, tenantId, 3);
      const card = createSearchResultCard(query, results);
      await context.sendActivity(MessageFactory.attachment(card));
    } catch (err: any) {
      logger.error(`[MeetMindBot] Search error: ${err.message}`);
      await context.sendActivity(`Search failed. Please try again.`);
    }
  }

  private async handleStatusCommand(context: TurnContext): Promise<void> {
    const tenantId = context.activity.conversation.tenantId ?? 'unknown-tenant';

    const meetings = await MeetingRepository.list(tenantId, 'in_progress');
    if (meetings.length === 0) {
      await context.sendActivity(`No active meeting found in this channel.`);
      return;
    }

    const current = meetings[0]!;
    const openActions = (current.actionItems ?? []).filter(a => a.status !== 'completed');

    if (openActions.length === 0) {
      await context.sendActivity(`📋 **${current.title}**: No action items captured yet.`);
    } else {
      const list = openActions.map((a, i) => `${i + 1}. ${a.title} → *${a.assigneeName ?? 'Unassigned'}*`).join('\n');
      await context.sendActivity(`📋 **${current.title}** — ${openActions.length} action item(s):\n${list}`);
    }
  }
}
