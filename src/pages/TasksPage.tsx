import { ArrowDownUp, ListChecks, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { TaskFormModal } from '../components/TaskFormModal'
import { TaskItem } from '../components/TaskItem'
import { useToast } from '../components/ToastProvider'
import { todayKey } from '../lib/date'
import { isOverdue, sortTasks } from '../lib/stats'
import { useApp } from '../store/AppStore'
import type { Task } from '../types'

type Filter = 'all' | 'pending' | 'completed' | 'overdue'
type Sort = 'priority' | 'deadline' | 'created'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
]

const SORT_LABELS: Record<Sort, string> = {
  priority: 'Priority',
  deadline: 'Deadline',
  created: 'Newest',
}

const EMPTY_COPY: Record<Filter, { title: string; description: string }> = {
  all: {
    title: 'No tasks yet',
    description: 'Add the next thing you want to study and it will show up here.',
  },
  pending: {
    title: 'Nothing pending',
    description: 'Every task is checked off. Take the win, or plan the next block.',
  },
  completed: {
    title: 'No completed tasks',
    description: 'Finish a task and it will move here with the date you closed it.',
  },
  overdue: {
    title: 'Nothing overdue',
    description: 'Your deadlines are under control. Keep it that way.',
  },
}

export function TasksPage() {
  const { state, toggleTask, deleteTask, restoreTask } = useApp()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('pending')
  const [sort, setSort] = useState<Sort>('priority')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const today = todayKey()

  const counts = useMemo(
    () => ({
      all: state.tasks.length,
      pending: state.tasks.filter((task) => !task.completed).length,
      completed: state.tasks.filter((task) => task.completed).length,
      overdue: state.tasks.filter((task) => isOverdue(task, today)).length,
    }),
    [state.tasks, today],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = state.tasks.filter((task) => {
      if (filter === 'pending' && task.completed) return false
      if (filter === 'completed' && !task.completed) return false
      if (filter === 'overdue' && !isOverdue(task, today)) return false
      if (!needle) return true
      return (
        task.title.toLowerCase().includes(needle) || task.subject.toLowerCase().includes(needle)
      )
    })
    return sortTasks(filtered, sort)
  }, [state.tasks, filter, sort, query, today])

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function handleToggle(task: Task) {
    const completing = !task.completed
    toggleTask(task.id)
    if (completing) {
      toast({
        title: 'Task completed',
        description: task.title,
        variant: 'success',
        action: { label: 'Undo', onClick: () => toggleTask(task.id) },
      })
    }
  }

  function handleDelete(task: Task) {
    const removed = deleteTask(task.id)
    if (!removed) return
    toast({
      title: 'Task deleted',
      description: removed.title,
      variant: 'warning',
      action: { label: 'Undo', onClick: () => restoreTask(removed) },
      duration: 6000,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Task manager"
        title="Plan the work"
        description="Every task carries a subject, a deadline and a priority, so the next right thing is always obvious."
        actions={
          <button type="button" onClick={openNew} className="btn btn-primary">
            <Plus size={15} /> New task
          </button>
        }
      />

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                  filter === item.value
                    ? 'bg-brand-soft text-brand'
                    : 'text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    filter === item.value ? 'bg-surface/80 text-brand' : 'bg-canvas text-faint'
                  }`}
                >
                  {counts[item.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tasks or subjects"
                aria-label="Search tasks"
                className="field h-9 w-full pl-9 sm:w-56"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal
                size={13.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Sort tasks"
                className="field h-9 w-[132px] cursor-pointer appearance-none pl-9 pr-7 text-[12px]"
              >
                {(Object.keys(SORT_LABELS) as Sort[]).map((value) => (
                  <option key={value} value={value}>
                    Sort: {SORT_LABELS[value]}
                  </option>
                ))}
              </select>
              <ArrowDownUp
                size={12}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[11px] text-faint">
          <span>
            {visible.length} task{visible.length === 1 ? '' : 's'} shown
            {counts.overdue > 0 ? (
              <>
                {' · '}
                <span className="text-danger">{counts.overdue} overdue</span>
              </>
            ) : null}
          </span>
          <span className="hidden sm:inline">
            Tip: press <kbd className="rounded border border-line bg-canvas px-1">Space</kbd> on the
            timer to start or pause
          </span>
        </div>
      </section>

      <section className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={ListChecks}
              title={query ? 'No matches' : EMPTY_COPY[filter].title}
              description={
                query
                  ? `Nothing matches “${query}”. Try a different word or clear the search.`
                  : EMPTY_COPY[filter].description
              }
              action={
                query || filter === 'completed' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setFilter('all')
                    }}
                    className="btn btn-outline h-9"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button type="button" onClick={openNew} className="btn btn-soft h-9">
                    <Plus size={14} /> Add a task
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {visible.map((task) => (
              <div key={task.id} className="px-1.5 sm:px-2">
                <TaskItem
                  task={task}
                  onToggle={() => handleToggle(task)}
                  onEdit={() => {
                    setEditing(task)
                    setModalOpen(true)
                  }}
                  onDelete={() => handleDelete(task)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <TaskFormModal
        open={modalOpen}
        task={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
