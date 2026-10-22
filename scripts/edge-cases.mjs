import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const BASE = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
function check(name, condition) {
  results.push(`${condition ? 'PASS' : 'FAIL'}  ${name}`)
  assert.ok(condition, name)
}

try {
  // ---- Corrupted storage recovers with a visible warning ------------------
  const broken = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const brokenPage = await broken.newPage()
  await brokenPage.addInitScript(() => localStorage.setItem('focusforge.state.v1', '{not valid json'))
  await brokenPage.goto(BASE, { waitUntil: 'networkidle' })
  await brokenPage.waitForTimeout(600)
  const alert = brokenPage.getByRole('alert')
  check('corrupted storage shows a recovery warning', await alert.isVisible())
  check('recovery warning explains the reset', (await alert.innerText()).includes('could not be read'))
  check('app still renders after recovery', await brokenPage.locator('h1').isVisible())
  await brokenPage.getByRole('button', { name: 'Dismiss storage warning' }).click()
  await brokenPage.waitForTimeout(300)
  check('warning can be dismissed', (await alert.count()) === 0)
  await broken.close()

  // ---- Breaks are not study time; custom subject is recorded --------------
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const now = Date.now()
    const state = {
      version: 1,
      tasks: [
        { id: 'a', title: 'Low priority essay', subject: 'English', deadline: new Date(now + 3 * 86400000).toISOString().slice(0, 10), priority: 'low', completed: false, completedAt: null, createdAt: new Date(now - 86400000).toISOString() },
        { id: 'b', title: 'High priority lab', subject: 'Physics', deadline: new Date(now + 5 * 86400000).toISOString().slice(0, 10), priority: 'high', completed: false, completedAt: null, createdAt: new Date(now - 7200000).toISOString() },
        { id: 'c', title: 'Medium priority quiz', subject: 'Biology', deadline: new Date(now - 86400000).toISOString().slice(0, 10), priority: 'medium', completed: false, completedAt: null, createdAt: new Date(now - 2 * 86400000).toISOString() },
      ],
      sessions: [
        { id: 's1', mode: 'focus', subject: 'Physics', minutes: 25, startedAt: new Date(now - 3600000).toISOString(), completedAt: new Date(now - 2100000).toISOString() },
        { id: 's2', mode: 'short', subject: 'General', minutes: 5, startedAt: new Date(now - 1200000).toISOString(), completedAt: new Date(now - 900000).toISOString() },
      ],
      settings: { name: 'Mira', dailyGoalMinutes: 120, theme: 'light', soundscape: 'off', volume: 0.35 },
    }
    localStorage.setItem('focusforge.state.v1', JSON.stringify(state))
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  check('break minutes are excluded from study time', (await page.getByText('25m').count()) > 0)

  // Priority sorting puts high before medium before low.
  await page.getByRole('button', { name: /^Tasks/ }).first().click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^All/ }).click()
  await page.waitForTimeout(300)
  await page.getByLabel('Sort tasks').selectOption('priority')
  await page.waitForTimeout(300)
  const titles = await page.locator('main p.truncate').allInnerTexts()
  check('priority sort orders high → medium → low', titles.slice(0, 3).join('|') === 'High priority lab|Medium priority quiz|Low priority essay')

  await page.getByLabel('Sort tasks').selectOption('deadline')
  await page.waitForTimeout(300)
  const byDeadline = await page.locator('main p.truncate').allInnerTexts()
  check(
    'deadline sort puts the overdue task first',
    byDeadline.slice(0, 3).join('|') === 'Medium priority quiz|Low priority essay|High priority lab',
  )

  // ---- Custom subject on the timer is persisted and recorded --------------
  await page.getByRole('button', { name: /^Focus timer/ }).click()
  await page.waitForTimeout(400)
  const subjectInput = page.getByLabel('Subject for this session')
  await subjectInput.fill('Astrophysics')
  await subjectInput.blur()
  await page.waitForTimeout(400)
  const savedSubject = await page.evaluate(() => JSON.parse(localStorage.getItem('focusforge.timer.v1') ?? '{}').subject)
  check('custom timer subject is stored', savedSubject === 'Astrophysics')

  await page.evaluate(() => {
    const timer = JSON.parse(localStorage.getItem('focusforge.timer.v1'))
    localStorage.setItem(
      'focusforge.timer.v1',
      JSON.stringify({ ...timer, running: true, endsAt: Date.now() + 1500, startedAt: new Date().toISOString() }),
    )
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('focusforge.state.v1')).sessions)
  check(
    'custom subject recorded on completed session',
    sessions.some((session) => session.subject === 'Astrophysics' && session.minutes === 25),
  )
  check('timer log lists the break and the new session', (await page.getByText('Short break').count()) > 0)
  check('no page errors in the edge-case flow', errors.length === 0)
  await context.close()
} catch (error) {
  results.push(`FAIL  ${error.message}`)
} finally {
  console.log(results.join('\n'))
  if (results.some((line) => line.startsWith('FAIL'))) process.exitCode = 1
  await browser.close()
}
