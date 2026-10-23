import {
  AlertTriangle,
  Check,
  CloudRain,
  Database,
  Download,
  Headphones,
  Leaf,
  Moon,
  Music4,
  Palette,
  Play,
  Square,
  Sun,
  Target,
  Trash2,
  UserRound,
  Waves,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/ToastProvider'
import { formatMinutes } from '../lib/date'
import { exportSessionsCsv, exportTasksCsv } from '../lib/export'
import { soundEngine } from '../lib/sound'
import { useApp } from '../store/AppStore'
import { useTimer } from '../store/TimerProvider'
import type { Soundscape } from '../types'

const GOAL_PRESETS = [60, 120, 180, 240]

const SOUNDS: { value: Soundscape; label: string; icon: typeof Waves }[] = [
  { value: 'off', label: 'Off', icon: Music4 },
  { value: 'rain', label: 'Rain', icon: CloudRain },
  { value: 'brown', label: 'Brown noise', icon: Waves },
  { value: 'focus', label: 'Focus pad', icon: Leaf },
]

export function SettingsPage() {
  const { state, updateSettings, resetAll } = useApp()
  const timer = useTimer()
  const { toast } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [goalDraft, setGoalDraft] = useState(String(state.settings.dailyGoalMinutes))

  useEffect(() => {
    setGoalDraft(String(state.settings.dailyGoalMinutes))
  }, [state.settings.dailyGoalMinutes])

  useEffect(() => () => soundEngine.stop(), [])

  function commitGoal(value: string) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      setGoalDraft(String(state.settings.dailyGoalMinutes))
      return
    }
    const clamped = Math.min(720, Math.max(15, Math.round(parsed)))
    updateSettings({ dailyGoalMinutes: clamped })
    setGoalDraft(String(clamped))
  }

  const isDark = state.settings.theme === 'dark'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Make it yours"
        description="Small adjustments to how FocusForge greets you, scores your day and sounds while you work."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card animate-fade-up p-5 sm:p-6">
          <SectionHeading icon={UserRound} title="Profile" hint="Shown in your dashboard greeting" />
          <div className="mt-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft font-display text-[18px] font-semibold text-brand">
              {state.settings.name.trim().charAt(0).toUpperCase() || <UserRound size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor="settings-name" className="label">
                Your name
              </label>
              <input
                id="settings-name"
                value={state.settings.name}
                onChange={(event) => updateSettings({ name: event.target.value.slice(0, 40) })}
                placeholder="Add a name"
                className="field"
                maxLength={40}
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-faint">
            Everything stays on this device — no account, no upload.
          </p>
        </section>

        <section className="card animate-fade-up p-5 sm:p-6" style={{ animationDelay: '50ms' }}>
          <SectionHeading icon={Target} title="Study goal" hint="Drives your productivity score" />
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="settings-goal" className="label">
                Daily focus goal
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-goal"
                  type="number"
                  min={15}
                  max={720}
                  step={15}
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  onBlur={(event) => commitGoal(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitGoal(event.currentTarget.value)
                  }}
                  className="field w-24 text-center tabular-nums"
                />
                <span className="text-[12px] text-muted">minutes / day</span>
              </div>
            </div>
            <p className="pb-2 text-right text-[11px] leading-4 text-faint">
              {formatMinutes(state.settings.dailyGoalMinutes)} per day
              <br />
              {formatMinutes(state.settings.dailyGoalMinutes * 7)} per week
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {GOAL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateSettings({ dailyGoalMinutes: preset })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  state.settings.dailyGoalMinutes === preset
                    ? 'bg-brand-soft text-brand'
                    : 'bg-canvas text-faint ring-1 ring-line hover:text-ink'
                }`}
              >
                {formatMinutes(preset)}
              </button>
            ))}
          </div>
        </section>

        <section className="card animate-fade-up p-5 sm:p-6" style={{ animationDelay: '100ms' }}>
          <SectionHeading icon={Palette} title="Appearance" hint="Light is the default canvas" />
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <ThemeOption
              label="Light"
              active={!isDark}
              onClick={() => updateSettings({ theme: 'light' })}
              icon={Sun}
              previewClass="bg-[#F8FAFC] border-[#E8ECF2]"
              barClass="bg-[#E8ECF2]"
              accentClass="bg-[#4568F5]"
            />
            <ThemeOption
              label="Dark"
              active={isDark}
              onClick={() => updateSettings({ theme: 'dark' })}
              icon={Moon}
              previewClass="bg-[#0D1017] border-[#242B38]"
              barClass="bg-[#242B38]"
              accentClass="bg-[#7D95FF]"
            />
          </div>
        </section>

        <section className="card animate-fade-up p-5 sm:p-6" style={{ animationDelay: '150ms' }}>
          <SectionHeading icon={Headphones} title="Focus sound" hint="Generated in your browser" />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SOUNDS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  updateSettings({ soundscape: value })
                  if (value === 'off') {
                    soundEngine.stop()
                    setPreviewing(false)
                  }
                }}
                aria-pressed={state.settings.soundscape === value}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all ${
                  state.settings.soundscape === value
                    ? 'bg-brand-soft text-brand'
                    : 'bg-canvas text-muted ring-1 ring-line hover:text-ink'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(state.settings.volume * 100)}
              onChange={(event) => {
                const volume = Number(event.target.value) / 100
                updateSettings({ volume })
                soundEngine.setVolume(volume)
              }}
              aria-label="Preview volume"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-brand"
              style={{
                background: `linear-gradient(to right, var(--color-brand) ${
                  state.settings.volume * 100
                }%, var(--color-line) ${state.settings.volume * 100}%)`,
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (previewing) {
                  soundEngine.stop()
                  setPreviewing(false)
                  return
                }
                if (state.settings.soundscape === 'off') {
                  toast({
                    title: 'Pick a sound first',
                    description: 'Choose rain, brown noise or the focus pad to preview.',
                    variant: 'warning',
                  })
                  return
                }
                soundEngine.start(state.settings.soundscape, state.settings.volume)
                setPreviewing(true)
              }}
              className="btn btn-outline h-8 px-3 text-[11.5px]"
            >
              {previewing ? <Square size={12} /> : <Play size={12} />}
              {previewing ? 'Stop' : 'Preview'}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-faint">
            Sound plays automatically when a focus session starts. Volume {Math.round(state.settings.volume * 100)}%.
          </p>
        </section>
      </div>

      <section className="card animate-fade-up p-5 sm:p-6" style={{ animationDelay: '200ms' }}>
        <SectionHeading icon={Database} title="Your data" hint="Stored in this browser's localStorage" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-canvas/60 p-4">
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-faint">Tasks</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-ink">
              {state.tasks.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas/60 p-4">
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-faint">Sessions</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-ink">
              {state.sessions.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas/60 p-4">
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-faint">Focus logged</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-ink">
              {formatMinutes(state.sessions.reduce((total, session) => total + (session.mode === 'focus' ? session.minutes : 0), 0))}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (state.sessions.length === 0) {
                toast({ title: 'Nothing to export yet', variant: 'warning' })
                return
              }
              exportSessionsCsv(state.sessions)
              toast({ title: 'Study log exported', variant: 'success' })
            }}
            className="btn btn-outline"
          >
            <Download size={14} /> Export study log
          </button>
          <button
            type="button"
            onClick={() => {
              if (state.tasks.length === 0) {
                toast({ title: 'No tasks to export', variant: 'warning' })
                return
              }
              exportTasksCsv(state.tasks)
              toast({ title: 'Tasks exported', variant: 'success' })
            }}
            className="btn btn-outline"
          >
            <Download size={14} /> Export tasks
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-danger/20 bg-danger-soft/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="mt-0.5 text-danger" />
              <div>
                <p className="text-[12.5px] font-medium text-ink">Reset workspace</p>
                <p className="mt-1 max-w-md text-[11px] leading-5 text-muted">
                  Deletes every task, session and preference from this browser. Export a copy first
                  if you want to keep the history.
                </p>
              </div>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="btn btn-ghost h-8 px-3 text-[11.5px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    timer.reset()
                    soundEngine.stop()
                    resetAll()
                    setConfirmReset(false)
                    toast({
                      title: 'Workspace reset',
                      description: 'A clean slate is ready.',
                      variant: 'success',
                    })
                  }}
                  className="btn h-8 bg-[#C0392B] px-3 text-[11.5px] text-white hover:bg-[#A9322A]"
                >
                  Erase everything
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="btn btn-outline h-8 border-danger/30 px-3 text-[11.5px] text-danger hover:border-danger/50 hover:text-danger"
              >
                <Trash2 size={13} /> Reset
              </button>
            )}
          </div>
        </div>
      </section>

      <p className="animate-fade-up pb-2 text-center text-[11px] text-faint">
        FocusForge · study sessions, tasks and settings live only in this browser.
      </p>
    </div>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Check
  title: string
  hint: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-[11.5px] text-faint">{hint}</p>
      </div>
      <span className="grid size-8 place-items-center rounded-xl bg-canvas text-muted ring-1 ring-line">
        <Icon size={15} />
      </span>
    </div>
  )
}

function ThemeOption({
  label,
  active,
  onClick,
  icon: Icon,
  previewClass,
  barClass,
  accentClass,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: typeof Sun
  previewClass: string
  barClass: string
  accentClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border p-2.5 text-left transition-all duration-200 ${
        active ? 'border-brand/45 bg-brand-soft/60' : 'border-line hover:border-faint/40'
      }`}
    >
      <div className={`rounded-xl border p-2.5 ${previewClass}`}>
        <div className="flex items-center gap-1.5">
          <span className={`size-3 rounded-full ${accentClass}`} />
          <span className={`h-1.5 w-10 rounded-full ${barClass}`} />
        </div>
        <div className={`mt-2 h-1.5 w-16 rounded-full ${barClass}`} />
        <div className={`mt-1.5 h-1.5 w-11 rounded-full ${barClass}`} />
      </div>
      <span className="mt-2 flex items-center gap-1.5 px-0.5 text-[11.5px] font-medium text-ink">
        <Icon size={12} className={active ? 'text-brand' : 'text-faint'} />
        {label}
        {active ? <Check size={12} className="ml-auto text-brand" /> : null}
      </span>
    </button>
  )
}
