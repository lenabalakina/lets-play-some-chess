import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../supabase/functions/matchmaking/index.ts', import.meta.url), 'utf8')

describe('matchmaking edge function hardening', () => {
  it('verifies the webhook player is still queued before creating a game', () => {
    const verifyStart = source.indexOf('const { data: newPlayer, error: queuedPlayerError }')
    const createGameStart = source.indexOf('.from(\'games\')')

    assert.notEqual(verifyStart, -1, 'expected queued player verification query')
    assert.notEqual(createGameStart, -1, 'expected game creation query')
    assert.ok(verifyStart < createGameStart, 'queue verification must happen before game creation')
    assert.match(source, /\.eq\('player_id', webhookPlayer\.player_id\)/)
    assert.match(source, /status: 'not_queued'/)
  })
})
