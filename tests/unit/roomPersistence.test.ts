import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getStaleRoomCutoffs, PLAYING_ROOM_STALE_MS } from '../../lib/roomPurgePolicy.ts'

describe('roomPersistence', () => {
  it('keeps playing room cleanup on the longer stale horizon', () => {
    const now = Date.UTC(2026, 0, 1, 12)
    const waitingRoomStaleMs = 6 * 60 * 60 * 1000

    const cutoffs = getStaleRoomCutoffs(waitingRoomStaleMs, now)

    assert.equal(cutoffs.inactiveCutoff, new Date(now - waitingRoomStaleMs).toISOString())
    assert.equal(cutoffs.playingCutoff, new Date(now - PLAYING_ROOM_STALE_MS).toISOString())
  })
})
