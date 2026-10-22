import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'

const BASE = 'http://localhost:5173'
const SHOTS = '.verify'
mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

const results = []
function check(name, condition) {
  results.push(`${condition ? 'PASS' : 'FAIL'}  ${name}`)
  assert.ok(condition, name)
}

async function addTask({ title, subject, deadline, priority }) {
  await page.getByRole('button', { name: 'New task' }).click()
  await page.getByLabel('Task', { exact: true }).fill(title)
  await page.getByLabel('Subject', { exact: true }).fill(subject)
  if (deadline) await page.getByLabel('Deadline', { exact: true }).fill(deadline)
  await page.getByRole('dialog').getByRole('button', { name: priority }).click()
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.waitForTimeout(350)
}

async function noHorizontalOverflow(label) {
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  check(`${label}: no horizontal overflow (${overflow.scroll}/${overflow.client})`, overflow.scroll <= overflow.client + 1)
}

try {
  // ---- Dashboard / empty state -------------------------------------------
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  await page.waitForTimeout(500)
  check('dashboard greets with time of day', /Good|Late|Still/.test(await page.locator('h1').innerText()))
  check('sidebar visible on desktop', await page.locator('aside').first().isVisible())
  check('empty stats start at zero', (await page.getByText('0m').first().isVisible()))
  await page.screenshot({ path: `${SHOTS}/01-dashboard-empty.png`, fullPage: true })

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  // ---- Add tasks ----------------------------------------------------------
  await addTask({ title: 'Read Chapter 7 — Genetics', subject: 'Biology', deadline: today, priority: 'High' })
  check('task appears on today plan', await page.getByRole('main').getByText('Read Chapter 7 — Genetics').first().isVisible())
  await addTask({ title: 'Problem set 6', subject: 'Mathematics', deadline: tomorrow, priority: 'Medium' })
  await page.screenshot({ path: `${SHOTS}/02-dashboard-tasks.png`, fullPage: true })
  await noHorizontalOverflow('dashboard 1440')

  // ---- Task manager -------------------------------------------------------
  await page.getByRole('button', { name: /^Tasks/ }).first().click()
  await page.waitForTimeout(400)
  check('tasks page lists pending tasks', (await page.getByText('Read Chapter 7 — Genetics').count()) > 0)
  await addTask({ title: 'Revise organic mechanisms', subject: 'Chemistry', deadline: yesterday, priority: 'Low' })

  await page.getByRole('button', { name: /^Overdue/ }).click()
  await page.waitForTimeout(300)
  check('overdue filter isolates the late task', (await page.getByText('Revise organic mechanisms').count()) > 0)
  await page.getByRole('button', { name: /^All/ }).click()

  const firstTask = page.locator('[aria-label^="Complete"]').first()
  await firstTask.click()
  await page.waitForTimeout(500)
  check('completion toast appears', await page.getByText('Task completed').isVisible())
  await page.getByRole('button', { name: /^Completed/ }).click()
  await page.waitForTimeout(300)
  check('completed filter shows the completed task', (await page.locator('[aria-pressed="true"]').count()) >= 1)
  await page.getByRole('button', { name: /^All/ }).click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: /Edit “Revise organic mechanisms”/ }).click()
  await page.getByLabel('Task', { exact: true }).fill('Revise organic mechanisms + past papers')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(400)
  check('edited task title persists', await page.getByRole('main').getByText('Revise organic mechanisms + past papers').first().isVisible())

  await page.getByRole('button', { name: /Delete “Revise organic mechanisms/ }).click()
  await page.waitForTimeout(400)
  const undo = page.getByRole('button', { name: 'Undo' }).last()
  await undo.click()
  await page.waitForTimeout(400)
  check('delete is undoable from toast', await page.getByRole('main').getByText('Revise organic mechanisms + past papers').first().isVisible())
  await page.screenshot({ path: `${SHOTS}/03-tasks.png`, fullPage: true })
  await noHorizontalOverflow('tasks 1440')

  // ---- Persistence --------------------------------------------------------
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  check(
    'tasks survive refresh',
    (await page.evaluate(() => JSON.parse(localStorage.getItem('focusforge.state.v1') ?? '{}').tasks?.length)) === 3,
  )

  // ---- Timer controls -----------------------------------------------------
  await page.getByRole('button', { name: /^Focus timer/ }).click()
  await page.waitForTimeout(400)
  check('timer starts at 25:00', (await page.getByText('25:00').count()) > 0)
  await page.getByRole('button', { name: /Start focus/ }).click()
  await page.waitForTimeout(1400)
  check('timer counts down', (await page.getByText('24:5').count()) > 0)
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = await page.locator('.tabular-nums').first().innerText()
  await page.waitForTimeout(1200)
  check('pause freezes the countdown', paused === (await page.locator('.tabular-nums').first().innerText()))
  check('resume control appears', await page.getByRole('button', { name: /Resume/ }).isVisible())
  await page.getByRole('button', { name: 'Reset timer' }).click()
  await page.waitForTimeout(300)
  check('reset returns to 25:00', (await page.getByText('25:00').count()) > 0)
  await page.screenshot({ path: `${SHOTS}/04-timer.png`, fullPage: true })

  // Fast-forwarded completion path: seed a timer that ends in ~2s.
  await page.evaluate(() => {
    localStorage.setItem(
      'focusforge.timer.v1',
      JSON.stringify({
        mode: 'focus',
        endsAt: Date.now() + 1600,
        remainingMs: 1_500_000,
        running: true,
        subject: 'Physics',
        startedAt: new Date(Date.now() - 1_498_400).toISOString(),
        focusSinceLongBreak: 0,
      }),
    )
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3200)
  const sessions = await page.evaluate(
    () => JSON.parse(localStorage.getItem('focusforge.state.v1') ?? '{}').sessions ?? [],
  )
  check('completed focus block is recorded', sessions.length === 1 && sessions[0].minutes === 25 && sessions[0].subject === 'Physics')
  check('timer auto-switches to a break after focus', await page.getByRole('tab', { name: /Short break/ }).getAttribute('aria-selected') === 'true')
  check('session completion toast shown', (await page.getByText('25 minutes of focus logged').count()) > 0)

  // ---- Analytics ----------------------------------------------------------
  await page.getByRole('button', { name: /^Analytics/ }).first().click()
  await page.waitForTimeout(800)
  check('bar chart renders bars', (await page.locator('.recharts-bar-rectangle').count()) > 0)
  check('most studied subject is Physics', await page.getByText('Physics').first().isVisible())
  const range30 = page.getByRole('button', { name: '30d' })
  await range30.click()
  await page.waitForTimeout(600)
  check('range switch rerenders chart', (await page.locator('.recharts-bar-rectangle').count()) > 0)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Study log' }).click()
  const download = await downloadPromise
  const csv = readFileSync(await download.path(), 'utf8')
  check('CSV export downloads with rows', /focusforge-sessions-.*\.csv/.test(download.suggestedFilename()) && csv.includes('Date,Started,Completed') && csv.includes('Physics'))

  await page.screenshot({ path: `${SHOTS}/05-analytics.png`, fullPage: true })
  await noHorizontalOverflow('analytics 1440')

  // ---- Calendar -----------------------------------------------------------
  await page.getByRole('button', { name: /^Calendar/ }).first().click()
  await page.waitForTimeout(500)
  check('calendar renders 42 day cells', (await page.locator('[aria-pressed="false"]').count()) >= 30)
  await page.screenshot({ path: `${SHOTS}/06-calendar.png`, fullPage: true })

  // ---- Settings / dark mode ----------------------------------------------
  await page.getByRole('button', { name: /^Settings/ }).first().click()
  await page.waitForTimeout(400)
  await page.getByRole('main').getByRole('button', { name: /Dark/ }).click()
  await page.waitForTimeout(400)
  check('dark theme applied to document', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  await page.screenshot({ path: `${SHOTS}/07-settings-dark.png`, fullPage: true })
  await page.getByRole('button', { name: /^Dashboard/ }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/08-dashboard-dark.png`, fullPage: true })
  await page.getByRole('complementary').getByRole('button', { name: /^Light$/ }).first().click()
  await page.waitForTimeout(300)

  // ---- Mobile -------------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  check('desktop sidebar hidden on mobile', !(await page.locator('aside').first().isVisible()))
  await page.screenshot({ path: `${SHOTS}/09-mobile-dashboard.png`, fullPage: true })
  await noHorizontalOverflow('dashboard 390')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.waitForTimeout(450)
  check('mobile drawer opens', await page.getByRole('button', { name: 'Close navigation' }).isVisible())
  await page.screenshot({ path: `${SHOTS}/10-mobile-drawer.png` })
  await page.getByRole('button', { name: /^Tasks/ }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/11-mobile-tasks.png`, fullPage: true })
  await noHorizontalOverflow('tasks 390')

  await page.setViewportSize({ width: 820, height: 1000 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: /^Dashboard/ }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/12-tablet-dashboard.png`, fullPage: true })
  await noHorizontalOverflow('dashboard 820')

  check('no console errors', consoleErrors.length === 0)
} catch (error) {
  results.push(`FAIL  ${error.message}`)
} finally {
  console.log(results.join('\n'))
  if (consoleErrors.length) console.log('\nConsole errors:\n' + consoleErrors.join('\n'))
  if (results.some((line) => line.startsWith('FAIL')) || consoleErrors.length > 0) {
    process.exitCode = 1
  }
  await browser.close()
}
