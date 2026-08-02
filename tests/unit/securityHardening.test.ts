import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function readWorkspaceFile(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('security hardening', () => {
  it('prevents authenticated clients from mutating ranked authority tables directly', () => {
    const migration = readWorkspaceFile('supabase/migrations/004_ranked_write_hardening.sql')

    assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON public\.games FROM authenticated;/)
    assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON public\.moves FROM authenticated;/)
    assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON public\.users FROM authenticated;/)
    assert.match(migration, /GRANT UPDATE \(username, avatar_url\) ON public\.users TO authenticated;/)
    assert.match(migration, /CREATE POLICY "games_no_client_update" ON public\.games FOR UPDATE\s+USING \(false\);/)
    assert.match(migration, /CREATE POLICY "moves_no_client_insert" ON public\.moves FOR INSERT\s+WITH CHECK \(false\);/)
  })

  it('keeps fresh Supabase setup aligned with ranked write hardening', () => {
    const setup = readWorkspaceFile('supabase/setup-all.sql')

    assert.match(setup, /migration 004/)
    assert.match(setup, /REVOKE INSERT, UPDATE, DELETE ON public\.games FROM authenticated;/)
    assert.match(setup, /REVOKE INSERT, UPDATE, DELETE ON public\.moves FROM authenticated;/)
    assert.match(setup, /REVOKE INSERT, UPDATE, DELETE ON public\.users FROM authenticated;/)
    assert.match(setup, /GRANT UPDATE \(username, avatar_url\) ON public\.users TO authenticated;/)
  })

  it('requires a configured secret before the room purge cron can run', () => {
    const route = readWorkspaceFile('app/api/cron/purge-rooms/route.ts')

    assert.match(route, /if \(!secret\) \{/)
    assert.match(route, /CRON_SECRET is not configured/)
    assert.match(route, /status: 503/)
  })
})
