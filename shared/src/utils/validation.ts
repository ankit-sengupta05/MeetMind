// =============================================================================
// shared/src/utils/validation.ts
// Input validation helpers used across client & server
// =============================================================================

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidIso8601(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && value.includes('T');
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function assertDefined<T>(value: T | undefined | null, fieldName: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Required field '${fieldName}' is missing or null`);
  }
  return value;
}
