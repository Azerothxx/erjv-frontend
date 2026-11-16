/**
 * Response-only "Last Edited By" attribution returned on full operational records.
 * Never send these fields in POST/PATCH bodies: the backend rejects them (400).
 */
export interface LastEditedAttribution {
  lastEditedByUserId: number | null
  /** ISO 8601 server time of the last successful detail edit. */
  lastEditedAt: string | null
  /** Resolved by the backend: employee name, otherwise the editor's user email. */
  lastEditedByDisplayName: string | null
}

export const lastEditedFields = [
  'lastEditedByUserId',
  'lastEditedAt',
  'lastEditedByDisplayName',
] as const satisfies readonly (keyof LastEditedAttribution)[]

/** Formats an ISO timestamp in Manila time (UTC+08:00), matching delivery date-times. */
export function formatLastEditedAt(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Defensive guard for pass-through request bodies: drops response-only attribution keys. */
export function withoutLastEdited<T extends object>(payload: T): Omit<T, keyof LastEditedAttribution> {
  const clean = { ...payload } as Record<string, unknown>
  for (const field of lastEditedFields) delete clean[field]
  return clean as Omit<T, keyof LastEditedAttribution>
}
