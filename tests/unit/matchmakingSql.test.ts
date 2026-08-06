import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migrationSql = readFileSync(
  new URL('../../supabase/migrations/005_active_game_player_guard.sql', import.meta.url),
  'utf8',
)
const setupSql = readFileSync(
  new URL('../../supabase/setup-all.sql', import.meta.url),
  'utf8',
)

describe('ranked matchmaking SQL hardening', () => {
  for (const [label, sql] of [
    ['migration', migrationSql],
    ['combined setup', setupSql],
  ] as const) {
    it(`${label} prevents duplicate active games per player`, () => {
      assert.match(sql, /prevent_multiple_active_ranked_games/)
      assert.match(sql, /CREATE TRIGGER games_single_active_player/)
      assert.match(sql, /SECURITY DEFINER/)
      assert.match(sql, /SET search_path = public/)
      assert.match(sql, /pg_advisory_xact_lock/)
      assert.match(sql, /hashtextextended/)
      assert.match(sql, /g\.player_white IN \(NEW\.player_white, NEW\.player_black\)/)
      assert.match(sql, /g\.player_black IN \(NEW\.player_white, NEW\.player_black\)/)
      assert.match(sql, /USING ERRCODE = '23505'/)
    })
  }
})
