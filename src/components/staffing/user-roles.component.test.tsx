import { apiClient } from '@/lib/api-client'
import { afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { UserRolesList } from './UserRolesList'

const state = vi.hoisted(() => ({
  guardReady: true,
  isAdmin: true,
  role: 'ADMIN',
  mutateAsync: vi.fn(),
  resetPassword: vi.fn(),
  resetPending: false,
  syncUser: vi.fn(),
}))
vi.mock('@/features/auth/AuthContext', async (original) => ({
  ...(await original<typeof import('@/features/auth/AuthContext')>()),
  useAuth: () => ({
    isAdmin: state.isAdmin,
    user: { id: 2, role: state.role },
    syncUser: state.syncUser,
  }),
}))
vi.mock('./RegisterUserModal', () => ({ RegisterUserModal: () => null }))
vi.mock('@/features/staffing/staffing.hooks', () => ({
  useAllUsers: () => ({
    isFetching: !state.guardReady,
    data: [
      {
        id: 1,
        email: 'super@example.test',
        role: 'SUPERADMIN',
        isActive: true,
        createdAt: '2026-10-01',
      },
      {
        id: 2,
        email: 'admin@example.test',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-10-01',
      },
      {
        id: 3,
        email: 'staff@example.test',
        role: 'STAFF',
        isActive: true,
        createdAt: '2026-10-01',
      },
    ],
  }),
  useEmployees: () => ({ data: [] }),
  useUpdateUserRole: () => ({ mutateAsync: state.mutateAsync }),
  useDeactivateUser: () => ({ isPending: false }),
  useReactivateUser: () => ({ isPending: false }),
  useUpdateUserPassword: () => ({ mutateAsync: state.resetPassword, isPending: state.resetPending }),
}))
const originalAdapter = apiClient.defaults.adapter
afterEach(() => { apiClient.defaults.adapter = originalAdapter })
beforeEach(() => {
  apiClient.defaults.adapter = async config => ({ config, status: 200, statusText: '', headers: {}, data: { items: [{ id: 1, email: 'super@example.test', role: 'SUPERADMIN', isActive: true, createdAt: '2026-10-01' }, { id: 2, email: 'admin@example.test', role: 'ADMIN', isActive: true, createdAt: '2026-10-01' }, { id: 3, email: 'staff@example.test', role: 'STAFF', isActive: true, createdAt: '2026-10-01' }], nextCursor: null } })
  state.guardReady = true
  state.isAdmin = true
  state.role = 'ADMIN'
  vi.clearAllMocks()
})
function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UserRolesList />
    </QueryClientProvider>,
  )
}
it('shows SUPERADMIN accurately without offering demotion or archival', async () => {
  mount()
  const row = await screen.findByRole('row', { name: /super@example.test/ })
  expect(within(row).getByText('SUPERADMIN')).toBeTruthy()
  expect(within(row).queryByRole('button', { name: /Change system role/i })).toBeNull()
  expect(within(row).queryByRole('button', { name: 'Archive' })).toBeNull()
})
it('does not offer account mutations to a manager', () => {
  state.isAdmin = false
  state.role = 'MANAGER'
  mount()
  expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
  expect(screen.queryByRole('button', { name: /Change system role/i })).toBeNull()
})
it('prevents demoting the last active ADMIN while keeping staff role management available', async () => {
  const user = userEvent.setup()
  mount()
  const admin = await screen.findByRole('row', { name: /admin@example.test/ })
  await user.click(within(admin).getByRole('button', { name: /Change system role/i }))
  expect(screen.getByRole('menuitem', { name: /MANAGER/ }).getAttribute('aria-disabled')).toBe(
    'true',
  )
  expect(screen.getByRole('menuitem', { name: /STAFF/ }).getAttribute('aria-disabled')).toBe('true')
  expect(state.mutateAsync).not.toHaveBeenCalled()
})


