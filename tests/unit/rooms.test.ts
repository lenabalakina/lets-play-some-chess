import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRoom, joinRoom, applyMove, claimTimeout, safeRoom, rooms } from '../../lib/rooms.ts'

describe('rooms', () => {
  beforeEach(() => {
    rooms.clear()
  })

  it('createRoom assigns creator as white', async () => {
    const room = await createRoom('player-a')
    assert.equal(room.white, 'player-a')
    assert.equal(room.black, null)
    assert.equal(room.status, 'waiting')
    assert.equal(room.whiteMs, 600_000)
    assert.equal(room.blackMs, 600_000)
    assert.equal(room.clockStartedAt, null)
  })

  it('joinRoom assigns second player as black and starts game', async () => {
    const room = await createRoom('player-a')
    const result = await joinRoom(room.code, 'player-b')
    assert.ok(!('error' in result))
    if ('error' in result) return
    assert.equal(result.color, 'b')
    assert.equal(result.room.black, 'player-b')
    assert.equal(result.room.status, 'playing')
    assert.equal(typeof result.room.clockStartedAt, 'number')
  })

  it('safeRoom does not expose private player ids', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    const publicRoom = safeRoom(room)
    assert.equal('white' in publicRoom, false)
    assert.equal('black' in publicRoom, false)
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

  it('applyMove debits elapsed time from the moving side', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.whiteMs = 10_000
    room.clockStartedAt = Date.now() - 2_000

    const move = await applyMove(room.code, 'player-a', 'e2', 'e4')
    assert.equal(move.ok, true)
    assert.ok(room.whiteMs <= 8_100)
    assert.equal(room.blackMs, 600_000)
    assert.equal(room.turn, 'b')
    assert.equal(typeof room.clockStartedAt, 'number')
  })

  it('applyMove rejects moves after the active clock expired', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.whiteMs = 100
    room.clockStartedAt = Date.now() - 1_000

    const move = await applyMove(room.code, 'player-a', 'e2', 'e4')
    assert.equal(move.ok, false)
    assert.equal(room.status, 'finished')
    assert.equal(room.winner, 'b')
    assert.equal(room.whiteMs, 0)
  })

  it('claimTimeout finishes the game when the server clock expired', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.blackMs = 100
    room.turn = 'b'
    room.clockStartedAt = Date.now() - 1_000

    const result = await claimTimeout(room.code, 'player-a')
    assert.equal(result.ok, true)
    assert.equal(room.status, 'finished')
    assert.equal(room.winner, 'w')
    assert.equal(room.blackMs, 0)
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
})
