import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Flame,
  LayoutDashboard,
  ListChecks,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Timer as TimerIcon,
  UserRound,
  X,
} from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../store/AppStore'
import { currentStreak } from '../lib/stats'
import { todayKey } from '../lib/date'
import type { View } from '../types'

export const NAV_ITEMS: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'tasks', label: 'Tasks', icon: ListChecks },
  { view: 'timer', label: 'Focus timer', icon: TimerIcon },
  { view: 'analytics', label: 'Analytics', icon: BarChart3 },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
]

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-[0_8px_18px_-10px_rgba(69,104,245,0.9)]">
        <Flame size={17} strokeWidth={2.2} />
      </span>
      {!compact ? (
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-[-0.02em] text-ink">
            FocusForge
          </p>
          <p className="text-[10.5px] tracking-wide text-faint">Study with intent</p>
        </div>
      ) : null}
    </div>
  )
}

type Props = {
  view: View
  onNavigate: (view: View) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ view, onNavigate, mobileOpen, onCloseMobile }: Props) {
  const { state, updateSettings } = useApp()
  const streak = useMemo(() => currentStreak(state.sessions), [state.sessions])
  const pending = state.tasks.filter((task) => !task.completed).length
  const overdue = state.tasks.filter(
    (task) => !task.completed && task.deadline && task.deadline < todayKey(),
  ).length

  const isDark = state.settings.theme === 'dark'
  const initial = state.settings.name.trim().charAt(0).toUpperCase()

  const nav = (
    <>
      <div className="px-1">
        <Brand />
      </div>

      <nav aria-label="Main navigation" className="mt-8 flex flex-1 flex-col gap-1">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Workspace
        </p>
        {NAV_ITEMS.map(({ view: target, label, icon: Icon }) => (
          <button
            key={target}
            type="button"
            data-active={view === target}
            onClick={() => {
              onNavigate(target)
              onCloseMobile()
            }}
            className="nav-item group text-left"
          >
            <Icon size={17} strokeWidth={1.9} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {target === 'tasks' && pending > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  overdue > 0
                    ? 'bg-danger-soft text-danger'
                    : 'bg-canvas text-faint group-data-[active=true]:bg-surface group-data-[active=true]:text-brand'
                }`}
              >
                {pending}
              </span>
            ) : null}
            {target === 'timer' ? (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-faint">
                25m
              </span>
            ) : null}
          </button>
        ))}

        <div className="my-3 h-px bg-line" />

        <button
          type="button"
          data-active={view === 'settings'}
          onClick={() => {
            onNavigate('settings')
            onCloseMobile()
          }}
          className="nav-item text-left"
        >
          <SettingsIcon size={17} strokeWidth={1.9} className="shrink-0" />
          <span className="flex-1">Settings</span>
        </button>
      </nav>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => {
            onNavigate('analytics')
            onCloseMobile()
          }}
          className="group w-full rounded-2xl border border-line bg-lavender-soft/70 p-3.5 text-left transition-all duration-200 hover:border-[var(--color-lavender)]/50 hover:shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand">
              <Flame size={13} /> Study streak
            </span>
            <ChevronRight
              size={13}
              className="text-brand/60 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </div>
          <p className="mt-1.5 font-display text-[22px] font-semibold leading-none text-ink">
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted">
            {streak === 0
              ? 'Finish one focus session to start.'
              : 'Keep it going with one session today.'}
          </p>
        </button>

        <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 p-1">
          <button
            type="button"
            onClick={() => updateSettings({ theme: 'light' })}
            aria-pressed={!isDark}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11.5px] font-medium transition-all ${
              !isDark ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            <Sun size={13} /> Light
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ theme: 'dark' })}
            aria-pressed={isDark}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11.5px] font-medium transition-all ${
              isDark ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            <Moon size={13} /> Dark
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate('settings')
            onCloseMobile()
          }}
          className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-canvas"
        >
          <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">
            {initial || <UserRound size={15} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-ink">
              {state.settings.name || 'Set your name'}
            </span>
            <span className="block truncate text-[10.5px] text-faint">
              {state.settings.name ? 'Personal workspace' : 'Personalise your dashboard'}
            </span>
          </span>
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col overflow-y-auto border-r border-line bg-surface px-4 py-6 lg:flex">
        {nav}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 dark:bg-black/60 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[280px] flex-col overflow-y-auto border-r border-line bg-surface px-4 py-5 transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="icon-btn absolute right-3 top-4"
          >
            <X size={17} />
          </button>
          {nav}
        </aside>
      </div>
    </>
  )
}