it('keeps ADMIN protections while the complete account safety check is refreshing', async () => {
  state.guardReady = false
  const user = userEvent.setup()
  mount()
  const admin = await screen.findByRole('row', { name: /admin@example.test/ })
  expect(within(admin).getByRole('button', { name: 'Archive' }).hasAttribute('disabled')).toBe(true)
  await user.click(within(admin).getByRole('button', { name: /Change system role/i }))
  expect(screen.getByRole('menuitem', { name: /MANAGER/ }).getAttribute('aria-disabled')).toBe('true')
  expect(screen.getByRole('menuitem', { name: /STAFF/ }).getAttribute('aria-disabled')).toBe('true')
  expect(state.mutateAsync).not.toHaveBeenCalled()
})

it('offers Reset Password to an admin on other accounts but not on their own or SUPERADMIN', async () => {
  mount()
  const staff = await screen.findByRole('row', { name: /staff@example.test/ })
  expect(within(staff).getByRole('button', { name: /Reset password for/i })).toBeTruthy()
  const self = screen.getByRole('row', { name: /admin@example.test/ })
  expect(within(self).queryByRole('button', { name: /Reset password for/i })).toBeNull()
  const superadmin = screen.getByRole('row', { name: /super@example.test/ })
  expect(within(superadmin).queryByRole('button', { name: /Reset password for/i })).toBeNull()
})

it('does not offer Reset Password to a manager', async () => {
  state.isAdmin = false
  state.role = 'MANAGER'
  mount()
  await screen.findByRole('row', { name: /staff@example.test/ })
  expect(screen.queryByRole('button', { name: /Reset password for/i })).toBeNull()
})

async function openReset() {
  const user = userEvent.setup()
  mount()
  const staff = await screen.findByRole('row', { name: /staff@example.test/ })
  await user.click(within(staff).getByRole('button', { name: /Reset password for/i }))
  const dialog = await screen.findByRole('dialog', { name: 'Reset Password' })
  return { user, dialog }
}

it('resets the selected account password once and closes the dialog', async () => {
  state.resetPassword.mockResolvedValue({ id: 3, email: 'staff@example.test' })
  const { user, dialog } = await openReset()
  expect(within(dialog).getByText(/signed out of any open sessions/i)).toBeTruthy()
  await user.type(within(dialog).getByLabelText('New Password'), 'new-secret-1')
  await user.type(within(dialog).getByLabelText('Confirm Password'), 'new-secret-1')
  await user.click(within(dialog).getByRole('button', { name: 'Reset Password' }))
  expect(state.resetPassword).toHaveBeenCalledTimes(1)
  expect(state.resetPassword).toHaveBeenCalledWith({ id: 3, password: 'new-secret-1' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reset Password' })).toBeNull())
})

it('rejects a short or mismatched password without calling the API', async () => {
  const { user, dialog } = await openReset()
  const password = within(dialog).getByLabelText('New Password')
  const confirm = within(dialog).getByLabelText('Confirm Password')
  const submit = within(dialog).getByRole('button', { name: 'Reset Password' })

  await user.type(password, 'short12')
  await user.type(confirm, 'short12')
  await user.click(submit)
  expect(await within(dialog).findByText('Use at least 8 characters.')).toBeTruthy()

  await user.clear(password)
  await user.clear(confirm)
  await user.type(password, 'new-secret-1')
  await user.type(confirm, 'new-secret-2')
  await user.click(submit)
  expect(
    await within(dialog).findByText('Passwords do not match. Please verify and try again.'),
  ).toBeTruthy()
  expect(state.resetPassword).not.toHaveBeenCalled()
})

it('keeps the dialog open and shows the server error when the reset fails', async () => {
  state.resetPassword.mockRejectedValue(new Error('Only administrators can change passwords.'))
  const { user, dialog } = await openReset()
  await user.type(within(dialog).getByLabelText('New Password'), 'new-secret-1')
  await user.type(within(dialog).getByLabelText('Confirm Password'), 'new-secret-1')
  await user.click(within(dialog).getByRole('button', { name: 'Reset Password' }))
  expect(await within(dialog).findByText('Only administrators can change passwords.')).toBeTruthy()
  expect(screen.getByRole('dialog', { name: 'Reset Password' })).toBeTruthy()
})
