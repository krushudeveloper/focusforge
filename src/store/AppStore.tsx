import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Settings, StudySession, Task, TaskDraft } from '../types'
import {
  clearState,
  createDefaultState,
  loadState,
  makeId,
  saveState,
} from '../lib/storage'

type AppStore = {
  state: AppState
  ready: boolean
  startupError: string | null
  storageError: string | null
  dismissStartupError: () => void
  addTask: (draft: TaskDraft) => Task
  updateTask: (id: string, draft: TaskDraft) => void
  toggleTask: (id: string) => boolean
  deleteTask: (id: string) => Task | null
  restoreTask: (task: Task) => void
  recordSession: (session: StudySession) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetAll: () => void
}

const AppContext = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(loadState)
  const [state, setState] = useState<AppState>(boot.state)
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(boot.error)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  // Persist on every change, surfacing write failures instead of losing them.
  useEffect(() => {
    if (!ready) return
    const error = saveState(state)
    setStorageError(error)
  }, [state, ready])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', state.settings.theme === 'dark' ? '#0D1017' : '#F8FAFC')
    }
  }, [state.settings.theme])

  // Keep multiple open tabs in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== 'focusforge.state.v1' || !event.newValue) return
      try {
        const next = JSON.parse(event.newValue) as AppState
        setState((current) => ({ ...current, ...next, version: 1 }))
      } catch {
        /* ignore malformed cross-tab payloads */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addTask = useCallback((draft: TaskDraft): Task => {
    const task: Task = {
      id: makeId(),
      title: draft.title.trim(),
      subject: draft.subject.trim() || 'General',
      deadline: draft.deadline,
      priority: draft.priority,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }))
    return task
  }, [])

  const updateTask = useCallback((id: string, draft: TaskDraft) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              title: draft.title.trim(),
              subject: draft.subject.trim() || 'General',
              deadline: draft.deadline,
              priority: draft.priority,
            }
          : task,
      ),
    }))
  }, [])

  const toggleTask = useCallback((id: string): boolean => {
    let nextCompleted = false
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== id) return task
        nextCompleted = !task.completed
        return {
          ...task,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null,
        }
      }),
    }))
    const existing = state.tasks.find((task) => task.id === id)
    return existing ? !existing.completed : nextCompleted
  }, [state.tasks])

  const deleteTask = useCallback((id: string): Task | null => {
    const removed = state.tasks.find((task) => task.id === id) ?? null
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }))
    return removed
  }, [state.tasks])

  const restoreTask = useCallback((task: Task) => {
    setState((current) =>
      current.tasks.some((t) => t.id === task.id)
        ? current
        : { ...current, tasks: [task, ...current.tasks] },
    )
  }, [])

  const recordSession = useCallback((session: StudySession) => {
    setState((current) =>
      current.sessions.some((s) => s.id === session.id)
        ? current
        : { ...current, sessions: [...current.sessions, session] },
    )
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }))
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState(createDefaultState())
  }, [])

  const value = useMemo<AppStore>(
    () => ({
      state,
      ready,
      startupError,
      storageError,
      dismissStartupError: () => {
        setStartupError(null)
        setStorageError(null)
      },
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      restoreTask,
      recordSession,
      updateSettings,
      resetAll,
    }),
    [
      state,
      ready,
      startupError,
      storageError,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      restoreTask,
      recordSession,
      updateSettings,
      resetAll,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppStore {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside <AppProvider>')
  return context
}
