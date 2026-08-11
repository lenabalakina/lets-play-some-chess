import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAYING_ROOM_STALE_MS,
  STALE_PLAYING_ROOM_STATUSES,
  STALE_WAITING_ROOM_STATUSES,
  WAITING_ROOM_STALE_MS,
} from '../../lib/roomRetention.ts'

describe('private room persistence cleanup policy', () => {
  it('keeps active rooms on the longer stale-room retention window', () => {
    assert.deepEqual(STALE_WAITING_ROOM_STATUSES, ['waiting', 'finished'])
    assert.deepEqual(STALE_PLAYING_ROOM_STATUSES, ['playing'])
    assert.equal(WAITING_ROOM_STALE_MS, 6 * 60 * 60 * 1000)
    assert.equal(PLAYING_ROOM_STALE_MS, 12 * 60 * 60 * 1000)
    assert.ok(PLAYING_ROOM_STALE_MS > WAITING_ROOM_STALE_MS)
  })
})
