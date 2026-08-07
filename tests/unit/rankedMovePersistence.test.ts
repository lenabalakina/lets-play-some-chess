import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migrationSql = readFileSync(
  new URL('../../supabase/migrations/004_ranked_move_number_guard.sql', import.meta.url),
  'utf8'
)

const setupSql = readFileSync(
  new URL('../../supabase/setup-all.sql', import.meta.url),
  'utf8'
)

function assertUniqueMoveNumberGuard(sql: string) {
  assert.match(sql, /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_moves_unique_game_move_number/i)
  assert.match(sql, /ON\s+public\.moves\s*\(\s*game_id\s*,\s*move_number\s*\)/i)
}

describe('ranked move persistence schema', () => {
  it('rejects duplicate move numbers for the same game in migrations', () => {
    assertUniqueMoveNumberGuard(migrationSql)
  })

  it('includes the duplicate move guard in fresh setup SQL', () => {
    assertUniqueMoveNumberGuard(setupSql)
  })
})
