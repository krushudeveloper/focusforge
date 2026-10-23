import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { useToast } from '../components/ToastProvider'
import {
  addMonths,
  dateKey,
  formatMinutes,
  longDate,
  monthGrid,
  monthLabel,
  parseKey,
  todayKey,
} from '../lib/date'
import { focusMinutesOn, sessionDayKey } from '../lib/stats'
import { useApp } from '../store/AppStore'
import { PRIORITY_ORDER, TIMER_LABELS, type Task } from '../types'

const PRIORITY_DOT: Record<Task['priority'], string> = {
  high: 'bg-danger',
  medium: 'bg-[var(--color-lavender)]',
  low: 'bg-brand',
}

export function CalendarPage() {
  const { state, toggleTask } = useApp()
  const { toast } = useToast()
  const today = todayKey()
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(today)

  const grid = useMemo(() => monthGrid(cursor), [cursor])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of state.tasks) {
      if (!task.deadline) continue
      const list = map.get(task.deadline) ?? []
      list.push(task)
      map.set(task.deadline, list)
    }
    return map
  }, [state.tasks])

  const minutesByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const session of state.sessions) {
      const key = sessionDayKey(session)
      map.set(key, (map.get(key) ?? 0) + (session.mode === 'focus' ? session.minutes : 0))
    }
    return map
  }, [state.sessions])

  const selectedTasks = (tasksByDay.get(selected) ?? []).slice().sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })
  const selectedSessions = state.sessions
    .filter((session) => sessionDayKey(session) === selected)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const selectedMinutes = focusMinutesOn(state.sessions, selected)

  function handleToggle(task: Task) {
    const completing = !task.completed
    toggleTask(task.id)
    if (completing) {
      toast({
        title: 'Task completed',
        description: task.title,
        variant: 'success',
        action: { label: 'Undo', onClick: () => toggleTask(task.id) },
      })
    }
  }

  const monthStats = grid
    .filter((date) => date.getMonth() === cursor.getMonth())
    .reduce((total, date) => total + (minutesByDay.get(dateKey(date)) ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Your month at a glance"
        description="Deadlines and study intensity on one page, so you can spot crowded weeks before they arrive."
        actions={
          <span className="chip h-9 gap-1.5 rounded-full border border-line bg-surface px-3.5 text-muted">
            <Sparkles size={13} className="text-brand" />
            {formatMinutes(monthStats)} this month
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <section className="card animate-fade-up p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[19px] font-semibold text-ink">
                {monthLabel(cursor)}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-faint">Monday-first weeks</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCursor(addMonths(cursor, -1))}
                className="icon-btn border border-line bg-surface"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
                  setSelected(today)
                }}
                className="btn btn-outline h-8 px-2.5 text-[11.5px]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCursor(addMonths(cursor, 1))}
                className="icon-btn border border-line bg-surface"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 border-b border-line pb-2 text-center">
            {grid.slice(0, 7).map((date) => (
              <span
                key={date.toISOString()}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint"
              >
                {date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((date) => {
              const key = dateKey(date)
              const inMonth = date.getMonth() === cursor.getMonth()
              const minutes = minutesByDay.get(key) ?? 0
              const tasks = tasksByDay.get(key) ?? []
              const isToday = key === today
              const isSelected = key === selected
              const intensity = Math.min(1, minutes / Math.max(30, state.settings.dailyGoalMinutes))
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-label={`${longDate(date)}${minutes ? `, ${minutes} minutes studied` : ''}`}
                  aria-pressed={isSelected}
                  className={`group relative flex aspect-square flex-col items-center justify-start rounded-xl border p-1.5 transition-all duration-200 ${
                    isSelected
                      ? 'border-brand/50 bg-brand-soft/70'
                      : 'border-transparent hover:border-line hover:bg-canvas'
                  } ${inMonth ? '' : 'opacity-40'}`}
                >
                  <span
                    className={`mt-0.5 grid size-6 place-items-center rounded-full text-[11.5px] tabular-nums transition-colors ${
                      isToday
                        ? 'bg-brand font-semibold text-white'
                        : isSelected
                          ? 'font-semibold text-brand'
                          : 'text-ink'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {minutes > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-1.5 bottom-1 h-1 rounded-full"
                      style={{
                        background: `color-mix(in oklab, var(--color-brand) ${
                          35 + intensity * 65
                        }%, var(--color-lavender-soft))`,
                        opacity: inMonth ? 1 : 0.5,
                      }}
                    />
                  ) : null}

                  <div className="mt-1 flex items-center gap-0.5">
                    {tasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className={`size-1 rounded-full ${PRIORITY_DOT[task.priority]} ${
                          task.completed ? 'opacity-30' : ''
                        }`}
                      />
                    ))}
                    {tasks.length > 3 ? (
                      <span className="text-[8px] leading-none text-faint">+{tasks.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[10.5px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" /> Study intensity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-danger" /> High priority
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-[var(--color-lavender)]" /> Medium
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-brand" /> Low
            </span>
          </div>
        </section>

        <section className="card animate-fade-up p-5" style={{ animationDelay: '70ms' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Selected day</h2>
              <p className="mt-1 text-[11.5px] text-faint">
                {longDate(parseKey(selected))}
              </p>
            </div>
            <span className="chip bg-brand-soft text-brand">
              {formatMinutes(selectedMinutes)}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Deadlines
            </p>
            <div className="mt-1.5">
              {selectedTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-3 text-[11.5px] text-faint">
                  No tasks due this day.
                </p>
              ) : (
                <div className="-mx-1 divide-y divide-line/60">
                  {selectedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      compact
                      onToggle={() => handleToggle(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Study sessions
            </p>
            <div className="mt-2">
              {selectedSessions.length === 0 ? (
                <EmptyState
                  compact
                  icon={CalendarDays}
                  title="No sessions logged"
                  description="Focus sessions you finish on this day will appear here."
                />
              ) : (
                <ul className="space-y-1">
                  {selectedSessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-canvas/70"
                    >
                      <span
                        className={`grid size-6 place-items-center rounded-md ${
                          session.mode === 'focus'
                            ? 'bg-brand-soft text-brand'
                            : 'bg-lavender-soft text-[var(--color-lavender)]'
                        }`}
                      >
                        {session.mode === 'focus' ? (
                          <Sparkles size={11} />
                        ) : (
                          <Coffee size={11} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                        {session.mode === 'focus' ? session.subject : TIMER_LABELS[session.mode]}
                      </span>
                      <span className="text-[10.5px] tabular-nums text-faint">
                        {new Date(session.completedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="w-7 text-right text-[10.5px] tabular-nums text-muted">
                        {session.minutes}m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
