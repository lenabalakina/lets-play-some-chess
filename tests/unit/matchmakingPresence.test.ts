import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MATCHMAKING_ACTIVE_WINDOW_MS,
  isMatchmakingHeartbeatActive,
  matchmakingActiveSince,
} from '../../features/multiplayer/matchmakingPresence.ts'

describe('matchmaking presence', () => {
  it('computes the oldest heartbeat timestamp that can still be matched', () => {
    const now = new Date('2026-08-26T11:00:00.000Z')
    const activeSince = matchmakingActiveSince(now)

    assert.equal(
      activeSince,
      new Date(now.getTime() - MATCHMAKING_ACTIVE_WINDOW_MS).toISOString()
    )
  })

  it('rejects queue entries that have stopped heartbeating', () => {
    const now = new Date('2026-08-26T11:00:00.000Z')
    const active = new Date(now.getTime() - MATCHMAKING_ACTIVE_WINDOW_MS + 1).toISOString()
    const stale = new Date(now.getTime() - MATCHMAKING_ACTIVE_WINDOW_MS - 1).toISOString()

    assert.equal(isMatchmakingHeartbeatActive(active, now), true)
    assert.equal(isMatchmakingHeartbeatActive(stale, now), false)
  })
})
