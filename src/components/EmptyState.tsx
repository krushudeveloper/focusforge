import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/60 text-center ${
        compact ? 'px-5 py-8' : 'px-6 py-12'
      }`}
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-surface text-brand shadow-sm ring-1 ring-line">
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <p className="mt-4 text-[13.5px] font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
