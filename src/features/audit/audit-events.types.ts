export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'ROLE_CHANGED',
  'EMAIL_CHANGED',
  'PASSWORD_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  USER_CREATED: 'Account created',
  ROLE_CHANGED: 'Role changed',
  EMAIL_CHANGED: 'Email changed',
  PASSWORD_CHANGED: 'Password changed',
  USER_DEACTIVATED: 'Account deactivated',
  USER_REACTIVATED: 'Account reactivated',
}

/** Audit events use UUID ids, so they cannot go through the numeric-id cursor helpers. */
export type AuditEvent = {
  id: string
  occurredAt: string
  actorUserId: number | null
  actorEmail: string | null
  actorRole: string | null
  targetUserId: number
  action: AuditAction
  changes: Record<string, { from: unknown; to: unknown }> | null
}

export type AuditEventFilter = {
  limit?: number
  cursor?: string
  action?: AuditAction
  from?: string
  to?: string
}
