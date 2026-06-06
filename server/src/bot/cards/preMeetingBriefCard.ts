// =============================================================================
// server/src/bot/cards/preMeetingBriefCard.ts
// Adaptive Card for Pre-Meeting context
// =============================================================================

import { CardFactory } from 'botbuilder';

export function createPreMeetingBriefCard(meetingTitle: string, briefingText: string) {
  const card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: `Your Briefing: ${meetingTitle}`,
        weight: "Bolder",
        size: "Large",
        color: "Accent"
      },
      {
        type: "TextBlock",
        text: briefingText,
        wrap: true
      }
    ]
  };
  
  return CardFactory.adaptiveCard(card);
}
