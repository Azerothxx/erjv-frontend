import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LastEditedBy } from './LastEditedBy'
import { apiClient } from '@/lib/api-client'
import { formatLastEditedAt, lastEditedFields } from '@/lib/last-edited'
import { noLastEditor } from '@/test/last-edited'
import { updateSalesOrderDraftApi } from '@/features/crm/sales-orders.api'
import { updatePurchaseOrderDraftApi } from '@/features/logistics/purchase-orders.api'
import { updateIncomingDraftApi } from '@/features/logistics/incoming-deliveries.api'
import { updateOutgoingDeliveryDraftApi } from '@/features/logistics/outgoing-deliveries.api'
import { updateDeliveryRunDraftApi } from '@/features/logistics/delivery-runs.api'
import { writeTransfer } from '@/features/warehouse-transfers/warehouse-transfers.api'
import { transferFixture } from '@/features/warehouse-transfers/warehouse-transfers.fixtures'

const edited = {
  lastEditedByUserId: 5,
  lastEditedAt: '2026-11-15T16:30:00Z',
  lastEditedByDisplayName: 'Ana Cruz',
}

describe('LastEditedBy', () => {
  it('shows the backend display name and Manila-formatted edit time', () => {
    render(<LastEditedBy record={edited} />)
    expect(screen.getByText('Ana Cruz')).toBeTruthy()
    // 16:30Z is 12:30 AM the next day in Manila (UTC+08:00).
    const time = screen.getByText('Nov 16, 2026, 12:30 AM')
    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('dateTime')).toBe(edited.lastEditedAt)
    expect(formatLastEditedAt(edited.lastEditedAt)).toBe('Nov 16, 2026, 12:30 AM')
  })

  it('shows a muted empty state for newly created records', () => {
    render(<LastEditedBy record={noLastEditor} />)
    expect(screen.getByText('Not edited yet')).toBeTruthy()
    expect(screen.queryByRole('time')).toBeNull()
  })

  it('handles missing fields and unparseable timestamps without crashing', () => {
    const { rerender } = render(<LastEditedBy record={{}} />)
    expect(screen.getByText('Not edited yet')).toBeTruthy()
    rerender(<LastEditedBy record={{ ...edited, lastEditedAt: 'not-a-date' }} />)
    expect(screen.getByText('Ana Cruz')).toBeTruthy()
    expect(screen.queryByText('not-a-date')).toBeNull()
  })
})

describe('edit payloads never send response-only attribution', () => {
  const originalAdapter = apiClient.defaults.adapter
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  function capture(response: unknown) {
    const bodies: Record<string, unknown>[] = []
    apiClient.defaults.adapter = async (config) => {
      bodies.push(JSON.parse(config.data))
      return { config, status: 200, statusText: '', headers: {}, data: response }
    }
    return bodies
  }

  function expectNoAttribution(bodies: Record<string, unknown>[]) {
    expect(bodies).toHaveLength(1)
    for (const field of lastEditedFields) expect(bodies[0]).not.toHaveProperty(field)
  }

  // Simulates a caller accidentally spreading a fetched record into the edit payload.
  const leaked: Record<never, never> = edited

  it('sales order draft', async () => {
    const bodies = capture({})
    await updateSalesOrderDraftApi(1, { ...leaked, expectedRevision: 2, notes: 'n' })
    expectNoAttribution(bodies)
  })

  it('purchase order draft', async () => {
    const bodies = capture({})
    await updatePurchaseOrderDraftApi(1, { ...leaked, expectedRevision: 2, notes: 'n' })
    expectNoAttribution(bodies)
  })

  it('incoming delivery draft', async () => {
    const bodies = capture({ id: 3, status: 'DRAFT', revision: 3 })
    await updateIncomingDraftApi(3, { ...leaked, expectedRevision: 2, warehouseId: 4 })
    expectNoAttribution(bodies)
    expect(bodies[0]).toEqual({ expectedRevision: 2, warehouseId: 4 })
  })

  it('outgoing delivery draft', async () => {
    const bodies = capture({})
    await updateOutgoingDeliveryDraftApi(3, {
      ...leaked,
      expectedRevision: 2,
      warehouseId: 4,
      notes: 'n',
      plannedItems: [],
    })
    expectNoAttribution(bodies)
  })

  it('delivery run draft', async () => {
    const bodies = capture({})
    await updateDeliveryRunDraftApi(4, { ...leaked, expectedRevision: 2, notes: 'n' })
    expectNoAttribution(bodies)
  })

  it('warehouse transfer draft', async () => {
    const saved = transferFixture()
    const bodies = capture({ ...saved, revision: 2 })
    await writeTransfer({
      action: 'draft',
      id: saved.id,
      payload: { ...leaked, expectedRevision: 1, notes: 'n' },
    })
    expectNoAttribution(bodies)
  })
})
