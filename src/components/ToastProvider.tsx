import { AlertCircle, CheckCircle2, Info, Sparkles, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastVariant = 'success' | 'info' | 'error' | 'warning'

export type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: { label: string; onClick: () => void }
}

type ToastRecord = ToastOptions & { id: string; leaving?: boolean }

type ToastApi = {
  toast: (options: ToastOptions) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-success bg-success-soft' },
  info: { icon: Sparkles, className: 'text-brand bg-brand-soft' },
  warning: { icon: AlertCircle, className: 'text-warn bg-warn-soft' },
  error: { icon: AlertCircle, className: 'text-danger bg-danger-soft' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, number>())
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    )
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 220)
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      counter.current += 1
      const id = `toast-${counter.current}-${Date.now()}`
      setToasts((current) => [...current.slice(-3), { ...options, id }])
      const duration = options.duration ?? 4200
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
    },
    [dismiss],
  )

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2.5 sm:inset-x-auto sm:bottom-6 sm:right-6"
      >
        {toasts.map((item) => {
          const variant = item.variant ?? 'info'
          const { icon: Icon, className } = VARIANT_STYLES[variant]
          return (
            <div
              key={item.id}
              role="status"
              className={`${item.leaving ? 'translate-y-1 opacity-0' : 'animate-toast-in'} pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-lift transition-all duration-200`}
            >
              <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${className}`}>
                <Icon size={15} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-5 text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-5 text-muted">{item.description}</p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick()
                      dismiss(item.id)
                    }}
                    className="mt-2 text-xs font-semibold text-brand transition-colors hover:text-brand-deep"
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="icon-btn -mr-1 -mt-1 size-7 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
