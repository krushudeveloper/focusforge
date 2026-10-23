import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarCheck2, Download, Flame, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ProgressRing } from '../components/ProgressRing'
import { StatCard } from '../components/StatCard'
import { StudyBarChart } from '../components/StudyBarChart'
import { useToast } from '../components/ToastProvider'
import { addDays, dateKey, formatMinutes, todayKey } from '../lib/date'
import { exportSessionsCsv, exportTasksCsv } from '../lib/export'
import {
  bestStreak,
  currentStreak,
  daySeries,
  focusMinutesInRange,
  focusMinutesOn,
  focusMinutesTotal,
  productivityScore,
  sessionDayKey,
  subjectBreakdown,
  studyMinutes,
} from '../lib/stats'
import { useApp } from '../store/AppStore'

const RANGES = [7, 14, 30] as const
const SUBJECT_COLORS = [
  'var(--color-brand)',
  'var(--color-lavender)',
  'var(--color-success)',
  'var(--color-warn)',
  'var(--color-brand-deep)',
]

export function AnalyticsPage() {
  const { state } = useApp()
  const { toast } = useToast()
  const [range, setRange] = useState<(typeof RANGES)[number]>(7)
  const today = todayKey()

  const data = useMemo(() => {
    const series = daySeries(state.sessions, range)
    const total = series.reduce((sum, day) => sum + day.minutes, 0)
    const todayMinutes = focusMinutesOn(state.sessions, today)
    const weekStart = dateKey(addDays(new Date(), -6))
    const previousWeekStart = dateKey(addDays(new Date(), -13))
    const previousWeekEnd = dateKey(addDays(new Date(), -7))
    const weekMinutes = focusMinutesInRange(state.sessions, weekStart, today)
    const previousWeekMinutes = focusMinutesInRange(
      state.sessions,
      previousWeekStart,
      previousWeekEnd,
    )
    const sessions = state.sessions.filter((session) => studyMinutes(session) > 0)
    const activeDays = new Set(sessions.map(sessionDayKey)).size
    const last14 = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(new Date(), index - 13)
      const key = dateKey(date)
      return { key, minutes: focusMinutesOn(state.sessions, key) }
    })
    return {
      series,
      total,
      todayMinutes,
      weekMinutes,
      previousWeekMinutes,
      allTime: focusMinutesTotal(state.sessions),
      average: Math.round(total / range),
      bestDay: series.reduce((best, day) => (day.minutes > best.minutes ? day : best), series[0]),
      subjects: subjectBreakdown(state.sessions),
      streak: currentStreak(state.sessions),
      best: bestStreak(state.sessions),
      activeDays,
      last14,
      score: productivityScore(
        state.tasks,
        state.sessions,
        today,
        state.settings.dailyGoalMinutes,
      ),
    }
  }, [state.sessions, state.tasks, state.settings.dailyGoalMinutes, range, today])

  const weekDelta =
    data.previousWeekMinutes > 0
      ? Math.round(((data.weekMinutes - data.previousWeekMinutes) / data.previousWeekMinutes) * 100)
      : null

  const scoreProgress = data.score.score / 100
  const focusPercent = Math.min(
    100,
    Math.round((data.todayMinutes / Math.max(15, state.settings.dailyGoalMinutes)) * 100),
  )
  const hasSessions = data.subjects.length > 0

  const chartData = data.series.map((point, index) => ({
    ...point,
    weekday:
      range === 7
        ? point.weekday
        : index % (range === 14 ? 2 : 5) === 0
          ? point.label.split(' ')[0]
          : '',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="See the work add up"
        description="Study hours, subject balance and a productivity score built from real sessions and tasks — never placeholder numbers."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                if (state.sessions.length === 0) {
                  toast({
                    title: 'Nothing to export yet',
                    description: 'Complete a focus session first.',
                    variant: 'warning',
                  })
                  return
                }
                exportSessionsCsv(state.sessions)
                toast({
                  title: 'Sessions exported',
                  description: 'Your study log is downloading as CSV.',
                  variant: 'success',
                })
              }}
              className="btn btn-outline"
            >
              <Download size={14} /> Study log
            </button>
            <button
              type="button"
              onClick={() => {
                if (state.tasks.length === 0) {
                  toast({
                    title: 'No tasks to export',
                    description: 'Add a task and try again.',
                    variant: 'warning',
                  })
                  return
                }
                exportTasksCsv(state.tasks)
                toast({ title: 'Tasks exported', description: 'CSV download started.', variant: 'success' })
              }}
              className="btn btn-ghost"
            >
              Tasks CSV
            </button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Today"
          value={formatMinutes(data.todayMinutes)}
          icon={Sparkles}
          tone="brand"
          delay={30}
          detail={`${focusPercent}% of daily goal`}
        />
        <StatCard
          label="This week"
          value={formatMinutes(data.weekMinutes)}
          icon={BarChart3}
          tone="lavender"
          delay={70}
          detail={
            weekDelta === null ? (
              'First week of tracking'
            ) : (
              <span
                className={`inline-flex items-center gap-1 ${weekDelta >= 0 ? 'text-success-ink' : 'text-danger'}`}
              >
                {weekDelta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(weekDelta)}% vs last week
              </span>
            )
          }
        />
        <StatCard
          label="All-time focus"
          value={formatMinutes(data.allTime)}
          icon={Target}
          tone="success"
          delay={110}
          detail={`${data.activeDays} active day${data.activeDays === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Daily average"
          value={formatMinutes(data.average)}
          icon={CalendarCheck2}
          tone="brand"
          delay={150}
          detail={`Across the last ${range} days`}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <section className="card animate-fade-up p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Study hours</h2>
              <p className="mt-1 text-[11.5px] text-faint">
                Focus minutes per day · {formatMinutes(data.total)} total
              </p>
            </div>
            <div className="inline-flex rounded-full bg-canvas p-1 ring-1 ring-line/70">
              {RANGES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  aria-pressed={range === value}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    range === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {hasSessions ? (
              <>
                <StudyBarChart
                  data={chartData}
                  height={250}
                  xInterval={range === 30 ? 4 : range === 14 ? 1 : 0}
                />
                {data.bestDay && data.bestDay.minutes > 0 ? (
                  <p className="mt-2 text-right text-[11px] text-faint">
                    Best day · {data.bestDay.label} · {formatMinutes(data.bestDay.minutes)}
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Your chart starts with one session"
                description="Run a 25 minute focus block and this page fills in automatically."
              />
            )}
          </div>
        </section>

        <section className="card animate-fade-up p-5 sm:p-6" style={{ animationDelay: '70ms' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Productivity score</h2>
              <p className="mt-1 text-[11.5px] text-faint">Today&apos;s balance</p>
            </div>
            <span className="chip bg-brand-soft text-brand">{today}</span>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <ProgressRing
              progress={scoreProgress}
              size={186}
              strokeWidth={10}
              from="var(--color-brand)"
              to="var(--color-lavender)"
            >
              <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-ink">
                {data.score.score}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                out of 100
              </span>
            </ProgressRing>
          </div>

          <div className="mt-5 space-y-3.5">
            <div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted">Focus goal</span>
                <span className="tabular-nums text-faint">
                  {formatMinutes(data.todayMinutes)} / {formatMinutes(state.settings.dailyGoalMinutes)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500"
                  style={{ width: `${focusPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted">Tasks cleared</span>
                <span className="tabular-nums text-faint">
                  {data.score.taskDone} / {Math.max(data.score.taskTotal, 0)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-[var(--color-lavender)] transition-[width] duration-500"
                  style={{
                    width: `${
                      data.score.taskTotal > 0
                        ? Math.round((data.score.taskDone / data.score.taskTotal) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10.5px] leading-4 text-faint">
            60% from focus time against your daily goal, 40% from tasks due or completed today.
          </p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card card-hover animate-fade-up p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Subject balance</h2>
              <p className="mt-1 text-[11.5px] text-faint">Where your focus actually goes</p>
            </div>
            {data.subjects[0] ? (
              <span className="chip bg-lavender-soft text-brand">
                Top · {data.subjects[0].subject}
              </span>
            ) : null}
          </div>

          {hasSessions ? (
            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative h-[190px] w-full max-w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.subjects.slice(0, 5)}
                      dataKey="minutes"
                      nameKey="subject"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {data.subjects.slice(0, 5).map((subject, index) => (
                        <Cell
                          key={subject.subject}
                          fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]}
                          fillOpacity={index === 0 ? 1 : 0.72}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={(props) => {
                        if (!props.active || !props.payload?.length) return null
                        const item = props.payload[0]?.payload as
                          | { subject: string; minutes: number }
                          | undefined
                        if (!item) return null
                        return (
                          <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lift">
                            <p className="text-[11px] text-muted">{item.subject}</p>
                            <p className="font-display text-[14px] font-semibold text-ink">
                              {formatMinutes(item.minutes)}
                            </p>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                    Focused
                  </span>
                  <span className="mt-1 font-display text-[20px] font-semibold leading-none text-ink">
                    {formatMinutes(data.allTime)}
                  </span>
                </div>
              </div>

              <ul className="w-full flex-1 space-y-2">
                {data.subjects.slice(0, 5).map((subject, index) => (
                  <li key={subject.subject} className="flex items-center gap-2.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
                        opacity: index === 0 ? 1 : 0.7,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                      {subject.subject}
                    </span>
                    <span className="text-[11px] tabular-nums text-faint">
                      {formatMinutes(subject.minutes)}
                    </span>
                    <span className="w-8 text-right text-[11px] tabular-nums text-faint">
                      {Math.round((subject.minutes / Math.max(1, data.allTime)) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Sparkles}
                title="No focus time yet"
                description="Your subject mix will appear once you complete a session with a subject selected."
              />
            </div>
          )}
        </section>

        <section className="card card-hover animate-fade-up p-5 sm:p-6" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Consistency</h2>
              <p className="mt-1 text-[11.5px] text-faint">Last 14 days of study</p>
            </div>
            <span className="grid size-8 place-items-center rounded-xl bg-warn-soft text-warn">
              <Flame size={15} />
            </span>
          </div>

          <div className="mt-4 flex items-end gap-6">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
                Current
              </p>
              <p className="mt-1 font-display text-[36px] font-semibold leading-none text-ink">
                {data.streak}
                <span className="ml-1 text-[13px] font-normal text-muted">
                  {data.streak === 1 ? 'day' : 'days'}
                </span>
              </p>
            </div>
            <div className="pb-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
                Best
              </p>
              <p className="mt-1 font-display text-[20px] font-semibold leading-none text-muted">
                {data.best} days
              </p>
            </div>
            <div className="ml-auto pb-1 text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
                Active days
              </p>
              <p className="mt-1 font-display text-[20px] font-semibold leading-none text-muted">
                {data.activeDays}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-end gap-1.5">
            {data.last14.map((day) => {
              const intensity = Math.min(1, day.minutes / Math.max(30, state.settings.dailyGoalMinutes))
              return (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="h-9 w-full rounded-md transition-colors duration-300"
                    title={`${day.key}: ${formatMinutes(day.minutes)}`}
                    style={{
                      background:
                        day.minutes > 0
                          ? `color-mix(in oklab, var(--color-brand) ${20 + intensity * 80}%, var(--color-lavender-soft))`
                          : 'var(--color-canvas)',
                      border: day.minutes > 0 ? 'none' : '1px solid var(--color-line)',
                    }}
                  />
                  <span className="text-[8.5px] text-faint">{day.key.slice(-2)}</span>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-[10.5px] leading-4 text-faint">
            {data.streak > 0
              ? `You are on a ${data.streak} day streak. One focus session keeps it alive.`
              : 'Complete a focus session today to begin a new streak.'}
          </p>
        </section>
      </div>
    </div>
  )
}
