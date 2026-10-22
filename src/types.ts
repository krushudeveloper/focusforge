export type Priority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  title: string
  subject: string
  /** Local date key (`YYYY-MM-DD`), or null when the task has no deadline. */
  deadline: string | null
  priority: Priority
  completed: boolean
  completedAt: string | null
  createdAt: string
}

export type TaskDraft = {
  title: string
  subject: string
  deadline: string | null
  priority: Priority
}

export type TimerMode = 'focus' | 'short' | 'long'

export type StudySession = {
  id: string
  mode: TimerMode
  subject: string
  /** Recorded session length in minutes. */
  minutes: number
  startedAt: string
  completedAt: string
}

export type Theme = 'light' | 'dark'

export type Soundscape = 'off' | 'rain' | 'brown' | 'focus'

export type Settings = {
  name: string
  dailyGoalMinutes: number
  theme: Theme
  soundscape: Soundscape
  volume: number
}

export type AppState = {
  version: 1
  tasks: Task[]
  sessions: StudySession[]
  settings: Settings
}

export type View = 'dashboard' | 'tasks' | 'timer' | 'analytics' | 'calendar' | 'settings'

export const TIMER_PRESETS: Record<TimerMode, number> = {
  focus: 25,
  short: 5,
  long: 15,
}

export const TIMER_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}
