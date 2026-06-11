#!/usr/bin/env node
/** Run supabase/setup-all.sql + enable Realtime via POSTGRES_URL from .env.local */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

function loadEnv(path) {
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

loadEnv(envPath)

const postgresUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
if (!postgresUrl) {
  console.error('POSTGRES_URL_NON_POOLING or POSTGRES_URL missing from .env.local')
  process.exit(1)
}

// psql rejects Vercel Supabase pooler extras like ?supa=base-pooler.x
const psqlUrl = postgresUrl.replace(/[?&]supa=[^&]*/g, '').replace(/\?$/, '')

function psql(sqlOrFile, { file = false } = {}) {
  const args = file ? ['-f', sqlOrFile] : ['-c', sqlOrFile]
  const r = spawnSync('psql', [psqlUrl, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    process.exit(r.status ?? 1)
  }
  return r.stdout
}

console.log('Running supabase/setup-all.sql …')
psql(resolve(root, 'supabase/setup-all.sql'), { file: true })
console.log('✓ Schema applied')

for (const table of ['public.moves', 'public.games']) {
  const r = spawnSync('psql', [psqlUrl, '-c', `ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status === 0) {
    console.log(`✓ Realtime enabled for ${table}`)
  } else if ((r.stderr || '').includes('already member')) {
    console.log(`✓ Realtime already enabled for ${table}`)
  } else {
    console.warn(`⚠ Realtime for ${table}: ${(r.stderr || r.stdout || '').trim()}`)
  }
}

console.log('\nDone.')
