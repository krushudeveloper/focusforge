import type { AppState, Priority, Settings, StudySession, Task, TimerMode } from '../types'
import { TIMER_PRESETS } from '../types'

const STATE_KEY = 'focusforge.state.v1'
const TIMER_KEY = 'focusforge.timer.v1'

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  dailyGoalMinutes: 120,
  theme: 'light',
  soundscape: 'off',
  volume: 0.35,
}

export function createDefaultState(): AppState {
  return {
    version: 1,
    tasks: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function sanitizeSettings(raw: unknown): Settings {
  const value = (raw ?? {}) as Partial<Settings>
  return {
    name: typeof value.name === 'string' ? value.name.slice(0, 60) : DEFAULT_SETTINGS.name,
    dailyGoalMinutes:
      typeof value.dailyGoalMinutes === 'number' && value.dailyGoalMinutes >= 15
        ? Math.min(720, Math.round(value.dailyGoalMinutes))
        : DEFAULT_SETTINGS.dailyGoalMinutes,
    theme: value.theme === 'dark' ? 'dark' : 'light',
    soundscape:
      value.soundscape === 'rain' || value.soundscape === 'brown' || value.soundscape === 'focus'
        ? value.soundscape
        : 'off',
    volume:
      typeof value.volume === 'number' && value.volume >= 0 && value.volume <= 1
        ? value.volume
        : DEFAULT_SETTINGS.volume,
  }
}

function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<Task>
  if (typeof value.id !== 'string' || typeof value.title !== 'string' || !value.title.trim()) {
    return null
  }
  return {
    id: value.id,
    title: value.title.slice(0, 160),
    subject: typeof value.subject === 'string' ? value.subject.slice(0, 40) : 'General',
    deadline: typeof value.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.deadline)
      ? value.deadline
      : null,
    priority: isPriority(value.priority) ? value.priority : 'medium',
    completed: value.completed === true,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  }
}

function sanitizeSession(raw: unknown): StudySession | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<StudySession>
  if (typeof value.id !== 'string' || typeof value.completedAt !== 'string') return null
  if (typeof value.minutes !== 'number' || !Number.isFinite(value.minutes) || value.minutes <= 0) {
    return null
  }
  return {
    id: value.id,
    mode: value.mode === 'short' || value.mode === 'long' ? value.mode : 'focus',
    subject: typeof value.subject === 'string' ? value.subject.slice(0, 40) : 'General',
    minutes: Math.min(600, value.minutes),
    startedAt: typeof value.startedAt === 'string' ? value.startedAt : value.completedAt,
    completedAt: value.completedAt,
  }
}

export type LoadResult = {
  state: AppState
  error: string | null
}

export function loadState(): LoadResult {
  if (typeof localStorage === 'undefined') {
    return { state: createDefaultState(), error: null }
  }
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STATE_KEY)
  } catch {
    return {
      state: createDefaultState(),
      error: 'Storage is blocked in this browser, so progress will not be saved.',
    }
  }
  if (!raw) return { state: createDefaultState(), error: null }

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>
    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.map(sanitizeTask).filter((task): task is Task => task !== null)
      : []
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.map(sanitizeSession).filter((s): s is StudySession => s !== null)
      : []
    return {
      state: { version: 1, tasks, sessions, settings: sanitizeSettings(parsed.settings) },
      error: null,
    }
  } catch {
    return {
      state: createDefaultState(),
      error: 'Saved data could not be read. FocusForge started with a clean workspace.',
    }
  }
}

export function saveState(state: AppState): string | null {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
    return null
  } catch {
    return 'Could not save to localStorage — your browser storage may be full or disabled.'
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STATE_KEY)
    localStorage.removeItem(TIMER_KEY)
  } catch {
    /* storage may be unavailable */
  }
}

/* ---- Timer persistence -------------------------------------------------- */

export type PersistedTimer = {
  mode: TimerMode
  /** Epoch ms when the running countdown ends. */
  endsAt: number | null
  /** Remaining ms while paused. */
  remainingMs: number
  running: boolean
  subject: string
  startedAt: string | null
  /** Total focus sessions completed today before this one (cycle position). */
  focusSinceLongBreak: number
}

export function loadTimer(): PersistedTimer {
  const fallback: PersistedTimer = {
    mode: 'focus',
    endsAt: null,
    remainingMs: TIMER_PRESETS.focus * 60_000,
    running: false,
    subject: 'General',
    startedAt: null,
    focusSinceLongBreak: 0,
  }
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<PersistedTimer>
    const mode: TimerMode =
      parsed.mode === 'short' || parsed.mode === 'long' ? parsed.mode : 'focus'
    const presetMs = TIMER_PRESETS[mode] * 60_000
    return {
      mode,
      endsAt: typeof parsed.endsAt === 'number' ? parsed.endsAt : null,
      remainingMs:
        typeof parsed.remainingMs === 'number' && parsed.remainingMs > 0
          ? Math.min(parsed.remainingMs, presetMs)
          : presetMs,
      running: parsed.running === true,
      subject: typeof parsed.subject === 'string' ? parsed.subject : 'General',
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
      focusSinceLongBreak:
        typeof parsed.focusSinceLongBreak === 'number' ? parsed.focusSinceLongBreak : 0,
    }
  } catch {
    return fallback
  }
}

export function saveTimer(timer: PersistedTimer): void {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer))
  } catch {
    /* ignore */
  }
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
