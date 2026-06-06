// =============================================================================
// server/src/bot/botConfig.ts
// Bot Framework Adapter Setup
// =============================================================================

import { CloudAdapter, ConfigurationServiceClientCredentialFactory, ConfigurationBotFrameworkAuthentication } from 'botbuilder';
import { MeetMindBot } from './meetMindBot.js';
import { config } from '../config/env.js';

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: config.bot.appId,
  MicrosoftAppPassword: config.bot.appPassword,
  MicrosoftAppType: 'MultiTenant',
  MicrosoftAppTenantId: config.azureAd.tenantId,
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  credentialsFactory
);

// Create adapter
export const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors
adapter.onTurnError = async (context, error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  await context.sendTraceActivity(
    'OnTurnError Trace',
    `${error}`,
    'https://www.botframework.com/schemas/error',
    'TurnError'
  );
  await context.sendActivity('The bot encountered an error or bug.');
};

// Create the bot instance
export const bot = new MeetMindBot();
