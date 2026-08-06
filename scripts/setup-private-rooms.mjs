#!/usr/bin/env node
/**
 * Verify Supabase env + private_rooms table for online room persistence.
 * Usage: node scripts/setup-private-rooms.mjs
 * Loads .env.local from project root when present.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile(envPath)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function fail(msg) {
  console.error(`\n❌ ${msg}`)
  process.exit(1)
}

function warn(msg) {
  console.warn(`\n⚠️  ${msg}`)
}

function ok(msg) {
  console.log(`✓ ${msg}`)
}

console.log('\n── Private room persistence setup ──\n')

if (!url || !anonKey) {
  fail('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n   Copy .env.local.example → .env.local and fill in Supabase API keys.')
}

try {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('NEXT_PUBLIC_SUPABASE_URL must be http(s).')
  }
} catch {
  fail('NEXT_PUBLIC_SUPABASE_URL is not a valid URL.')
}

if (url.includes('your-project') || anonKey.includes('your-')) {
  fail('Replace placeholder values in .env.local with your Supabase project keys.')
}

ok(`Supabase URL: ${url}`)

if (!serviceKey || serviceKey.includes('your-')) {
  warn('SUPABASE_SERVICE_ROLE_KEY missing or placeholder.')
  warn('Online rooms will work in-memory only (unstable on serverless).')
  warn('Add the service role key from Supabase → Project Settings → API.')
  process.exit(0)
}

ok('Service role key present')

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error: tableError } = await admin
  .from('private_rooms')
  .select('code,white_time_ms,black_time_ms,clock_started_at')
  .limit(1)

if (tableError) {
  if (
    tableError.message.includes('does not exist') ||
    tableError.message.includes('column') ||
    tableError.code === '42P01' ||
    tableError.code === '42703'
  ) {
    console.log('\n── Migration required ──\n')
    console.log('The private_rooms table is missing or out of date. Run this SQL in Supabase:')
    console.log('  Dashboard → SQL Editor → New query\n')
    console.log(`  File: supabase/migrations/003_private_rooms.sql\n`)
    console.log('Or paste the migration from that file, then re-run:')
    console.log('  npm run setup:rooms\n')
    process.exit(1)
  }
  fail(`Could not query private_rooms: ${tableError.message}`)
}

ok('private_rooms table exists')

// Smoke write (upsert + delete test row)
const testCode = '__SETUP_TEST__'
const { error: upsertError } = await admin.from('private_rooms').upsert({
  code: testCode,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn: 'w',
  white: 'setup-test',
  black: null,
  status: 'waiting',
  winner: null,
  white_time_ms: 600000,
  black_time_ms: 600000,
  clock_started_at: null,
  moves: [],
  messages: [],
  draw_offered_by: null,
  last_activity_at: new Date().toISOString(),
})

if (upsertError) {
  fail(`Write test failed: ${upsertError.message}\n   Check service role key and RLS (service role bypasses RLS).`)
}

await admin.from('private_rooms').delete().eq('code', testCode)
ok('Read/write test passed')

console.log('\n✅ Room persistence is ready.\n')
console.log('Production (Vercel): set these env vars for Production + Preview:')
console.log('  • NEXT_PUBLIC_SUPABASE_URL')
console.log('  • NEXT_PUBLIC_SUPABASE_ANON_KEY')
console.log('  • SUPABASE_SERVICE_ROLE_KEY')
console.log('  • CRON_SECRET  (random string, for /api/cron/purge-rooms)\n')
