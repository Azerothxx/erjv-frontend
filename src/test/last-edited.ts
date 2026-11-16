import type { LastEditedAttribution } from '@/lib/last-edited'

/** Backend shape for a full record that has never had a detail edit. */
export const noLastEditor: LastEditedAttribution = {
  lastEditedByUserId: null,
  lastEditedAt: null,
  lastEditedByDisplayName: null,
}
