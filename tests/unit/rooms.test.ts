import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRoom, joinRoom, applyMove, claimTimeout, rooms, safeRoom } from '../../lib/rooms.ts'

describe('rooms', () => {
  beforeEach(() => {
    rooms.clear()
  })

  it('createRoom assigns creator as white', async () => {
    const room = await createRoom('player-a')
    assert.equal(room.white, 'player-a')
    assert.equal(room.black, null)
    assert.equal(room.status, 'waiting')
  })

  it('joinRoom assigns second player as black and starts game', async () => {
    const room = await createRoom('player-a')
    const result = await joinRoom(room.code, 'player-b')
    assert.ok(!('error' in result))
    if ('error' in result) return
    assert.equal(result.color, 'b')
    assert.equal(result.room.black, 'player-b')
    assert.equal(result.room.status, 'playing')
    assert.equal(result.room.whiteTimeMs, 10 * 60 * 1000)
    assert.equal(result.room.blackTimeMs, 10 * 60 * 1000)
    assert.equal(typeof result.room.clockStartedAt, 'number')
  })

  it('joinRoom allows white player to rejoin', async () => {
    const room = await createRoom('player-a')
    const result = await joinRoom(room.code, 'player-a')
    assert.ok(!('error' in result))
    if ('error' in result) return
    assert.equal(result.color, 'w')
  })

  it('joinRoom rejects third player when room is full', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    const result = await joinRoom(room.code, 'player-c')
    assert.ok('error' in result)
  })

  it('applyMove validates turn and updates fen', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    const move = await applyMove(room.code, 'player-a', 'e2', 'e4')
    assert.equal(move.ok, true)
    if (!move.ok) return
    assert.equal(move.move.san, 'e4')
    assert.ok(move.room.fen.includes(' b '))
  })

  it('applyMove rejects out-of-turn player', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    const move = await applyMove(room.code, 'player-b', 'e7', 'e5')
    assert.equal(move.ok, false)
    if (move.ok) return
    assert.match(move.error, /turn/i)
  })

  it('applyMove rejects opponent piece selection by wrong player', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    const move = await applyMove(room.code, 'player-b', 'e2', 'e4')
    assert.equal(move.ok, false)
  })

  it('safeRoom reports elapsed authoritative clock time', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.whiteTimeMs = 1_000
    room.clockStartedAt = Date.now() - 250

    const snapshot = safeRoom(room)
    assert.equal(snapshot.status, 'playing')
    assert.ok(snapshot.whiteTimeMs <= 800, `expected elapsed clock, got ${snapshot.whiteTimeMs}`)
    assert.equal(snapshot.blackTimeMs, 10 * 60 * 1000)
  })

  it('claimTimeout finishes the room only after the active clock expires', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')

    const early = await claimTimeout(room.code, 'player-b')
    assert.equal(early.ok, false)

    room.whiteTimeMs = 1
    room.clockStartedAt = Date.now() - 10

    const result = await claimTimeout(room.code, 'player-b')
    assert.equal(result.ok, true)
    assert.equal(room.status, 'finished')
    assert.equal(room.winner, 'b')
    assert.equal(room.whiteTimeMs, 0)
    assert.equal(room.clockStartedAt, null)
  })

  it('applyMove rejects moves after the active player flags', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.whiteTimeMs = 1
    room.clockStartedAt = Date.now() - 10

    const move = await applyMove(room.code, 'player-a', 'e2', 'e4')
    assert.equal(move.ok, false)
    assert.equal(room.status, 'finished')
    assert.equal(room.winner, 'b')
  })
})
