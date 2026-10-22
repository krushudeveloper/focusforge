/** Local-time helpers. All date keys are `YYYY-MM-DD` in the user's timezone. */

export const DAY_MS = 86_400_000

export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  // Monday-first weeks
  const diff = day === 0 ? -6 : 1 - day
  return addDays(d, diff)
}

export function isSameKey(a: string, b: string): boolean {
  return a === b
}

export function longDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function weekdayInitial(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'narrow' })
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Late night focus'
}

export function formatMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatHours(totalMinutes: number): string {
  const hours = totalMinutes / 60
  if (hours === 0) return '0h'
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function startOfDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function minutesBetweenKeys(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / DAY_MS)
}

export function deadlineLabel(deadline: string, today = todayKey()): string {
  const diff = minutesBetweenKeys(today, deadline)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const date = parseKey(deadline)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** 42-cell month grid, Monday-first, covering the visible month. */
export function monthGrid(monthCursor: Date): Date[] {
  const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}
