import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { SuperAdminAccess } from '@/routing/DashboardPages'
import { AuditLogList } from './AuditLogList'

const auth = vi.hoisted(() => ({ isSuperAdmin: true }))
vi.mock('@/features/auth/AuthContext', () => ({ useAuth: () => auth }))

const original = apiClient.defaults.adapter
let reads: { url?: string; params: Record<string, unknown> }[]

beforeEach(() => {
  reads = []
  auth.isSuperAdmin = true
  apiClient.defaults.adapter = async (config) => {
    reads.push({ url: config.url, params: config.params ?? {} })
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        items: [
          {
            id: '3f2c6c1e-8a53-4d62-9a52-0d3b5d6b9a11',
            occurredAt: '2026-11-17T02:00:00.000Z',
            actorUserId: 1,
            actorEmail: 'root@example.test',
            actorRole: 'SUPERADMIN',
            targetUserId: 7,
            action: 'ROLE_CHANGED',
            changes: { role: { from: 'STAFF', to: 'MANAGER' }, passwordHash: { from: 'a', to: 'b' } },
          },
        ],
        nextCursor: null,
      },
    }
  }
})
afterEach(() => {
  apiClient.defaults.adapter = original
})

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/audit-log']}>
        <Routes>
          <Route path="/" element={<p>Home</p>} />
          <Route element={<SuperAdminAccess />}>
            <Route path="audit-log" element={<AuditLogList />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('lists audit events read-only with string ids and never prints sensitive field values', async () => {
  mount()
  expect(await screen.findByText('root@example.test')).toBeTruthy()
  expect(screen.getByText('Role changed')).toBeTruthy()
  expect(screen.getByText(/role: STAFF → MANAGER/)).toBeTruthy()
  expect(screen.getByText(/passwordHash: hidden → hidden/)).toBeTruthy()
  expect(reads[0]).toMatchObject({ url: '/audit-events', params: { limit: 50 } })
  expect(screen.queryByRole('button', { name: /delete|edit|archive/i })).toBeNull()
})

it('sends other roles back home without requesting the audit log', async () => {
  auth.isSuperAdmin = false
  mount()
  expect(await screen.findByText('Home')).toBeTruthy()
  await waitFor(() => expect(reads).toHaveLength(0))
})
