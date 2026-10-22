import { useId, type ReactNode } from 'react'

type Props = {
  /** 0–1, where 1 is a full ring. */
  progress: number
  size?: number
  strokeWidth?: number
  from?: string
  to?: string
  className?: string
  children?: ReactNode
}

export function ProgressRing({
  progress,
  size = 320,
  strokeWidth = 9,
  from = 'var(--color-brand)',
  to = 'var(--color-lavender)',
  className = '',
  children,
}: Props) {
  const gradientId = useId().replace(/:/g, '')
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, progress))

  return (
    <div className={`relative aspect-square w-full ${className}`} style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
