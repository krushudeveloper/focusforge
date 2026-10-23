import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { StudySession, TimerMode } from '../types'
import { TIMER_PRESETS } from '../types'
import { loadTimer, makeId, saveTimer, type PersistedTimer } from '../lib/storage'
import { soundEngine } from '../lib/sound'
import { useApp } from './AppStore'
import { useToast } from '../components/ToastProvider'

const PRESET_MS = (mode: TimerMode) => TIMER_PRESETS[mode] * 60_000
const BASE_TITLE = 'FocusForge — Study with intent'

type TimerApi = {
  mode: TimerMode
  running: boolean
  remainingMs: number
  totalMs: number
  progress: number
  subject: string
  focusSinceLongBreak: number
  todayFocusCount: number
  start: () => void
  pause: () => void
  reset: () => void
  setMode: (mode: TimerMode) => void
  skip: () => void
  setSubject: (subject: string) => void
}

const TimerContext = createContext<TimerApi | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const { state, recordSession } = useApp()
  const { toast } = useToast()
  const [timer, setTimer] = useState<PersistedTimer>(() => loadTimer())
  const [now, setNow] = useState(() => Date.now())
  const completing = useRef(false)

  useEffect(() => {
    saveTimer(timer)
  }, [timer])

  useEffect(() => {
    if (!timer.running) return
    const interval = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(interval)
  }, [timer.running])

  const remainingMs = useMemo(() => {
    if (timer.running && timer.endsAt) return Math.max(0, timer.endsAt - now)
    return timer.remainingMs
  }, [timer.running, timer.endsAt, timer.remainingMs, now])

  const totalMs = PRESET_MS(timer.mode)
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs))
  const todayKeyString = new Date().toDateString()
  const todayFocusCount = state.sessions.filter(
    (session) =>
      session.mode === 'focus' && new Date(session.completedAt).toDateString() === todayKeyString,
  ).length

  const finish = useCallback(() => {
    if (completing.current) return
    completing.current = true

    const completedMode = timer.mode
    const startedAt =
      timer.startedAt ?? new Date(Date.now() - PRESET_MS(completedMode)).toISOString()
    const wasFocus = completedMode === 'focus'

    if (wasFocus) {
      // Attribute the session to the moment the block actually ended, even if the
      // tick (or a return to a closed tab) is a little late.
      const endedAt = new Date(Math.min(Date.now(), timer.endsAt ?? Date.now())).toISOString()
      const session: StudySession = {
        id: makeId(),
        mode: 'focus',
        subject: timer.subject.trim() || 'General',
        minutes: TIMER_PRESETS.focus,
        startedAt,
        completedAt: endedAt,
      }
      recordSession(session)
    }

    soundEngine.stop()
    soundEngine.chime(wasFocus ? 'focus' : 'break')

    const nextCount = wasFocus ? timer.focusSinceLongBreak + 1 : timer.focusSinceLongBreak
    const nextMode: TimerMode = wasFocus ? (nextCount % 4 === 0 ? 'long' : 'short') : 'focus'

    setTimer({
      mode: nextMode,
      running: false,
      endsAt: null,
      remainingMs: PRESET_MS(nextMode),
      subject: timer.subject,
      startedAt: null,
      focusSinceLongBreak: nextCount,
    })
    setNow(Date.now())

    if (wasFocus) {
      toast({
        title: `${TIMER_PRESETS.focus} minutes of focus logged`,
        description:
          nextMode === 'long'
            ? 'Four sessions done — take a 15 minute long break.'
            : 'Nice work. A 5 minute break will keep the next sprint sharp.',
        variant: 'success',
        action: {
          label: 'Start break',
          onClick: () => {
            setTimer((current) => ({
              ...current,
              running: true,
              endsAt: Date.now() + current.remainingMs,
              startedAt: new Date().toISOString(),
            }))
          },
        },
        duration: 6500,
      })
    } else {
      toast({
        title: 'Break finished',
        description: 'Ready for another focus session?',
        variant: 'info',
      })
    }
    completing.current = false
  }, [timer, recordSession, toast])

  useEffect(() => {
    if (!timer.running || !timer.endsAt) return
    if (now < timer.endsAt) return
    // Ignore a stale countdown that ended long ago (e.g. tab closed for days).
    if (timer.endsAt < Date.now() - 6 * 60 * 60_000) {
      setTimer((current) => ({
        ...current,
        mode: 'focus',
        running: false,
        endsAt: null,
        remainingMs: PRESET_MS('focus'),
        startedAt: null,
      }))
      return
    }
    finish()
  }, [now, timer.running, timer.endsAt, finish])

  const start = useCallback(() => {
    setTimer((current) => {
      if (current.running) return current
      const remaining = current.endsAt
        ? Math.max(0, current.endsAt - Date.now())
        : current.remainingMs
      return {
        ...current,
        running: true,
        startedAt: current.startedAt ?? new Date().toISOString(),
        endsAt: Date.now() + (remaining > 0 ? remaining : PRESET_MS(current.mode)),
        remainingMs: remaining > 0 ? remaining : PRESET_MS(current.mode),
      }
    })
    setNow(Date.now())
    if (state.settings.soundscape !== 'off') {
      soundEngine.start(state.settings.soundscape, state.settings.volume)
    }
  }, [state.settings.soundscape, state.settings.volume])

  const pause = useCallback(() => {
    setTimer((current) => ({
      ...current,
      running: false,
      remainingMs: current.endsAt
        ? Math.max(0, current.endsAt - Date.now())
        : current.remainingMs,
      endsAt: null,
    }))
    soundEngine.stop()
  }, [])

  const reset = useCallback(() => {
    setTimer((current) => ({
      ...current,
      running: false,
      endsAt: null,
      remainingMs: PRESET_MS(current.mode),
      startedAt: null,
    }))
    soundEngine.stop()
  }, [])

  const setMode = useCallback((mode: TimerMode) => {
    setTimer((current) => ({
      ...current,
      mode,
      running: false,
      endsAt: null,
      remainingMs: PRESET_MS(mode),
      startedAt: null,
    }))
    soundEngine.stop()
  }, [])

  const skip = useCallback(() => {
    setTimer((current) => {
      const nextMode: TimerMode = current.mode === 'focus' ? 'short' : 'focus'
      return {
        ...current,
        mode: nextMode,
        running: false,
        endsAt: null,
        remainingMs: PRESET_MS(nextMode),
        startedAt: null,
      }
    })
    soundEngine.stop()
  }, [])

  const setSubject = useCallback((subject: string) => {
    setTimer((current) => ({ ...current, subject }))
  }, [])

  // Reflect the countdown in the tab title while a session is live.
  useEffect(() => {
    if (!timer.running) return
    const seconds = Math.ceil(remainingMs / 1000)
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
    const ss = String(seconds % 60).padStart(2, '0')
    document.title = `${mm}:${ss} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} — FocusForge`
    return () => {
      document.title = BASE_TITLE
    }
  }, [timer.running, timer.mode, remainingMs])

  const value = useMemo<TimerApi>(
    () => ({
      mode: timer.mode,
      running: timer.running,
      remainingMs,
      totalMs,
      progress,
      subject: timer.subject,
      focusSinceLongBreak: timer.focusSinceLongBreak,
      todayFocusCount,
      start,
      pause,
      reset,
      setMode,
      skip,
      setSubject,
    }),
    [
      timer.mode,
      timer.running,
      timer.subject,
      timer.focusSinceLongBreak,
      remainingMs,
      totalMs,
      progress,
      todayFocusCount,
      start,
      pause,
      reset,
      setMode,
      skip,
      setSubject,
    ],
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerApi {
  const context = useContext(TimerContext)
  if (!context) throw new Error('useTimer must be used inside <TimerProvider>')
  return context
}
