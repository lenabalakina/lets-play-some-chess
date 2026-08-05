import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getServerMoveTiming } from '../../features/multiplayer/rankedClock.ts'

describe('ranked clock timing', () => {
  it('uses server-observed elapsed time from the game update timestamp', () => {
    const timing = getServerMoveTiming(
      '2026-08-05T11:00:00.000Z',
      60_000,
      Date.parse('2026-08-05T11:00:12.345Z')
    )

    assert.equal(timing.elapsedMs, 12_345)
    assert.equal(timing.timedOut, false)
  })

  it('marks the active player timed out once elapsed time consumes their clock', () => {
    const timing = getServerMoveTiming(
      '2026-08-05T11:00:00.000Z',
      10_000,
      Date.parse('2026-08-05T11:00:10.000Z')
    )

    assert.equal(timing.elapsedMs, 10_000)
    assert.equal(timing.timedOut, true)
  })

  it('clamps future timestamps instead of creating negative move time', () => {
    const timing = getServerMoveTiming(
      '2026-08-05T11:00:10.000Z',
      10_000,
      Date.parse('2026-08-05T11:00:00.000Z')
    )

    assert.equal(timing.elapsedMs, 0)
    assert.equal(timing.timedOut, false)
  })
})
