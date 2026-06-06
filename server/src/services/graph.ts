// =============================================================================
// server/src/services/graph.ts
// Microsoft Graph API Service
// =============================================================================

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { config } from '../config/env.js';
import { ActionItem, Meeting } from '@meetmind/shared';
import { MeetingRepository } from '../db/repositories.js';

const credential = new ClientSecretCredential(
  config.graph.tenantId,
  config.graph.clientId,
  config.graph.clientSecret
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});

const graphClient = Client.initWithMiddleware({
  authProvider,
});

export class GraphService {
  /**
   * Creates a Microsoft Planner task from an Action Item.
   * @param actionItem The action item details
   * @param planId The target Planner plan ID
   * @param bucketId Optional bucket within the plan
   * @returns The created task ID
   */
  static async createPlannerTask(actionItem: ActionItem, planId: string, bucketId?: string): Promise<string> {
    const taskData: any = {
      planId,
      title: actionItem.title,
    };

    if (bucketId) {
      taskData.bucketId = bucketId;
    }

    if (actionItem.dueDate) {
      taskData.dueDateTime = actionItem.dueDate;
    }

    if (actionItem.assigneeEmail) {
      // Resolve user ID by email first
      try {
        const user = await graphClient.api(`/users/${actionItem.assigneeEmail}`).get();
        if (user && user.id) {
          taskData.assignments = {
            [user.id]: {
              '@odata.type': '#microsoft.graph.plannerAssignment',
              orderHint: ' !'
            }
          };
        }
      } catch (err) {
        // Ignore user resolution failure, task will just be unassigned
      }
    }

    const createdTask = await graphClient.api('/planner/tasks').post(taskData);

    // If description exists, add it to task details
    if (actionItem.description && createdTask.id) {
      const details = await graphClient.api(`/planner/tasks/${createdTask.id}/details`).get();
      const etag = details['@odata.etag'];
      
      await graphClient.api(`/planner/tasks/${createdTask.id}/details`)
        .header('If-Match', etag)
        .patch({
          description: actionItem.description
        });
    }

    return createdTask.id;
  }

  /**
   * Fetches the user's upcoming meetings from their calendar.
   * @param userPrincipalName The user's email/UPN
   * @param daysAhead Number of days to look ahead
   */
  static async getUserCalendar(userPrincipalName: string, daysAhead: number = 7): Promise<any[]> {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const response = await graphClient
      .api(`/users/${userPrincipalName}/calendarView`)
      .query({
        startDateTime: startIso,
        endDateTime: endIso,
        $select: 'subject,start,end,attendees,isOnlineMeeting,onlineMeeting',
        $orderby: 'start/dateTime',
        $top: 50
      })
      .get();

    return response.value ?? [];
  }

  /**
   * Sends a summary email for a meeting via Outlook.
   * @param meetingId The meeting ID
   * @param tenantId The tenant partition key
   * @param recipients Array of email addresses
   */
  static async sendEmailSummary(meetingId: string, tenantId: string, recipients: string[]): Promise<void> {
    const meeting = await MeetingRepository.getById(meetingId, tenantId);
    if (!meeting || !meeting.summary) {
      throw new Error(`Meeting ${meetingId} not found or has no summary`);
    }

    const toRecipients = recipients.map(email => ({
      emailAddress: { address: email }
    }));

    const htmlContent = `
      <h2>MeetMind Summary: ${meeting.title}</h2>
      <p><strong>Headline:</strong> ${meeting.summary.headline}</p>
      <h3>Overview</h3>
      <p>${meeting.summary.overview}</p>
      <h3>Key Points</h3>
      <ul>
        ${meeting.summary.keyPoints.map(kp => `<li>${kp}</li>`).join('')}
      </ul>
      <h3>Action Items</h3>
      <ul>
        ${(meeting.actionItems ?? []).map(ai => `<li><strong>${ai.title}</strong> - ${ai.assigneeName ?? 'Unassigned'} (Due: ${ai.dueDate ?? 'None'})</li>`).join('')}
      </ul>
      <h3>Decisions</h3>
      <ul>
        ${(meeting.decisions ?? []).map(d => `<li><strong>${d.title}</strong>: ${d.description}</li>`).join('')}
      </ul>
    `;

    const message = {
      subject: `Meeting Summary: ${meeting.title}`,
      body: {
        contentType: 'HTML',
        content: htmlContent
      },
      toRecipients
    };

    // Note: This requires the app to have Mail.Send permissions or act on behalf of a specific user.
    // Assuming sending from a shared or service mailbox for this example.
    const senderUpn = config.graph.tenantId === 'test' ? 'test@test.com' : 'meetmind-bot@yourdomain.com';

    await graphClient.api(`/users/${senderUpn}/sendMail`).post({
      message,
      saveToSentItems: false
    });
  }
}
