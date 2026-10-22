import { Coffee, Flame, Pause, Play, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useApp } from '../store/AppStore'
import { useTimer } from '../store/TimerProvider'
import { TIMER_LABELS, TIMER_PRESETS, type TimerMode } from '../types'
import { formatClock, formatMinutes, todayKey } from '../lib/date'
import { focusMinutesOn } from '../lib/stats'
import { soundEngine } from '../lib/sound'
import { useToast } from './ToastProvider'
import { ProgressRing } from './ProgressRing'

const MODES: TimerMode[] = ['focus', 'short', 'long']

const MODE_DOT: Record<TimerMode, string> = {
  focus: 'bg-brand',
  short: 'bg-success',
  long: 'bg-[var(--color-lavender)]',
}

const RING_COLORS: Record<TimerMode, { from: string; to: string }> = {
  focus: { from: 'var(--color-brand)', to: 'var(--color-lavender)' },
  short: { from: 'var(--color-success)', to: 'var(--color-lavender)' },
  long: { from: 'var(--color-lavender)', to: 'var(--color-brand)' },
}

export function PomodoroCard({ variant = 'page' }: { variant?: 'page' | 'dashboard' }) {
  const { state } = useApp()
  const { toast } = useToast()
  const timer = useTimer()
  const today = todayKey()
  const minutesToday = focusMinutesOn(state.sessions, today)
  const secondsLeft = Math.ceil(timer.remainingMs / 1000)

  const subjects = useMemo(() => {
    const set = new Set<string>(['General'])
    for (const task of state.tasks) if (task.subject) set.add(task.subject)
    for (const session of state.sessions) if (session.subject) set.add(session.subject)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [state.tasks, state.sessions])

  const toggle = () => {
    if (timer.running) {
      timer.pause()
    } else {
      timer.start()
      if (state.settings.soundscape !== 'off') {
        soundEngine.start(state.settings.soundscape, state.settings.volume)
      }
    }
  }

  // Keyboard shortcuts for the live timer. Ignored while typing in a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        toggle()
      }
      if (event.key.toLowerCase() === 'r') {
        timer.reset()
        toast({ title: 'Timer reset', description: `${TIMER_LABELS[timer.mode]} timer is back to full.`, variant: 'info' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const ringSize = variant === 'dashboard' ? 300 : 340

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-5 shadow-timer sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand-soft opacity-80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-lavender-soft opacity-80 blur-3xl"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Timer mode"
            className="inline-flex items-center gap-0.5 rounded-full bg-canvas p-1 ring-1 ring-line/70"
          >
            {MODES.map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={timer.mode === mode}
                type="button"
                onClick={() => timer.setMode(mode)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all duration-200 ${
                  timer.mode === mode
                    ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(23,32,51,0.10)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <span className={`size-1.5 rounded-full ${timer.mode === mode ? MODE_DOT[mode] : 'bg-faint/50'}`} />
                {TIMER_LABELS[mode]}
              </button>
            ))}
          </div>

          <span className="chip border border-line bg-surface/80 text-muted">
            <Flame size={12} className="text-[var(--color-lavender)]" />
            {timer.mode === 'long'
              ? 'Long break earned'
              : `${(timer.focusSinceLongBreak % 4) + 1} of 4 before a long break`}
          </span>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <ProgressRing
              progress={timer.progress}
              size={ringSize}
              strokeWidth={variant === 'dashboard' ? 8 : 9}
              from={RING_COLORS[timer.mode].from}
              to={RING_COLORS[timer.mode].to}
              className="max-w-full"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
                {timer.mode === 'focus'
                  ? timer.running
                    ? 'Deep focus'
                    : 'Ready to focus'
                  : TIMER_LABELS[timer.mode]}
              </span>
              <span
                className="mt-2 font-display text-[62px] font-light leading-none tracking-[-0.04em] text-ink tabular-nums sm:text-[74px]"
                aria-live="off"
              >
                {formatClock(secondsLeft)}
              </span>
              <div className="mt-3">
                <input
                  aria-label="Subject for this session"
                  list="timer-subjects"
                  value={timer.subject}
                  maxLength={24}
                  onChange={(event) => timer.setSubject(event.target.value.slice(0, 24))}
                  onFocus={(event) => event.currentTarget.select()}
                  placeholder="Subject"
                  className="h-7 w-[124px] rounded-full border border-line bg-surface/70 px-3 text-center text-[11.5px] font-medium text-muted transition-colors placeholder:text-faint hover:border-brand/40 focus:border-brand/50 focus:text-ink focus:outline-none"
                />
                <datalist id="timer-subjects">
                  {subjects.map((subject) => (
                    <option key={subject} value={subject} />
                  ))}
                </datalist>
              </div>
            </ProgressRing>
          </div>

          <div className="mt-6 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                timer.reset()
                soundEngine.stop()
              }}
              className="icon-btn size-11 rounded-full border border-line bg-surface text-muted hover:text-ink"
              aria-label="Reset timer"
              title="Reset (R)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={toggle}
              className="btn btn-primary h-12 min-w-[152px] rounded-full px-7 text-[13.5px] shadow-[0_16px_30px_-16px_rgba(69,104,245,0.9)]"
            >
              {timer.running ? (
                <>
                  <Pause size={16} strokeWidth={2.4} /> Pause
                </>
              ) : (
                <>
                  <Play size={16} strokeWidth={2.4} className="translate-x-px" />
                  {timer.remainingMs < timer.totalMs ? 'Resume' : `Start ${timer.mode === 'focus' ? 'focus' : 'break'}`}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={timer.skip}
              className="icon-btn size-11 rounded-full border border-line bg-surface text-muted hover:text-ink"
              aria-label="Skip to next session"
              title="Skip"
            >
              <SkipForward size={16} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand" />
              {timer.todayFocusCount} session{timer.todayFocusCount === 1 ? '' : 's'} today
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="inline-flex items-center gap-1.5">
              <Coffee size={12} className="text-[var(--color-lavender)]" />
              {formatMinutes(minutesToday)} focused
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="tabular-nums">{TIMER_PRESETS[timer.mode]} min block</span>
          </div>
        </div>
      </div>
    </section>
  )
}
