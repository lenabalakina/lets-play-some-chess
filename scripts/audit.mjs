#!/usr/bin/env node
/**
 * Game audit agent — runs all e2e tests and prints a clear pass/fail report.
 * Usage: node scripts/audit.mjs
 */

import { execSync, spawnSync } from 'child_process'

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'

function header(text) {
  console.log(`\n${BOLD}${CYAN}━━━ ${text} ━━━${RESET}`)
}

function ok(text)   { console.log(`  ${GREEN}✓${RESET}  ${text}`) }
function fail(text) { console.log(`  ${RED}✗${RESET}  ${text}`) }
function warn(text) { console.log(`  ${YELLOW}⚠${RESET}  ${text}`) }
function dim(text)  { console.log(`${DIM}${text}${RESET}`) }

const start = Date.now()
console.log(`\n${BOLD}Chess App Audit${RESET}  ${DIM}${new Date().toLocaleString()}${RESET}`)

// ── TypeScript check ────────────────────────────────────────────────────────
header('TypeScript')
const tsc = spawnSync('npx', ['tsc', '--noEmit'], { encoding: 'utf8' })
if (tsc.status === 0) {
  ok('No type errors')
} else {
  const errors = (tsc.stdout + tsc.stderr).trim().split('\n').slice(0, 10)
  errors.forEach(e => fail(e))
}

// ── Playwright tests ────────────────────────────────────────────────────────
header('E2E Tests')
const pw = spawnSync(
  'npx', ['playwright', 'test', '--reporter=json'],
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
)

let passed = 0, failed = 0, failedTests = []
try {
  const report = JSON.parse(pw.stdout)
  for (const suite of report.suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const name = `${suite.title} › ${spec.title}`
        if (test.status === 'passed' || test.results?.some(r => r.status === 'passed')) {
          passed++
        } else {
          failed++
          failedTests.push(name)
        }
      }
    }
  }
} catch {
  // JSON parse failed — show raw output
  const lines = (pw.stdout + pw.stderr).split('\n').filter(l => l.includes('✓') || l.includes('✗') || l.includes('failed') || l.includes('passed'))
  lines.slice(0, 20).forEach(l => dim(l))
}

if (passed > 0 || failed > 0) {
  if (failed === 0) {
    ok(`All ${passed} tests passed`)
  } else {
    fail(`${failed} failed, ${passed} passed`)
    failedTests.forEach(t => fail(`  └ ${t}`))
  }
}

// ── Build check ─────────────────────────────────────────────────────────────
header('Build')
const build = spawnSync('npx', ['next', 'build'], {
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production' },
  maxBuffer: 10 * 1024 * 1024,
})
if (build.status === 0) {
  ok('Production build successful')
} else {
  const errors = (build.stdout + build.stderr).split('\n').filter(l => l.includes('Error') || l.includes('error')).slice(0, 5)
  errors.forEach(e => fail(e.trim()))
  if (errors.length === 0) fail('Build failed (check output above)')
}

// ── Summary ─────────────────────────────────────────────────────────────────
const elapsed = ((Date.now() - start) / 1000).toFixed(1)
const allGood = tsc.status === 0 && failed === 0 && build.status === 0
header('Result')
if (allGood) {
  console.log(`  ${GREEN}${BOLD}All checks passed${RESET}  ${DIM}(${elapsed}s)${RESET}\n`)
} else {
  console.log(`  ${RED}${BOLD}Issues found — see above${RESET}  ${DIM}(${elapsed}s)${RESET}\n`)
  process.exit(1)
}
