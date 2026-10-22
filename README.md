# FocusForge

A study workspace that helps students plan their work, run focused Pomodoro sprints, and see their
progress add up. All data lives in the browser — no account, no backend.

Built for the **Website Challenge: FocusForge** brief with a light, airy design direction:
white sidebar, soft off-white canvas, electric blue and lavender accents, and a large Pomodoro timer
as the visual centrepiece. A dark theme is included as well.

## Features

**Dashboard**
- Live date and a greeting that adapts to the time of day and your saved name
- Study time today, tasks completed today, remaining tasks and a daily productivity score — all
  derived from your real records, never hardcoded
- Large Pomodoro card, 7-day study rhythm chart, an up-next task list, most-studied subject

**Task manager**
- Add, edit, complete and delete tasks (delete is undoable from the toast)
- Subject, deadline and priority on every task
- Filters for all / pending / completed / overdue, sorting by priority, deadline or newest
- Search across titles and subjects

**Pomodoro timer**
- 25 minute focus, 5 minute short break, 15 minute long break
- Start, pause, resume, reset and skip controls, plus `Space` / `R` shortcuts
- A long break is suggested after every four focus blocks
- Every completed focus block is recorded automatically with its subject
- Optional focus soundscapes (rain, brown noise, focus pad) generated with WebAudio — no audio files
- The countdown survives refreshes and keeps running across pages; the tab title shows the time left

**Analytics**
- Today / this week / all-time / daily average study time
- Blue-to-lavender bar chart for 7, 14 or 30 days
- Subject distribution donut and a most-studied subject callout
- Productivity score ring with the exact breakdown
- CSV export for the study log and the task list

**Calendar**
- Month grid with deadline markers, study intensity and a selected-day panel of tasks and sessions

**Everything else**
- Streak tracking (current and best) based on consecutive study days
- Toast notifications, empty states, a boot skeleton and a storage-failure banner instead of alerts
- Responsive layout from 320 px phones to wide desktops, with a slide-out navigation drawer
- Light and dark themes with a no-flash theme bootstrap

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 with a token-based design system
- Recharts for charts
- Lucide for icons
- localStorage for persistence

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build
npm run verify       # Playwright end-to-end checks (requires `npm run dev` on :5173)
npm run verify:edge  # Storage recovery, break accounting, custom subjects
```

## How the productivity score works

```
score = 60 × min(focusMinutes / dailyGoal, 1) + 40 × (tasksCleared / taskBoard)
```

The task board is every task due on or before the selected day, plus anything completed that day.
If there are no tasks on the board, the score comes from study time alone. The daily goal defaults
to 120 minutes and can be changed in Settings.

## Data and persistence

State is stored under `focusforge.state.v1` and the live timer under `focusforge.timer.v1` in
localStorage. Stored data is validated on load; unreadable data falls back to a clean workspace with
a visible warning. Multiple tabs stay in sync through the `storage` event.

## Deploying to GitHub Pages

`vite.config.ts` uses a relative base (`base: './'`), so the build works from any repository path.

The included workflow at `.github/workflows/deploy.yml` builds and publishes `dist/` on every push
to `main`:

1. Push this folder as its own repository.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` — the site deploys automatically.

## Keyboard shortcuts

| Key     | Action                     |
| ------- | -------------------------- |
| `Space` | Start / pause the timer    |
| `R`     | Reset the current block    |
| `Esc`   | Close the task dialog      |

## Not included

The optional AI study planner is not wired up, because it needs a live model API key and a provider
decision. The structure (sessions, tasks, deadlines) is ready for it as a follow-up.
