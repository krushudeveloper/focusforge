import { CloudRain, Coffee, Headphones, Leaf, Music4, TimerReset, Waves } from 'lucide-react'
import { useMemo } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { PomodoroCard } from '../components/PomodoroCard'
import { useToast } from '../components/ToastProvider'
import { formatMinutes, todayKey } from '../lib/date'
import { sessionDayKey } from '../lib/stats'
import { soundEngine } from '../lib/sound'
import { useApp } from '../store/AppStore'
import { useTimer } from '../store/TimerProvider'
import { TIMER_LABELS, type Soundscape } from '../types'

const SOUNDS: { value: Soundscape; label: string; icon: typeof Waves; hint: string }[] = [
  { value: 'off', label: 'Off', icon: Music4, hint: 'Silence' },
  { value: 'rain', label: 'Rain', icon: CloudRain, hint: 'Soft rain hiss' },
  { value: 'brown', label: 'Brown noise', icon: Waves, hint: 'Deep low rumble' },
  { value: 'focus', label: 'Focus pad', icon: Leaf, hint: 'Warm ambient bed' },
]

export function TimerPage() {
  const { state, updateSettings } = useApp()
  const { toast } = useToast()
  const timer = useTimer()
  const today = todayKey()

  const sessionsToday = useMemo(
    () =>
      state.sessions
        .filter((session) => sessionDayKey(session) === today)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [state.sessions, today],
  )
  const focusedToday = sessionsToday.reduce(
    (total, session) => total + (session.mode === 'focus' ? session.minutes : 0),
    0,
  )

  function chooseSound(value: Soundscape) {
    updateSettings({ soundscape: value })
    if (value === 'off') {
      soundEngine.stop()
      return
    }
    if (timer.running) {
      soundEngine.start(value, state.settings.volume)
    } else {
      toast({
        title: `${SOUNDS.find((sound) => sound.value === value)?.label ?? 'Sound'} selected`,
        description: 'It will play while a session is running.',
        variant: 'info',
      })
    }
  }

  function changeVolume(value: number) {
    updateSettings({ volume: value })
    soundEngine.setVolume(value)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pomodoro"
        title={
          <>
            One block at a{' '}
            <span className="font-serif font-normal italic text-brand">time</span>
          </>
        }
        description="25 minutes of undistracted focus, then a short break. Every completed session is saved to your stats automatically."
        actions={
          <span className="chip h-9 gap-1.5 rounded-full border border-line bg-surface px-3.5 text-muted">
            <TimerReset size={13} className="text-brand" />
            {timer.todayFocusCount} session{timer.todayFocusCount === 1 ? '' : 's'} ·{' '}
            {formatMinutes(focusedToday)} today
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <div className="animate-fade-up">
          <PomodoroCard />
        </div>

        <div className="flex flex-col gap-5">
          <section
            className="card card-hover animate-fade-up p-5"
            style={{ animationDelay: '70ms' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Focus sound</h2>
                <p className="mt-1 text-[11.5px] leading-5 text-faint">
                  Generated live in your browser — no downloads.
                </p>
              </div>
              <span className="grid size-8 place-items-center rounded-xl bg-lavender-soft text-[var(--color-lavender)]">
                <Headphones size={15} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {SOUNDS.map(({ value, label, icon: Icon, hint }) => {
                const active = state.settings.soundscape === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseSound(value)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                      active
                        ? 'border-brand/40 bg-brand-soft text-brand shadow-sm'
                        : 'border-line bg-surface text-muted hover:border-faint/40 hover:text-ink'
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.9} />
                    <span className="text-[12px] font-medium">{label}</span>
                    <span
                      className={`text-[10px] leading-4 ${active ? 'text-brand/70' : 'text-faint'}`}
                    >
                      {hint}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
                Volume
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(state.settings.volume * 100)}
                onChange={(event) => changeVolume(Number(event.target.value) / 100)}
                aria-label="Sound volume"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-brand"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) ${
                    state.settings.volume * 100
                  }%, var(--color-line) ${state.settings.volume * 100}%)`,
                }}
              />
              <span className="w-8 text-right text-[11px] tabular-nums text-muted">
                {Math.round(state.settings.volume * 100)}%
              </span>
            </div>
          </section>

          <section className="card animate-fade-up p-5" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Today&apos;s log</h2>
                <p className="mt-1 text-[11.5px] text-faint">Recorded automatically</p>
              </div>
              <span className="chip bg-canvas text-faint ring-1 ring-line">
                {formatMinutes(focusedToday)}
              </span>
            </div>

            <div className="mt-3">
              {sessionsToday.length === 0 ? (
                <EmptyState
                  compact
                  icon={Coffee}
                  title="No sessions recorded yet"
                  description="Finish a 25 minute focus block and it will appear here instantly."
                />
              ) : (
                <ul className="-mx-1 max-h-[290px] space-y-0.5 overflow-y-auto pr-1">
                  {sessionsToday.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-canvas/70"
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                          session.mode === 'focus'
                            ? 'bg-brand-soft text-brand'
                            : 'bg-lavender-soft text-[var(--color-lavender)]'
                        }`}
                      >
                        {session.mode === 'focus' ? (
                          <Headphones size={13} />
                        ) : (
                          <Coffee size={13} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink">
                          {session.mode === 'focus' ? session.subject : TIMER_LABELS[session.mode]}
                        </p>
                        <p className="text-[10.5px] text-faint">
                          {new Date(session.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {session.mode === 'focus' ? ' · focus block' : ' · recovery'}
                        </p>
                      </div>
                      <span className="text-[11px] tabular-nums text-muted">
                        {session.minutes}m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section
            className="animate-fade-up rounded-2xl border border-line bg-lavender-soft/60 p-4"
            style={{ animationDelay: '170ms' }}
          >
            <p className="text-[11.5px] font-medium text-brand">The rhythm</p>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-5 text-muted">
              <li>25 min focus · 5 min short break</li>
              <li>After four blocks, take a 15 min long break</li>
              <li>
                Press <kbd className="rounded border border-line bg-surface px-1 text-[10px]">Space</kbd>{' '}
                to start or pause, <kbd className="rounded border border-line bg-surface px-1 text-[10px]">R</kbd> to reset
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
