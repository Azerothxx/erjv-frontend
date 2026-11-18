import { toast } from '@/lib/notifications'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DateTimeField } from '@/components/common/DateTimeField'
import { SearchableDropdown } from '@/components/ui/SearchableDropdown'
import { toManilaSchedule, manilaScheduleToIso } from '@/lib/manila-schedule'
import { getApiError, getErrorMessage } from '@/lib/api-client'
import { rescheduleIncomingDeliveryApi } from '@/features/logistics/incoming-deliveries.api'
import type { IncomingDeliveryRecord } from '@/features/logistics/incoming-deliveries.types'
import type { Warehouse } from '@/features/logistics/warehouses.types'

/** Moves a SCHEDULED arrival without cancelling it. Only changed fields are sent. */
export function RescheduleIncomingForm({
  delivery,
  currentRevision,
  warehouses,
  onSaved,
  onBusyChange,
  onCancel,
}: {
  delivery: IncomingDeliveryRecord
  currentRevision: number
  warehouses: Warehouse[]
  onBusyChange: (busy: boolean) => void
  onSaved: () => Promise<unknown>
  onCancel: () => void
}) {
  // Hold the revision shown when editing began; never substitute a newer revision for unsaved edits.
  const [revision] = useState(delivery.revision)
  const initialArrival = toManilaSchedule(delivery.scheduledAt)
  const [arrival, setArrival] = useState(initialArrival)
  const [warehouseId, setWarehouseId] = useState(String(delivery.warehouseId))
  const [error, setError] = useState('')
  const [requiresRefresh, setRequiresRefresh] = useState(false)
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const client = useQueryClient()
  const changedElsewhere = revision !== currentRevision
  const mutation = useMutation({
    mutationFn: rescheduleIncomingDeliveryApi.bind(null, delivery.id),
    retry: false,
  })
  const arrivalChanged = arrival !== initialArrival
  const warehouseChanged = warehouseId !== String(delivery.warehouseId)
  const locked = saving || requiresRefresh || changedElsewhere

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity() || lock.current || locked) return
    lock.current = true
    setSaving(true)
    onBusyChange(true)
    setError('')
    try {
      const scheduledAt = arrivalChanged ? manilaScheduleToIso(arrival) : null
      if (arrivalChanged && !scheduledAt) throw Error('Enter a valid arrival date and time.')
      if (
        warehouseChanged &&
        !warehouses.some((warehouse) => warehouse.id === Number(warehouseId) && warehouse.isActive)
      )
        throw Error('Select an active receiving warehouse.')
      const saved = await mutation.mutateAsync({
        expectedRevision: revision,
        ...(scheduledAt ? { scheduledAt } : {}),
        ...(warehouseChanged ? { warehouseId: Number(warehouseId) } : {}),
      })
      if (
        (scheduledAt && Date.parse(saved.scheduledAt ?? '') !== Date.parse(scheduledAt)) ||
        (warehouseChanged && saved.warehouseId !== Number(warehouseId))
      )
        throw Error('The new arrival could not be verified. Refresh the delivery before continuing.')
      await client.invalidateQueries({ queryKey: ['incoming-deliveries'] })
      await onSaved()
      toast.success('Arrival rescheduled.')
    } catch (cause) {
      const code = getApiError(cause)?.code
      setError(
        code === 'INVALID_DELIVERY_STATE' || code === 'STALE_REVISION'
          ? 'This delivery changed. Close this section and review its current status before rescheduling.'
          : getErrorMessage(cause),
      )
      setRequiresRefresh(true)
      await client.invalidateQueries({ queryKey: ['incoming-deliveries'] })
    } finally {
      lock.current = false
      setSaving(false)
      onBusyChange(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      aria-label="Reschedule incoming delivery"
    >
      <DateTimeField
        id="reschedule-arrival"
        label="New arrival date and time"
        value={arrival}
        onChange={setArrival}
        required
        disabled={locked}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reschedule-warehouse">Receiving warehouse</Label>
        <SearchableDropdown
          id="reschedule-warehouse"
          value={warehouseId}
          onValueChange={setWarehouseId}
          getOptionValue={(option) => option.value}
          getOptionLabel={(option) => option.label}
          searchPlaceholder="Search warehouses"
          emptyMessage="No active warehouses available"
          ariaLabel="Receiving warehouse"
          options={warehouses
            .filter((warehouse) => warehouse.isActive || warehouse.id === delivery.warehouseId)
            .map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))}
          placeholder="Select an active warehouse"
          disabled={locked}
        />
      </div>
      {changedElsewhere && !saving && (
        <p role="alert" className="text-sm text-destructive">
          This delivery changed while you were editing. Close this section and review its current
          details before trying again.
        </p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={locked || (!arrivalChanged && !warehouseChanged)}>
          {saving ? 'Saving…' : 'Save New Arrival'}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={onCancel}>
          Close
        </Button>
      </div>
    </form>
  )
}
