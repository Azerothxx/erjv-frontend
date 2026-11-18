import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api-client'

/** Collects the reason the backend requires when a draft transfer is cancelled from inside its draft trip. */
export function CancelRunTransferDialog({
  transferNumber,
  onConfirm,
  onClose,
}: {
  transferNumber: string
  onConfirm: (reason: string) => Promise<unknown>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    if (pending || !reason.trim()) return
    setPending(true)
    setError('')
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent closeDisabled={pending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Transfer?</DialogTitle>
          <DialogDescription>
            {transferNumber} will be removed from this draft trip and cancelled. To keep the transfer
            and only take it off this trip, use Remove from Trip instead.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Label htmlFor="cancel-run-transfer-reason">
            Reason <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="cancel-run-transfer-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending}
            required
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Keep Transfer
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={() => void submit()}
          >
            {pending ? 'Cancelling...' : 'Cancel Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
