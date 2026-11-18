import { apiClient } from '@/lib/api-client'
import type { CursorPage } from '@/lib/cursor-pagination'
import type { AuditEvent, AuditEventFilter } from './audit-events.types'

/** One page of GET /audit-events (SUPERADMIN only). */
export async function fetchAuditEventsPageApi(
  filter: AuditEventFilter = {},
  signal?: AbortSignal,
): Promise<CursorPage<AuditEvent>> {
  const { limit = 50, cursor, action, from, to } = filter
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw Error('Page size must be between 1 and 100.')
  const { data } = await apiClient.get<CursorPage<AuditEvent>>('/audit-events', {
    params: { limit, cursor, action, from, to },
    signal,
  })
  if (
    !Array.isArray(data?.items) ||
    !(
      data.nextCursor === null ||
      (typeof data.nextCursor === 'string' && data.nextCursor.length > 0 && data.nextCursor !== cursor)
    ) ||
    data.items.some((item) => typeof item?.id !== 'string' || !item.id)
  )
    throw Error('The server returned an invalid audit page. Reload results before continuing.')
  return data
}
