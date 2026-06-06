// =============================================================================
// server/src/routes/bot.ts
// Bot Framework webhook endpoint – receives Teams activity events
// =============================================================================

import { Router } from 'express';
import {
  BotFrameworkAdapter,
  type TurnContext,
  ActivityTypes,
} from 'botbuilder';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const botRouter = Router();

const adapter = new BotFrameworkAdapter({
  appId: config.bot.appId,
  appPassword: config.bot.appPassword,
});

adapter.onTurnError = async (context: TurnContext, error: Error) => {
  logger.error('Bot turn error', { error: error.message, stack: error.stack });
  await context.sendActivity('Sorry, something went wrong. Please try again.');
};

async function handleTurn(context: TurnContext): Promise<void> {
  if (context.activity.type === ActivityTypes.Message) {
    const text = context.activity.text?.trim() ?? '';
    logger.info('Bot message received', { text, from: context.activity.from?.name });

    if (text.toLowerCase().startsWith('summary')) {
      await context.sendActivity(
        'I am processing your request for a meeting summary. Please wait...'
      );
      // TODO: dispatch to agent pipeline
    } else if (text.toLowerCase().startsWith('search')) {
      const query = text.slice(7).trim();
      await context.sendActivity(`Searching for: "${query}". Results coming shortly...`);
      // TODO: call search service and return adaptive card
    } else {
      await context.sendActivity(
        `👋 Hi! I'm **MeetMind**. Commands:\n` +
        `• **summary** – Get summary of the latest meeting\n` +
        `• **search <query>** – Search across all meeting knowledge\n` +
        `• **tasks** – View pending action items`
      );
    }
  } else if (context.activity.type === ActivityTypes.ConversationUpdate) {
    logger.info('Bot conversation update', { action: context.activity.action });
  }
}

// POST /api/v1/bot/messages – Teams Bot Framework webhook
botRouter.post('/messages', (req, res) => {
  adapter.processActivity(req, res, handleTurn);
});
