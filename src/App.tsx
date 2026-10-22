import { AlertTriangle, Menu, Moon, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Brand, Sidebar } from './components/Sidebar'
import { ToastProvider } from './components/ToastProvider'
import { AppProvider, useApp } from './store/AppStore'
import { TimerProvider } from './store/TimerProvider'
import { Dashboard } from './pages/Dashboard'
import { TasksPage } from './pages/TasksPage'
import { TimerPage } from './pages/TimerPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import type { View } from './types'

const VIEWS: View[] = ['dashboard', 'tasks', 'timer', 'analytics', 'calendar', 'settings']

function viewFromHash(): View {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return VIEWS.includes(hash as View) ? (hash as View) : 'dashboard'
}

function BootSkeleton() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="fixed inset-y-0 left-0 hidden w-[264px] border-r border-line bg-surface p-5 lg:block">
        <div className="skeleton h-9 w-36" />
        <div className="mt-10 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 py-10 lg:pl-[304px]">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-4 h-9 w-72" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-[118px] rounded-3xl" />
          ))}
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="skeleton h-[440px] rounded-3xl" />
          <div className="skeleton h-[440px] rounded-3xl" />
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { ready, startupError, storageError, dismissStartupError, state, updateSettings } = useApp()
  const [view, setView] = useState<View>(() => viewFromHash())
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function onHashChange() {
      setView(viewFromHash())
      setMobileOpen(false)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(next: View) {
    setView(next)
    if (window.location.hash !== `#/${next}`) {
      window.history.replaceState(null, '', `#/${next}`)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (!ready) return <BootSkeleton />

  const isDark = state.settings.theme === 'dark'
  const error = startupError ?? storageError

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        view={view}
        onNavigate={navigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="icon-btn -ml-1.5"
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <Brand />
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
            className="icon-btn"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-6 sm:px-7 lg:px-10 lg:pt-10">
          {error ? (
            <div
              role="alert"
              className="animate-fade-in mb-6 flex items-start gap-3 rounded-2xl border border-warn/25 bg-warn-soft px-4 py-3 text-warn"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-[12.5px] leading-5">{error}</p>
              <button
                type="button"
                onClick={dismissStartupError}
                className="icon-btn -my-1 -mr-1.5 size-7 shrink-0 text-warn hover:bg-warn/10"
                aria-label="Dismiss storage warning"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <div key={view} className="animate-fade-in">
            {view === 'dashboard' ? <Dashboard onNavigate={navigate} /> : null}
            {view === 'tasks' ? <TasksPage /> : null}
            {view === 'timer' ? <TimerPage /> : null}
            {view === 'analytics' ? <AnalyticsPage /> : null}
            {view === 'calendar' ? <CalendarPage /> : null}
            {view === 'settings' ? <SettingsPage /> : null}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <TimerProvider>
          <Shell />
        </TimerProvider>
      </ToastProvider>
    </AppProvider>
  )
}
