// =============================================================================
// server/src/bot/cards/searchResultCard.ts
// Adaptive Card showing search results
// =============================================================================

import { CardFactory } from 'botbuilder';
import { SearchResultItem } from '../../services/search.js';

export function createSearchResultCard(query: string, results: SearchResultItem[]) {
  const bodyItems: any[] = [
    {
      type: "TextBlock",
      text: `Search Results for: "${query}"`,
      weight: "Bolder",
      size: "Medium"
    }
  ];

  if (results.length === 0) {
    bodyItems.push({
      type: "TextBlock",
      text: "No results found in past meetings."
    });
  } else {
    results.forEach((result, i) => {
      bodyItems.push({
        type: "Container",
        style: "emphasis",
        items: [
          {
            type: "TextBlock",
            text: `${i + 1}. ${result.title}`,
            weight: "Bolder"
          },
          {
            type: "TextBlock",
            text: `"${result.summaryText}..."`,
            wrap: true,
            isSubtle: true,
            fontType: "Monospace"
          }
        ],
        spacing: "Medium"
      });
    });
  }

  const card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: bodyItems
  };
  
  return CardFactory.adaptiveCard(card);
}
