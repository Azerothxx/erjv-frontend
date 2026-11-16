import { formatLastEditedAt, type LastEditedAttribution } from '@/lib/last-edited'

/** Value for a "Last edited" detail field. Display name is resolved by the backend. */
export function LastEditedBy({ record }: { record: Partial<LastEditedAttribution> }) {
  const name = record.lastEditedByDisplayName?.trim() || null
  const at = record.lastEditedAt ?? null
  const formatted = formatLastEditedAt(at)

  if (!name && !formatted)
    return <span className="font-normal text-muted-foreground">Not edited yet</span>

  return (
    <>
      <span>{name ?? 'Unknown user'}</span>
      {formatted && at && (
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          <time dateTime={at}>{formatted}</time>
        </span>
      )}
    </>
  )
}
