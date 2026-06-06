// =============================================================================
// server/src/bot/cards/meetingSummaryCard.ts
// Adaptive Card for Meeting Summary
// =============================================================================

import { CardFactory } from 'botbuilder';

export function createMeetingSummaryCard(title: string, summary: string, meetingId: string) {
  const card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: `MeetMind Summary: ${title}`,
        weight: "Bolder",
        size: "Large"
      },
      {
        type: "TextBlock",
        text: summary,
        wrap: true
      }
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "View Full Summary",
        url: `https://mymeetmindapp.com/meetings/${meetingId}` // Replace with actual tab deep link
      }
    ]
  };
  
  return CardFactory.adaptiveCard(card);
}
