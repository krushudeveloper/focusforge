import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock4,
  Flame,
  ListChecks,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PomodoroCard } from '../components/PomodoroCard'
import { StatCard } from '../components/StatCard'
import { StudyBarChart } from '../components/StudyBarChart'
import { TaskFormModal } from '../components/TaskFormModal'
import { TaskItem } from '../components/TaskItem'
import { useToast } from '../components/ToastProvider'
import { addDays, dateKey, formatMinutes, greeting, longDate, todayKey } from '../lib/date'
import {
  currentStreak,
  daySeries,
  focusMinutesOn,
  isOverdue,
  mostStudiedSubject,
  productivityScore,
  sortTasks,
  subjectBreakdown,
  tasksCompletedOn,
} from '../lib/stats'
import { useApp } from '../store/AppStore'
import type { Task, View } from '../types'

export function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { state, toggleTask } = useApp()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)

  const today = todayKey()
  const goals = state.settings.dailyGoalMinutes
  const name = state.settings.name.trim()

  const metrics = useMemo(() => {
    const minutesToday = focusMinutesOn(state.sessions, today)
    const minutesYesterday = focusMinutesOn(state.sessions, dateKey(addDays(new Date(), -1)))
    const completedToday = tasksCompletedOn(state.tasks, today)
    const pending = state.tasks.filter((task) => !task.completed)
    const overdue = pending.filter((task) => isOverdue(task, today))
    const dueToday = pending.filter((task) => task.deadline === today)
    const score = productivityScore(state.tasks, state.sessions, today, goals)
    const week = daySeries(state.sessions, 7)
    const weekMinutes = week.reduce((total, day) => total + day.minutes, 0)
    const weekGoal = goals * 7
    return {
      minutesToday,
      minutesYesterday,
      completedToday,
      pending,
      overdue,
      dueToday,
      score,
      week,
      weekMinutes,
      weekGoal,
      streak: currentStreak(state.sessions),
      subject: mostStudiedSubject(state.sessions),
      subjects: subjectBreakdown(state.sessions).slice(0, 3),
      plan: sortTasks(pending, 'deadline').slice(0, 4),
    }
  }, [state.tasks, state.sessions, today, goals])

  const goalPercent = Math.min(100, Math.round((metrics.minutesToday / goals) * 100))
  const topSubjectMinutes = Math.max(1, metrics.subject?.minutes ?? 0)
  const trend =
    metrics.minutesYesterday > 0
      ? Math.round(((metrics.minutesToday - metrics.minutesYesterday) / metrics.minutesYesterday) * 100)
      : null

  const subline = metrics.overdue.length
    ? `${metrics.overdue.length} task${metrics.overdue.length === 1 ? '' : 's'} overdue — start there.`
    : metrics.dueToday.length
      ? `${metrics.dueToday.length} task${metrics.dueToday.length === 1 ? '' : 's'} due today · ${formatMinutes(metrics.minutesToday)} focused so far.`
      : metrics.minutesToday > 0
        ? `${formatMinutes(metrics.minutesToday)} of focus logged today. Keep the thread.`
        : 'A clear board and a fresh day — pick one thing to move forward.'

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

  return (
    <div className="space-y-6">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-faint">
            {longDate(new Date())}
          </p>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-[36px]">
            {greeting()}
            {name ? (
              <>
                ,{' '}
                <span className="font-serif font-normal italic tracking-[-0.01em] text-brand">
                  {name}
                </span>
              </>
            ) : null}
          </h1>
          <p className="mt-2.5 max-w-xl text-[13px] leading-6 text-muted">{subline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip h-9 gap-1.5 rounded-full border border-line bg-surface px-3 text-muted">
            <Flame size={13} className="text-[var(--color-lavender)]" />
            <span className="font-medium text-ink">{metrics.streak}</span> day streak
          </span>
          <button type="button" onClick={() => setModalOpen(true)} className="btn btn-outline h-9">
            <Plus size={15} /> New task
          </button>
          <button
            type="button"
            onClick={() => onNavigate('timer')}
            className="btn btn-primary h-9"
          >
            Start focus
            <ArrowUpRight size={15} />
          </button>
        </div>
      </header>

      <section
        aria-label="Today at a glance"
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <StatCard
          label="Study time today"
          value={formatMinutes(metrics.minutesToday)}
          icon={Clock4}
          tone="brand"
          delay={30}
          detail={
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-14 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-brand transition-[width] duration-500"
                  style={{ width: `${goalPercent}%` }}
                />
              </span>
              {goalPercent}% of {formatMinutes(goals)}
            </span>
          }
        />
        <StatCard
          label="Tasks completed"
          value={metrics.completedToday.length}
          icon={CheckCircle2}
          tone="success"
          delay={70}
          detail={
            trend !== null && trend > 0
              ? <span className="text-success-ink">{trend}% more focus than yesterday</span>
              : `${metrics.pending.length} still in progress`
          }
        />
        <StatCard
          label="Remaining tasks"
          value={metrics.pending.length}
          icon={ListChecks}
          tone="lavender"
          delay={110}
          detail={
            metrics.overdue.length > 0 ? (
              <span className="text-danger">{metrics.overdue.length} overdue</span>
            ) : (
              'Nothing overdue — clear runway'
            )
          }
        />
        <StatCard
          label="Productivity score"
          value={
            <span className="flex items-baseline gap-1">
              {metrics.score.score}
              <span className="text-[13px] font-normal text-faint">/100</span>
            </span>
          }
          icon={Target}
          tone="brand"
          delay={150}
          detail={
            metrics.score.taskTotal > 0
              ? `${metrics.score.taskDone}/${metrics.score.taskTotal} tasks cleared · ${metrics.score.focusPart} focus pts`
              : 'Study-goal based · no tasks due'
          }
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-5">
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <PomodoroCard variant="dashboard" />
          </div>

          <section className="card card-hover animate-fade-up p-5 sm:p-6" style={{ animationDelay: '140ms' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Study rhythm</h2>
                <p className="mt-1 text-[11.5px] text-faint">Focus minutes over the last 7 days</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-display text-[20px] font-semibold leading-none text-ink">
                    {formatMinutes(metrics.weekMinutes)}
                  </p>
                  <p className="mt-1 text-[10.5px] text-faint">
                    {Math.round((metrics.weekMinutes / metrics.weekGoal) * 100)}% of weekly goal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  className="icon-btn border border-line bg-surface"
                  aria-label="Open analytics"
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <StudyBarChart data={metrics.week} height={196} />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="card animate-fade-up p-5" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Up next</h2>
                <p className="mt-1 text-[11.5px] text-faint">
                  {metrics.pending.length === 0
                    ? 'Everything is checked off'
                    : `${metrics.pending.length} open task${metrics.pending.length === 1 ? '' : 's'} · earliest deadline first`}
                </p>
              </div>
              <span className="grid size-8 place-items-center rounded-xl bg-lavender-soft text-[var(--color-lavender)]">
                <CalendarDays size={15} />
              </span>
            </div>

            <div className="mt-3">
              {metrics.plan.length === 0 ? (
                <EmptyState
                  compact
                  icon={Sparkles}
                  title="A clean slate"
                  description="Add your first task and FocusForge will keep it on your radar."
                  action={
                    <button type="button" onClick={() => setModalOpen(true)} className="btn btn-soft h-8 text-[12px]">
                      <Plus size={14} /> Add a task
                    </button>
                  }
                />
              ) : (
                <div className="-mx-1 divide-y divide-line/70">
                  {metrics.plan.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={() => handleToggle(task)} compact />
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-line px-3 py-2 text-[11.5px] font-medium text-muted transition-colors hover:border-brand/30 hover:text-brand"
            >
              View all tasks
              <ArrowUpRight size={13} />
            </button>
          </section>

          <section className="card card-hover animate-fade-up p-5" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Most studied</h2>
                <p className="mt-1 text-[11.5px] text-faint">All-time focus distribution</p>
              </div>
              <span className="grid size-8 place-items-center rounded-xl bg-brand-soft text-brand">
                <Sparkles size={15} />
              </span>
            </div>

            {metrics.subject ? (
              <>
                <p className="mt-4 font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {metrics.subject.subject}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  {formatMinutes(metrics.subject.minutes)} of focused study
                </p>
                <div className="mt-4 space-y-2.5">
                  {metrics.subjects.map((item, index) => (
                    <div key={item.subject}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate text-muted">{item.subject}</span>
                        <span className="tabular-nums text-faint">{formatMinutes(item.minutes)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div
                          className={`h-full rounded-full ${
                            index === 0 ? 'bg-brand' : 'bg-[var(--color-lavender)]'
                          }`}
                          style={{
                            width: `${Math.max(6, (item.minutes / topSubjectMinutes) * 100)}%`,
                            opacity: index === 0 ? 1 : 0.65,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-3">
                <EmptyState
                  compact
                  icon={Sparkles}
                  title="No sessions yet"
                  description="Finish a focus session and your strongest subject will show up here."
                  action={
                    <button type="button" onClick={() => onNavigate('timer')} className="btn btn-soft h-8 text-[12px]">
                      Open the timer
                    </button>
                  }
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
