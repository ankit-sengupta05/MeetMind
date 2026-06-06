// =============================================================================
// shared/src/utils/date.ts
// Date/time helpers – no external deps, pure functions
// =============================================================================

/** Returns current UTC timestamp as ISO 8601 string */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Converts seconds-from-start into a human-readable "mm:ss" label */
export function formatMeetingTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Returns duration string e.g. "1h 23m" from total seconds */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Checks if a date string is within the last N days */
export function isWithinDays(isoDate: string, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(isoDate) >= cutoff;
}
