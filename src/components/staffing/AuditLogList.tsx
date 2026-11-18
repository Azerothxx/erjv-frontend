import { useState } from 'react'
import { AlertCircle, RotateCcw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { DataTableFooter, DataTableFrame } from '@/components/ui/DataTableFooter'
import {
  DataTableFilterChips,
  DataTableFilters,
  type DataTableFilter,
} from '@/components/ui/data-table-filters'
import { OverflowValue } from '@/components/ui/OverflowValue'
import { PageHeader, PageToolbar } from '@/components/ui/ManagementPage'
import { fetchAuditEventsPageApi } from '@/features/audit/audit-events.api'
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditEvent,
  type AuditEventFilter,
} from '@/features/audit/audit-events.types'
import { useCursorPage } from '@/lib/use-cursor-page'
import { getErrorMessage } from '@/lib/api-client'

const SENSITIVE_FIELD = /password|hash|token|secret/i

function formatValue(field: string, value: unknown) {
  if (SENSITIVE_FIELD.test(field)) return 'hidden'
  if (value === null || value === undefined || value === '') return 'none'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function formatChanges(changes: AuditEvent['changes']) {
  if (!changes) return ''
  return Object.entries(changes)
    .map(([field, { from, to }]) => `${field}: ${formatValue(field, from)} → ${formatValue(field, to)}`)
    .join('; ')
}

const columns: ColumnDef<AuditEvent>[] = [
  {
    id: 'occurredAt',
    header: 'When',
    width: '18%',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">
        {new Date(row.occurredAt).toLocaleString()}
      </span>
    ),
  },
  {
    id: 'actor',
    header: 'Done by',
    width: '22%',
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <OverflowValue value={row.actorEmail ?? 'System'} className="text-sm font-medium" />
        {row.actorRole && <span className="text-xs text-muted-foreground">{row.actorRole}</span>}
      </div>
    ),
  },
  {
    id: 'target',
    header: 'Account',
    width: '12%',
    cell: ({ row }) => <span className="text-sm tabular-nums">User #{row.targetUserId}</span>,
  },
  {
    id: 'action',
    header: 'Action',
    width: '16%',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {AUDIT_ACTION_LABELS[row.action] ?? row.action}
      </span>
    ),
  },
  {
    id: 'changes',
    header: 'Changes',
    width: '32%',
    cell: ({ row }) => {
      const text = formatChanges(row.changes)
      return text ? (
        <OverflowValue value={text} className="text-sm text-muted-foreground" />
      ) : (
        <span className="text-sm text-muted-foreground">No field changes recorded</span>
      )
    },
  },
]

/** Read-only account audit trail. SUPERADMIN only: the route guard and backend both enforce it. */
export function AuditLogList() {
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL')
  const query = useCursorPage<AuditEvent, AuditEventFilter>(
    ['audit-events'],
    action === 'ALL' ? {} : { action },
    (filter, signal) => fetchAuditEventsPageApi(filter, signal),
  )
  const filters: DataTableFilter[] = [
    {
      kind: 'select',
      id: 'audit-action',
      label: 'Action',
      value: action,
      onChange: (value) => setAction(value as AuditAction | 'ALL'),
      options: [
        { value: 'ALL', label: 'All actions' },
        ...AUDIT_ACTIONS.map((value) => ({ value, label: AUDIT_ACTION_LABELS[value] })),
      ],
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="A read-only record of account creation, role, email, password, and status changes.">
        Audit Log
      </PageHeader>
      <PageToolbar>
        <DataTableFilters
          filters={filters}
          description="Filter the account activity shown below."
        />
        <DataTableFilterChips filters={filters} />
      </PageToolbar>
      <DataTableFrame>
        {query.isError && query.items.length === 0 ? (
          <div role="alert" className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <AlertCircle className="mb-3 size-6 text-destructive" />
            <h3 className="text-sm font-semibold">Unable to load the audit log</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {getErrorMessage(query.error)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RotateCcw className="size-3.5" />
              {query.isFetching ? 'Retrying...' : 'Try Again'}
            </Button>
          </div>
        ) : (
          <DataTable
            pagination={false}
            appearance="management"
            data={query.items}
            columns={columns}
            getRowKey={(event) => event.id}
            isLoading={query.isLoading}
            loadingMessage="Loading audit events..."
            emptyContent={
              <div className="flex min-h-48 flex-col items-center justify-center px-4 py-12 text-center">
                <ScrollText aria-hidden="true" className="mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No audit events found</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {action === 'ALL'
                    ? 'Account changes will appear here as they happen.'
                    : 'No events match this action. Choose All actions to see everything.'}
                </p>
              </div>
            }
            tableClassName="min-w-[760px]"
          />
        )}
        <DataTableFooter {...query} rowCount={query.items.length} label="Audit event" />
      </DataTableFrame>
    </div>
  )
}
