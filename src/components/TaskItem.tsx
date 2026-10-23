import { Check, Clock3, Pencil, Trash2 } from 'lucide-react'
import { deadlineLabel } from '../lib/date'
import { isOverdue } from '../lib/stats'
import { PRIORITY_LABELS, type Task } from '../types'

type Props = {
  task: Task
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
}

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  high: 'bg-danger-soft text-danger',
  medium: 'bg-warn-soft text-warn',
  low: 'bg-lavender-soft text-violet',
}

export function TaskItem({ task, onToggle, onEdit, onDelete, compact = false }: Props) {
  const overdue = isOverdue(task)
  return (
    <div
      className={`group relative flex items-start gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-200 hover:bg-canvas/80 ${
        compact ? '' : 'sm:px-3'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.completed ? `Mark “${task.title}” as pending` : `Complete “${task.title}”`}
        aria-pressed={task.completed}
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition-all duration-200 ${
          task.completed
            ? 'border-action bg-action text-white'
            : 'border-line bg-surface hover:border-brand/60 hover:bg-brand-soft'
        }`}
      >
        <Check
          size={11}
          strokeWidth={3.2}
          className={`transition-opacity duration-200 ${task.completed ? 'opacity-100' : 'opacity-0'}`}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-medium leading-5 transition-colors ${
            task.completed ? 'text-faint line-through decoration-faint/60' : 'text-ink'
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="chip bg-brand-soft text-brand">{task.subject}</span>
          <span
            className={`chip ${PRIORITY_STYLES[task.priority]} ${
              task.completed ? 'opacity-60' : ''
            }`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.deadline ? (
            <span
              className={`chip gap-1 ${
                overdue
                  ? 'bg-danger-soft text-danger'
                  : 'bg-canvas text-faint ring-1 ring-line'
              }`}
            >
              <Clock3 size={10} />
              {overdue ? `Overdue · ${deadlineLabel(task.deadline)}` : deadlineLabel(task.deadline)}
            </span>
          ) : (
            <span className="chip bg-canvas text-faint ring-1 ring-line">No deadline</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="icon-btn size-8"
            aria-label={`Edit “${task.title}”`}
          >
            <Pencil size={13.5} />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="icon-btn size-8 hover:bg-danger-soft hover:text-danger"
            aria-label={`Delete “${task.title}”`}
          >
            <Trash2 size={13.5} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
