// =============================================================================
// agents/src/preMeetingAgent.ts
// Pre-Meeting Briefer Agent — fully self-contained (no server/ imports)
// =============================================================================

import { AzureOpenAI } from 'openai';
import { SearchPlugin } from './plugins/SearchPlugin.js';
import { EmailPlugin } from './plugins/EmailPlugin.js';
import { agentConfig } from './config.js';

export interface UpcomingMeeting {
  id: string;
  title: string;
  startTime: string;
  attendees: { name: string; email: string }[];
  tenantId: string;
}

export class PreMeetingAgent {
  private searchPlugin = new SearchPlugin();
  private emailPlugin = new EmailPlugin();
  private openai = new AzureOpenAI({
    endpoint: agentConfig.openai.endpoint,
    apiKey: agentConfig.openai.apiKey,
    apiVersion: agentConfig.openai.apiVersion,
  });

  private async generateBriefingContent(
    meeting: UpcomingMeeting,
    attendee: { name: string; email: string },
    pastMeetingsContext: string,
    openActionItemsContext: string
  ): Promise<string> {
    const prompt = `You are the MeetMind AI Copilot. Write a personalized pre-meeting briefing for ${attendee.name} regarding "${meeting.title}" at ${meeting.startTime}.

Past meeting context:
${pastMeetingsContext || 'None found.'}

Open action items for ${attendee.name}:
${openActionItemsContext || 'None.'}

Output clean HTML (150 words max). Include:
1. What was decided last time on this topic
2. Their open action items
3. Suggested agenda items`;

    const response = await this.openai.chat.completions.create({
      model: agentConfig.openai.chatDeployment,
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.4,
    });

    return (response.choices[0]?.message?.content as string) ?? '<p>Briefing unavailable.</p>';
  }

  async executePlan(meeting: UpcomingMeeting): Promise<void> {
    console.log(`\n[PreMeetingAgent] ===== "${meeting.title}" =====`);
    console.log(`[PreMeetingAgent] Generating briefings for ${meeting.attendees.length} attendees.`);

    const searchQuery = `${meeting.title} ${meeting.attendees.map(a => a.name).join(' ')}`;
    const pastMeetings = await this.searchPlugin.searchPastMeetings(searchQuery, meeting.tenantId);
    const pastContext = pastMeetings.map(m => `- ${m.title}: ${m.summaryText}`).join('\n');
    console.log(`[PreMeetingAgent] Step 1: Found ${pastMeetings.length} related past meetings.`);

    for (const attendee of meeting.attendees) {
      console.log(`[PreMeetingAgent] Processing: ${attendee.name} (${attendee.email})`);

      const openItems = await this.searchPlugin.getOpenActionItems(attendee.email, meeting.tenantId);
      const openItemsContext = openItems
        .map(i => `- [${i.meetingTitle}] ${i.title} (Due: ${i.dueDate ?? 'None'})`)
        .join('\n');
      console.log(`[PreMeetingAgent] Step 2: ${openItems.length} open action item(s).`);

      const briefingHtml = await this.generateBriefingContent(
        meeting, attendee, pastContext, openItemsContext
      );
      console.log(`[PreMeetingAgent] Step 3: Briefing generated (${briefingHtml.length} chars).`);

      await this.emailPlugin.sendBriefing(
        attendee.email,
        `MeetMind Briefing: ${meeting.title}`,
        briefingHtml,
        meeting.tenantId
      );
      console.log(`[PreMeetingAgent] Step 4: Briefing dispatched to ${attendee.email}.`);
    }

    console.log(`[PreMeetingAgent] Plan complete.\n`);
  }
}
