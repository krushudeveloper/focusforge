import type { StudySession, Task } from '../types'
import { TIMER_LABELS } from '../types'

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function stamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function exportSessionsCsv(sessions: StudySession[]): void {
  const rows: (string | number)[][] = [
    ['Date', 'Started', 'Completed', 'Type', 'Subject', 'Minutes'],
    ...sessions
      .slice()
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .map((session) => [
        session.completedAt.slice(0, 10),
        new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        TIMER_LABELS[session.mode],
        session.subject,
        session.mode === 'focus' ? session.minutes : 0,
      ]),
  ]
  downloadCsv(`focusforge-sessions-${stamp()}.csv`, rows)
}

export function exportTasksCsv(tasks: Task[]): void {
  const rows: (string | number)[][] = [
    ['Title', 'Subject', 'Priority', 'Deadline', 'Status', 'Created', 'Completed'],
    ...tasks
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((task) => [
        task.title,
        task.subject,
        task.priority,
        task.deadline ?? '',
        task.completed ? 'Completed' : 'Pending',
        task.createdAt.slice(0, 10),
        task.completedAt ? task.completedAt.slice(0, 10) : '',
      ]),
  ]
  downloadCsv(`focusforge-tasks-${stamp()}.csv`, rows)
}
