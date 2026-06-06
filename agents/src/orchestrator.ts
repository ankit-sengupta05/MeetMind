// =============================================================================
// agents/src/orchestrator.ts
// Agent Orchestrator — routes events to the appropriate agent.
// Self-contained: no server/ imports.
// =============================================================================

import { PreMeetingAgent, UpcomingMeeting } from './preMeetingAgent.js';
import { PostMeetingAgent } from './postMeetingAgent.js';

const preMeetingAgent = new PreMeetingAgent();
const postMeetingAgent = new PostMeetingAgent();

function logError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[Orchestrator] ${context} failed: ${message}`);
}

export const AgentOrchestrator = {
  /**
   * Called by the preMeetingTimer Azure Function.
   * Generates and dispatches personalized briefings to attendees.
   */
  async schedulePreMeetingAgent(meeting: UpcomingMeeting): Promise<void> {
    console.log(`[Orchestrator] Triggering Pre-Meeting Agent for "${meeting.title}"`);
    try {
      await preMeetingAgent.executePlan(meeting);
    } catch (err) {
      logError(`Pre-Meeting Agent [${meeting.id}]`, err);
      // Intentionally not re-throwing — one failing briefing shouldn't block others
    }
  },

  /**
   * Called by the postMeetingHook Azure Function (or server route).
   * Analyzes transcript, syncs tasks, emails summary, indexes meeting.
   */
  async triggerPostMeetingAgent(
    meetingId: string,
    tenantId: string,
    planId: string
  ): Promise<void> {
    console.log(`[Orchestrator] Triggering Post-Meeting Agent for meeting ${meetingId}`);
    try {
      await postMeetingAgent.executePlan(meetingId, tenantId, planId);
    } catch (err) {
      logError(`Post-Meeting Agent [${meetingId}]`, err);
      // Logged to Application Insights in production via the logger transport
    }
  },
};
