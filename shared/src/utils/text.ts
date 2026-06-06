// =============================================================================
// shared/src/utils/text.ts
// Text/string helpers used across client & server
// =============================================================================

/** Truncate text to maxLength, appending ellipsis if trimmed */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/** Chunk large text into segments of approximately maxTokens tokens
 *  Uses a rough 4 chars/token heuristic (good enough for OpenAI chunking)
 */
export function chunkText(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxChars));
    start += maxChars;
  }
  return chunks;
}

/** Slugify a string for use as an ID or URL segment */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Convert camelCase to Title Case (for display labels) */
export function camelToTitle(camel: string): string {
  return camel.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}
