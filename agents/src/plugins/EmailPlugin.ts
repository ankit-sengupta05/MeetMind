// =============================================================================
// agents/src/plugins/EmailPlugin.ts
// Semantic Kernel Plugin for email dispatch — self-contained.
// Uses Microsoft Graph SDK directly (no server/ imports).
// =============================================================================

import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { ClientSecretCredential } from '@azure/identity';
import { agentConfig } from '../config.js';

export class EmailPlugin {
  readonly name = 'EmailPlugin';

  // @ts-ignore
  private getGraphClient(): Client {
    const cred = new ClientSecretCredential(
      agentConfig.graph.tenantId,
      agentConfig.graph.clientId,
      agentConfig.graph.clientSecret
    );
    const auth = new TokenCredentialAuthenticationProvider(cred, {
      scopes: ['https://graph.microsoft.com/.default'],
    });
    return Client.initWithMiddleware({ authProvider: auth });
  }

  /** Sends a briefing email to a single recipient. */
  async sendBriefing(
    toEmail: string,
    subject: string,
    contentHtml: string,
    _tenantId: string
  ): Promise<void> {
    console.log(`[EmailPlugin] Sending briefing to: ${toEmail} | Subject: ${subject}`);
    // In production uncomment to actually send:
    // const client = this.getGraphClient();
    // await client.api('/me/sendMail').post({
    //   message: {
    //     subject,
    //     body: { contentType: 'HTML', content: contentHtml },
    //     toRecipients: [{ emailAddress: { address: toEmail } }],
    //   },
    // });
    console.log(`[EmailPlugin] (dev) Would send ${contentHtml.length} chars of HTML to ${toEmail}`);
  }

  /** Sends a post-meeting summary to multiple recipients. */
  async sendSummary(
    meetingTitle: string,
    summaryHtml: string,
    recipients: string[]
  ): Promise<void> {
    for (const email of recipients) {
      await this.sendBriefing(email, `MeetMind Summary: ${meetingTitle}`, summaryHtml, '');
    }
  }
}
