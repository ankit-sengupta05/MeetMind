// =============================================================================
// agents/src/postMeetingAgent.ts
// Post-Meeting Dispatcher Agent — fully self-contained (no server/ imports)
// =============================================================================

import { AzureOpenAI } from 'openai';
import { CosmosClient } from '@azure/cosmos';
import { PlannerPlugin } from './plugins/PlannerPlugin.js';
import { EmailPlugin } from './plugins/EmailPlugin.js';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { agentConfig } from './config.js';

export class PostMeetingAgent {
  private plannerPlugin = new PlannerPlugin();
  private emailPlugin = new EmailPlugin();
  private cosmos = new CosmosClient({
    endpoint: agentConfig.cosmos.endpoint,
    key: agentConfig.cosmos.key,
  });
  private openai = new AzureOpenAI({
    endpoint: agentConfig.openai.endpoint,
    apiKey: agentConfig.openai.apiKey,
    apiVersion: agentConfig.openai.apiVersion,
  });
  private searchClient = new SearchClient<any>(
    agentConfig.search.endpoint,
    agentConfig.search.indexName,
    new AzureKeyCredential(agentConfig.search.adminKey)
  );

  private async analyzeMeeting(transcriptText: string): Promise<{
    summary: string;
    actionItems: { title: string; assigneeName?: string; dueDate?: string }[];
    decisions: { title: string; description: string }[];
    keyTopics: string[];
  }> {
    const prompt = `Analyze this meeting transcript and return JSON:
{
  "summary": "one paragraph summary",
  "actionItems": [{ "title": "...", "assigneeName": "...", "dueDate": "YYYY-MM-DD or null" }],
  "decisions": [{ "title": "...", "description": "..." }],
  "keyTopics": ["topic1", "topic2"]
}

Transcript:
${transcriptText.slice(0, 6000)}`;

    const res = await this.openai.chat.completions.create({
      model: agentConfig.openai.chatDeployment,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    return JSON.parse((res.choices[0]?.message?.content as string) ?? '{}');
  }

  private async draftFollowUpEmail(
    meetingTitle: string,
    analysis: Awaited<ReturnType<PostMeetingAgent['analyzeMeeting']>>
  ): Promise<string> {
    const prompt = `Draft a follow-up email in HTML for the meeting "${meetingTitle}".
Summary: ${analysis.summary}
Decisions: ${JSON.stringify(analysis.decisions)}
Action Items: ${JSON.stringify(analysis.actionItems)}
Keep it professional and concise. Include an action items table with owner and due date.`;

    const res = await this.openai.chat.completions.create({
      model: agentConfig.openai.chatDeployment,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return (res.choices[0]?.message?.content as string) ?? '<p>Summary unavailable.</p>';
  }

  async executePlan(meetingId: string, tenantId: string, planId: string): Promise<void> {
    console.log(`\n[PostMeetingAgent] ===== Meeting: ${meetingId} =====`);

    const container = this.cosmos.database(agentConfig.cosmos.databaseName).container('meetings');
    const { resource: meeting } = await container.item(meetingId, tenantId).read();

    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);
    if (!meeting.transcript?.length) throw new Error('No transcript to process');

    const fullText = (meeting.transcript as any[])
      .map((s: any) => `${s.speakerName}: ${s.text}`)
      .join('\n');

    // Step 1: Analyze transcript
    console.log(`[PostMeetingAgent] Step 1: Analyzing transcript...`);
    const analysis = await this.analyzeMeeting(fullText);
    console.log(`[PostMeetingAgent] Extracted ${analysis.actionItems.length} action items, ${analysis.decisions.length} decisions.`);

    // Step 2: Persist to Cosmos
    const now = new Date().toISOString();
    const updatedMeeting = {
      ...meeting,
      status: 'completed',
      tags: analysis.keyTopics,
      summary: { headline: analysis.summary, generatedAt: now },
      actionItems: analysis.actionItems.map((ai, idx) => ({
        id: `ai-${idx}-${Date.now()}`,
        meetingId,
        title: ai.title,
        assigneeName: ai.assigneeName,
        dueDate: ai.dueDate,
        status: 'pending',
        priority: 'medium',
        createdAt: now,
        updatedAt: now,
      })),
      decisions: analysis.decisions.map((d, idx) => ({
        id: `dec-${idx}-${Date.now()}`,
        meetingId,
        ...d,
        createdAt: now,
      })),
    };
    await container.item(meetingId, tenantId).replace(updatedMeeting);
    console.log(`[PostMeetingAgent] Step 2: Persisted analysis to Cosmos.`);

    // Step 3: Sync tasks to Planner (fail-soft)
    console.log(`[PostMeetingAgent] Step 3: Syncing ${updatedMeeting.actionItems.length} tasks to Planner...`);
    for (const ai of updatedMeeting.actionItems) {
      try {
        await this.plannerPlugin.syncTask(ai, planId);
      } catch (err: any) {
        console.warn(`[PostMeetingAgent] Planner sync failed for "${ai.title}": ${err.message}`);
      }
    }

    // Step 4: Index into Cognitive Search
    console.log(`[PostMeetingAgent] Step 4: Indexing meeting into Azure Cognitive Search...`);
    try {
      await this.searchClient.uploadDocuments([{
        id: meetingId,
        meetingId,
        title: meeting.title,
        summaryText: analysis.summary,
        tenantId,
        keyTopics: analysis.keyTopics,
        startTime: meeting.startTime,
      }]);
    } catch (err: any) {
      console.warn(`[PostMeetingAgent] Search index failed: ${err.message}`);
    }

    // Step 5: Draft & send email
    console.log(`[PostMeetingAgent] Step 5: Sending follow-up email...`);
    const emailHtml = await this.draftFollowUpEmail(meeting.title, analysis);
    const recipients: string[] = (meeting.participants ?? [])
      .map((p: any) => p.email as string)
      .filter(Boolean);
    await this.emailPlugin.sendSummary(meeting.title, emailHtml, recipients);

    // Step 6: Teams channel card (logged for now; bot handles real dispatch)
    console.log(`[PostMeetingAgent] Step 6: Summary card would post to Teams channel via Bot.`);

    console.log(`[PostMeetingAgent] Pipeline complete.\n`);
  }
}
