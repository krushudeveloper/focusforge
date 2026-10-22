import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()

const failures = []
page.on('response', (res) => {
  if (res.status() >= 400) {
    failures.push(`${res.status()}  ${res.request().method()}  ${res.url()}  (initiator: ${res.request().frame().url()})`)
  }
})
page.on('requestfailed', (req) => {
  failures.push(`FAILED  ${req.method()}  ${req.url()}  ${req.failure()?.errorText ?? ''}`)
})
const consoleErrors = []
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
})
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

for (const path of ['/', '/#/tasks', '/#/timer']) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
}

console.log(failures.length ? 'FAILED RESOURCES:' : 'No 404+ responses when loading all routes.')
for (const f of failures) console.log('  ' + f)
console.log(consoleErrors.length ? 'CONSOLE ISSUES:' : 'No console errors/warnings.')
for (const c of consoleErrors) console.log('  ' + c)

await browser.close()
if (failures.length || consoleErrors.length) process.exitCode = 1
