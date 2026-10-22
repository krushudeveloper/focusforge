import { CalendarDays, Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { addDays, dateKey, todayKey } from '../lib/date'
import { useApp } from '../store/AppStore'
import { PRIORITY_LABELS, type Priority, type Task } from '../types'
import { useToast } from './ToastProvider'

type Props = {
  open: boolean
  task?: Task | null
  onClose: () => void
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

const PRIORITY_ACTIVE: Record<Priority, string> = {
  low: 'border-[var(--color-lavender)]/60 bg-lavender-soft text-[var(--color-lavender)]',
  medium: 'border-warn/40 bg-warn-soft text-warn',
  high: 'border-danger/40 bg-danger-soft text-danger',
}

export function TaskFormModal({ open, task, onClose }: Props) {
  const { state, addTask, updateTask } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('General')
  const [deadline, setDeadline] = useState<string>(todayKey())
  const [priority, setPriority] = useState<Priority>('medium')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setSubject(task?.subject ?? 'General')
    setDeadline(task?.deadline ?? todayKey())
    setPriority(task?.priority ?? 'medium')
    setError(null)
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(focusTimer)
  }, [open, task])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const subjects = useMemo(() => {
    const set = new Set<string>(['General'])
    for (const item of state.tasks) if (item.subject) set.add(item.subject)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [state.tasks])

  if (!open) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed.length < 2) {
      setError('Add a task name with at least two characters.')
      inputRef.current?.focus()
      return
    }
    const draft = {
      title: trimmed,
      subject: subject.trim() || 'General',
      deadline: deadline || null,
      priority,
    }
    if (task) {
      updateTask(task.id, draft)
      toast({ title: 'Task updated', description: trimmed, variant: 'success' })
    } else {
      addTask(draft)
      toast({ title: 'Task added', description: trimmed, variant: 'success' })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px] dark:bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="animate-pop relative w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-lift sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
              {task ? 'Edit task' : 'New task'}
            </p>
            <h2 id="task-dialog-title" className="mt-1 text-[18px] font-semibold text-ink">
              {task ? 'Refine the details' : 'What needs your attention?'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-1 -mt-1" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="task-title" className="label">
              Task
            </label>
            <input
              ref={inputRef}
              id="task-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value.slice(0, 120))
                if (error) setError(null)
              }}
              placeholder="e.g. Finish Chapter 7 problem set"
              className={`field ${error ? 'border-danger/60' : ''}`}
              aria-invalid={!!error}
              aria-describedby={error ? 'task-title-error' : undefined}
            />
            {error ? (
              <p id="task-title-error" className="mt-1.5 text-[11.5px] text-danger">
                {error}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-subject" className="label">
                Subject
              </label>
              <input
                id="task-subject"
                value={subject}
                list="subject-suggestions"
                onChange={(event) => setSubject(event.target.value.slice(0, 30))}
                placeholder="Mathematics"
                className="field"
              />
              <datalist id="subject-suggestions">
                {subjects.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="task-deadline" className="label">
                Deadline
              </label>
              <div className="relative">
                <input
                  id="task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="field pr-9"
                />
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <QuickDate label="Today" date={todayKey()} onPick={setDeadline} active={deadline === todayKey()} />
            <QuickDate
              label="Tomorrow"
              date={dateKey(addDays(new Date(), 1))}
              onPick={setDeadline}
              active={deadline === dateKey(addDays(new Date(), 1))}
            />
            <button
              type="button"
              onClick={() => setDeadline('')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                deadline === ''
                  ? 'bg-brand-soft text-brand'
                  : 'bg-canvas text-faint ring-1 ring-line hover:text-ink'
              }`}
            >
              No deadline
            </button>
          </div>

          <div>
            <span className="label">Priority</span>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  aria-pressed={priority === value}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-medium transition-all ${
                    priority === value
                      ? PRIORITY_ACTIVE[value]
                      : 'border-line bg-surface text-muted hover:border-faint/40 hover:text-ink'
                  }`}
                >
                  {priority === value ? <Check size={12} strokeWidth={3} /> : null}
                  {PRIORITY_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary px-5">
              {task ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuickDate({
  label,
  date,
  active,
  onPick,
}: {
  label: string
  date: string
  active: boolean
  onPick: (value: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(date)}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? 'bg-brand-soft text-brand'
          : 'bg-canvas text-faint ring-1 ring-line hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
