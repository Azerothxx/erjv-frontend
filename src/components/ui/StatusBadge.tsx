import type { ReactNode } from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const tones = {
  neutral: 'border-border bg-muted text-muted-foreground',
  warning: 'border-status-warning-foreground/20 bg-status-warning text-status-warning-foreground',
  info: 'border-status-info-foreground/20 bg-status-info text-status-info-foreground',
  progress: 'border-status-progress-foreground/20 bg-status-progress text-status-progress-foreground',
  partial: 'border-status-partial-foreground/20 bg-status-partial text-status-partial-foreground',
  success: 'border-status-success-foreground/20 bg-status-success text-status-success-foreground',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
}

const dots = {
  neutral: 'bg-muted-foreground',
  warning: 'bg-status-warning-foreground',
  info: 'bg-status-info-foreground',
  progress: 'bg-status-progress-foreground',
  partial: 'bg-status-partial-foreground',
  success: 'bg-status-success-foreground',
  destructive: 'bg-destructive',
}

export type StatusBadgeTone = keyof typeof tones

type StatusBadgeProps = Omit<BadgeProps, 'variant' | 'children'> & {
  label: ReactNode
  tone?: StatusBadgeTone
  appearance?: 'subtle' | 'emphasis'
  showDot?: boolean
}

/** Shared presentation; each feature owns its backend status labels and mapping. */
export function StatusBadge({
  label,
  tone = 'neutral',
  // Kept for existing callers: every badge now uses its full tone tint.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  appearance: _appearance,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'w-fit min-w-max shrink-0 gap-1.5 whitespace-nowrap leading-4',
        tones[tone],
        className,
      )}
      {...props}
    >
      {showDot && (
        <span
          aria-hidden="true"
          data-slot="status-dot"
          className={cn('size-1.5 shrink-0 rounded-full', dots[tone])}
        />
      )}
      <span className="shrink-0 whitespace-nowrap">{label}</span>
    </Badge>
  )
}
