// =============================================================================
// server/src/services/webhooks.ts
// Microsoft Graph Webhook Registration & Validation
// =============================================================================

import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { ClientSecretCredential } from '@azure/identity';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class WebhookService {
  private static getGraphClient() {
    const credential = new ClientSecretCredential(
      config.azureAd.tenantId,
      config.azureAd.clientId,
      config.azureAd.clientSecret
    );
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });
    return Client.initWithMiddleware({ authProvider });
  }

  /**
   * Registers a Graph change notification subscription for callRecords
   * This allows us to get pinged when a Teams meeting ends.
   */
  static async registerMeetingWebhooks() {
    try {
      const client = this.getGraphClient();
      const notificationUrl = `${config.bot.appEndpoint}/api/webhooks/graph`;

      // Expiration time (Max 1 hour for callRecords, requires renewal logic)
      const expirationDateTime = new Date();
      expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 55);

      const subscription = {
        changeType: 'created',
        notificationUrl: notificationUrl,
        resource: '/communications/callRecords',
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: config.bot.appId // Used to validate notifications
      };

      const res = await client.api('/subscriptions').post(subscription);
      logger.info(`Successfully registered webhook subscription: ${res.id}`);
      
      // Setup interval to renew subscription
      setInterval(() => this.renewSubscription(res.id), 50 * 60 * 1000); // 50 mins
      
    } catch (err: any) {
      logger.error('Failed to register webhook', err);
    }
  }

  /**
   * Renews an existing subscription
   */
  private static async renewSubscription(subscriptionId: string) {
    try {
      const client = this.getGraphClient();
      const expirationDateTime = new Date();
      expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 55);

      await client.api(`/subscriptions/${subscriptionId}`).patch({
        expirationDateTime: expirationDateTime.toISOString()
      });
      logger.info(`Renewed subscription ${subscriptionId}`);
    } catch (err: any) {
      logger.error(`Failed to renew subscription ${subscriptionId}`, err);
    }
  }
}
