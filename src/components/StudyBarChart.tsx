import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMinutes } from '../lib/date'

export type StudyPoint = {
  key: string
  label: string
  weekday?: string
  minutes: number
  isToday?: boolean
}

type Props = {
  data: StudyPoint[]
  height?: number
  compact?: boolean
  xInterval?: number
}

export function StudyBarChart({ data, height = 220, compact = false, xInterval = 0 }: Props) {
  const gradientId = `bars-${useId().replace(/:/g, '')}`
  const chartData = data.map((point) => ({ ...point, hours: Math.round((point.minutes / 60) * 100) / 100 }))
  const maxHours = Math.max(1, Math.ceil(Math.max(...chartData.map((point) => point.hours), 0)))

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: compact ? -22 : -14, bottom: 0 }}
          barCategoryGap="26%"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--color-lavender)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 6" />
          <XAxis
            dataKey="weekday"
            axisLine={false}
            tickLine={false}
            dy={10}
            interval={xInterval}
            tick={{ fill: 'var(--color-faint)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={compact ? 32 : 42}
            domain={[0, maxHours]}
            tickFormatter={(value: number) => (value === 0 ? '0' : `${value}h`)}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-canvas)', radius: 10 }}
            content={(props) => {
              if (!props.active || !props.payload?.length) return null
              const point = props.payload[0]?.payload as (StudyPoint & { hours: number }) | undefined
              if (!point) return null
              return (
                <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lift">
                  <p className="text-[11px] font-medium text-muted">{point.label}</p>
                  <p className="mt-0.5 font-display text-[15px] font-semibold text-ink">
                    {point.minutes === 0 ? 'No focus time' : formatMinutes(point.minutes)}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="hours" radius={[7, 7, 4, 4]} maxBarSize={compact ? 26 : 38} fill={`url(#${gradientId})`} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
