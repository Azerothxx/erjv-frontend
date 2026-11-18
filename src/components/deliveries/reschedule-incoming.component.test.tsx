import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { RescheduleIncomingForm } from './RescheduleIncomingForm'
import type { IncomingDeliveryRecord } from '@/features/logistics/incoming-deliveries.types'
import type { Warehouse } from '@/features/logistics/warehouses.types'

const original = apiClient.defaults.adapter
const delivery = {
  id: 12,
  revision: 3,
  status: 'SCHEDULED',
  warehouseId: 2,
  scheduledAt: '2026-11-20T02:00:00.000Z',
} as IncomingDeliveryRecord
const warehouses = [
  { id: 2, name: 'Main', isActive: true },
  { id: 3, name: 'Annex', isActive: true },
] as Warehouse[]
let writes: { url?: string; body: Record<string, unknown> }[]

beforeEach(() => {
  writes = []
  apiClient.defaults.adapter = async (config) => {
    const body = JSON.parse(config.data)
    writes.push({ url: config.url, body })
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { ...delivery, revision: 4, scheduledAt: body.scheduledAt ?? delivery.scheduledAt, warehouseId: body.warehouseId ?? delivery.warehouseId },
    }
  }
})
afterEach(() => {
  apiClient.defaults.adapter = original
})

function mount(onSaved = vi.fn().mockResolvedValue(undefined)) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RescheduleIncomingForm
        delivery={delivery}
        currentRevision={3}
        warehouses={warehouses}
        onBusyChange={vi.fn()}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    </QueryClientProvider>,
  )
  return onSaved
}

it('keeps Save disabled until the arrival changes, then sends only the changed fields to /reschedule', async () => {
  const onSaved = mount()
  const save = screen.getByRole('button', { name: 'Save New Arrival' })
  expect(save.hasAttribute('disabled')).toBe(true)
  fireEvent.change(screen.getByLabelText('New arrival date and time Date'), {
    target: { value: '2026-11-25' },
  })
  await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false))
  await userEvent.click(save)
  await waitFor(() => expect(writes).toHaveLength(1))
  expect(writes[0].url).toBe('/incoming-deliveries/12/reschedule')
  expect(writes[0].body).toMatchObject({ expectedRevision: 3 })
  expect(writes[0].body).toHaveProperty('scheduledAt')
  expect(writes[0].body).not.toHaveProperty('warehouseId')
  await waitFor(() => expect(onSaved).toHaveBeenCalled())
})
