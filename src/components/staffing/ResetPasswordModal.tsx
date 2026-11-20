import { passwordError } from '@/features/auth/session'
import { useRef, useState, type FormEvent } from 'react'
import { KeyRound, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateUserPassword } from '@/features/staffing/staffing.hooks'
import type { UserAccount } from '@/features/staffing/staffing.types'
import { getErrorMessage } from '@/lib/api-client'

type ResetPasswordModalProps = {
  user: UserAccount | null
  onClose: () => void
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const updatePassword = useUpdateUserPassword()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorField, setErrorField] = useState<'password' | 'confirm'>()
  const submitting = useRef(false)

  const accountName = user ? user.fullName || user.email : ''

  const handleClose = () => {
    if (submitting.current || updatePassword.isPending) return
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setErrorMsg('')
    setErrorField(undefined)
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || submitting.current || updatePassword.isPending) return

    const reject = (field: 'password' | 'confirm', message: string) => {
      setErrorField(field)
      setErrorMsg(message)
    }

    const invalid = passwordError(password)
    if (invalid) {
      reject('password', invalid)
      return
    }
    if (password !== confirmPassword) {
      reject('confirm', 'Passwords do not match. Please verify and try again.')
      return
    }

    setErrorField(undefined)
    setErrorMsg('')
    submitting.current = true
    try {
      await updatePassword.mutateAsync({ id: user.id, password })
      submitting.current = false
      handleClose()
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      submitting.current = false
    }
  }

  const clearError = () => {
    if (errorMsg) {
      setErrorMsg('')
      setErrorField(undefined)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="min-w-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription className="wrap-anywhere">
            Set a new password for {accountName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4" noValidate>
          {errorMsg && !errorField && (
            <Alert variant="destructive" className="py-2.5 px-3">
              <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="reset-password" className="text-ui font-medium text-foreground">
              New Password <span aria-hidden="true">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-password"
                error={errorField === 'password' ? errorMsg : undefined}
                aria-label="New Password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearError()
                }}
                className="pl-9 pr-10"
                disabled={updatePassword.isPending}
                autoFocus
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="reset-confirm" className="text-ui font-medium text-foreground">
              Confirm Password <span aria-hidden="true">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-confirm"
                error={errorField === 'confirm' ? errorMsg : undefined}
                aria-label="Confirm Password"
                required
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearError()
                }}
                className="pl-9 pr-10"
                disabled={updatePassword.isPending}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 rounded-lg bg-secondary p-4 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 wrap-anywhere">
              <span className="font-semibold text-foreground">Signs the user out: </span>
              They will be signed out of any open sessions and must sign in with the new password.
              This change is recorded in the audit log without the password value.
            </div>
          </div>

          <DialogFooter className="mt-2 sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={updatePassword.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={updatePassword.isPending} className="gap-2">
              {updatePassword.isPending ? (
                <>
                  <Spinner className="size-3.5" />
                  Saving...
                </>
              ) : (
                <>
                  <KeyRound className="size-3.5" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
