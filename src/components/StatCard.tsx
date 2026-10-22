import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon: LucideIcon
  tone?: 'brand' | 'lavender' | 'success' | 'warn'
  delay?: number
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-brand-soft text-brand',
  lavender: 'bg-lavender-soft text-[var(--color-lavender)]',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'brand', delay = 0 }: Props) {
  return (
    <article
      className="card card-hover animate-fade-up p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium tracking-wide text-muted">{label}</p>
        <span className={`grid size-8 place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon size={15} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 font-display text-[28px] font-medium leading-none tracking-tight text-ink">
        {value}
      </p>
      {detail ? <div className="mt-2 text-[11.5px] leading-5 text-faint">{detail}</div> : null}
    </article>
  )
}
