// =============================================================================
// server/src/bot/cards/actionItemCard.ts
// Adaptive Card for a single Action Item
// =============================================================================

import { CardFactory } from 'botbuilder';

export function createActionItemCard(title: string, assignee: string, dueDate: string | null) {
  const card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: "New Action Item Assigned",
        weight: "Bolder",
        size: "Medium"
      },
      {
        type: "FactSet",
        facts: [
          { title: "Task:", value: title },
          { title: "Assignee:", value: assignee },
          { title: "Due Date:", value: dueDate || "None" }
        ]
      }
    ]
  };
  
  return CardFactory.adaptiveCard(card);
}
