import type { StudySession, Task } from '../types'
import { PRIORITY_ORDER } from '../types'
import { addDays, dateKey, parseKey, startOfWeek, todayKey } from './date'

export function sessionDayKey(session: StudySession): string {
  return dateKey(new Date(session.completedAt))
}

/** Only focus sessions count as study time — breaks are tracked separately. */
export function studyMinutes(session: StudySession): number {
  return session.mode === 'focus' ? session.minutes : 0
}

export function focusMinutesOn(sessions: StudySession[], dayKey: string): number {
  return sessions.reduce(
    (total, session) =>
      sessionDayKey(session) === dayKey ? total + studyMinutes(session) : total,
    0,
  )
}

export function focusMinutesTotal(sessions: StudySession[]): number {
  return sessions.reduce((total, session) => total + studyMinutes(session), 0)
}

export function focusMinutesInRange(
  sessions: StudySession[],
  fromKey: string,
  toKey: string,
): number {
  return sessions.reduce((total, session) => {
    const key = sessionDayKey(session)
    return key >= fromKey && key <= toKey ? total + studyMinutes(session) : total
  }, 0)
}

export function daySeries(
  sessions: StudySession[],
  days: number,
  endingAt = new Date(),
): { key: string; label: string; weekday: string; minutes: number; isToday: boolean }[] {
  const today = dateKey(endingAt)
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(endingAt, index - (days - 1))
    const key = dateKey(date)
    return {
      key,
      label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      minutes: focusMinutesOn(sessions, key),
      isToday: key === today,
    }
  })
}

export function weekdaySeries(
  sessions: StudySession[],
  weeksBack = 0,
): { key: string; label: string; minutes: number }[] {
  const start = addDays(startOfWeek(new Date()), -7 * weeksBack)
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const key = dateKey(date)
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      minutes: focusMinutesOn(sessions, key),
    }
  })
}

export function subjectBreakdown(
  sessions: StudySession[],
): { subject: string; minutes: number }[] {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    if (session.mode !== 'focus' || session.minutes <= 0) continue
    const subject = session.subject.trim() || 'Unassigned'
    totals.set(subject, (totals.get(subject) ?? 0) + session.minutes)
  }
  return [...totals.entries()]
    .map(([subject, minutes]) => ({ subject, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes)
}

export function mostStudiedSubject(
  sessions: StudySession[],
): { subject: string; minutes: number } | null {
  return subjectBreakdown(sessions)[0] ?? null
}

export function tasksCompletedOn(tasks: Task[], dayKey: string): Task[] {
  return tasks.filter(
    (task) => task.completed && task.completedAt && dateKey(new Date(task.completedAt)) === dayKey,
  )
}

export function isOverdue(task: Task, today = todayKey()): boolean {
  return !task.completed && !!task.deadline && task.deadline < today
}

export function isDueToday(task: Task, today = todayKey()): boolean {
  return !task.completed && task.deadline === today
}

export function dueSoonTasks(tasks: Task[], today = todayKey()): Task[] {
  return tasks
    .filter((task) => !task.completed && task.deadline && task.deadline <= today)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
}

/**
 * Productivity score for a single day (0–100).
 *
 * 60% — progress toward the daily study goal (focus minutes / goal).
 * 40% — completion of the day's task board: tasks due on/before that day,
 *       plus anything completed that day.
 * If the board is empty the score comes from study time alone.
 */
export function productivityScore(
  tasks: Task[],
  sessions: StudySession[],
  dayKey: string,
  dailyGoalMinutes: number,
): { score: number; focusPart: number; taskPart: number; focusMinutes: number; taskTotal: number; taskDone: number } {
  const focusMinutes = focusMinutesOn(sessions, dayKey)
  const goal = Math.max(15, dailyGoalMinutes)
  const focusRatio = Math.min(1, focusMinutes / goal)

  const board = tasks.filter((task) => {
    const completedOnDay =
      task.completed && task.completedAt && dateKey(new Date(task.completedAt)) === dayKey
    const dueByDay = !!task.deadline && task.deadline <= dayKey
    return completedOnDay || dueByDay
  })
  const taskDone = board.filter((task) => task.completed).length

  if (board.length === 0) {
    return {
      score: Math.round(focusRatio * 100),
      focusPart: Math.round(focusRatio * 100),
      taskPart: 0,
      focusMinutes,
      taskTotal: 0,
      taskDone: 0,
    }
  }

  const taskRatio = taskDone / board.length
  const focusPart = focusRatio * 60
  const taskPart = taskRatio * 40
  return {
    score: Math.round(focusPart + taskPart),
    focusPart: Math.round(focusPart),
    taskPart: Math.round(taskPart),
    focusMinutes,
    taskTotal: board.length,
    taskDone,
  }
}

/** Consecutive days with at least one focus session, anchored on today. */
export function currentStreak(sessions: StudySession[]): number {
  const studied = new Set(
    sessions.filter((session) => studyMinutes(session) > 0).map(sessionDayKey),
  )
  let cursor = new Date()
  if (!studied.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1)
  }
  let streak = 0
  while (studied.has(dateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(sessions: StudySession[]): number {
  const days = [...new Set(sessions.filter((s) => studyMinutes(s) > 0).map(sessionDayKey))].sort()
  let best = 0
  let run = 0
  let previous: string | null = null
  for (const day of days) {
    if (previous && Math.round((parseKey(day).getTime() - parseKey(previous).getTime()) / 86_400_000) === 1) {
      run += 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    previous = day
  }
  return best
}

export function sortTasks(tasks: Task[], sort: 'priority' | 'deadline' | 'created'): Task[] {
  const copy = [...tasks]
  if (sort === 'priority') {
    return copy.sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31'),
    )
  }
  if (sort === 'deadline') {
    return copy.sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31') ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    )
  }
  return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
