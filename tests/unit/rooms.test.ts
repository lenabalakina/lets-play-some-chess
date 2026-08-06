import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRoom, joinRoom, applyMove, claimTimeout, safeRoom, rooms } from '../../lib/rooms.ts'
import { PRIVATE_ROOM_TIME_MS } from '../../lib/roomTypes.ts'

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

  it('safeRoom projects active clock without resetting on rejoin', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.clockStartedAt = Date.now() - 5_000

    const snapshot = safeRoom(room)
    assert.equal(snapshot.blackMs, PRIVATE_ROOM_TIME_MS)
    assert.ok(snapshot.whiteMs <= PRIVATE_ROOM_TIME_MS - 4_000)
    assert.ok(snapshot.whiteMs > PRIVATE_ROOM_TIME_MS - 7_000)
    assert.equal(room.whiteMs, PRIVATE_ROOM_TIME_MS)
  })

  it('applyMove debits the moving player clock and starts the opponent clock', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.clockStartedAt = Date.now() - 3_000

    const move = await applyMove(room.code, 'player-a', 'e2', 'e4')
    assert.equal(move.ok, true)
    assert.ok(move.ok && move.room.whiteMs <= PRIVATE_ROOM_TIME_MS - 2_000)
    assert.equal(move.ok && move.room.blackMs, PRIVATE_ROOM_TIME_MS)
    assert.equal(move.ok && move.room.turn, 'b')
    assert.equal(typeof (move.ok && move.room.clockStartedAt), 'number')
  })

  it('claimTimeout finishes the game for the opponent of the expired clock', async () => {
    const room = await createRoom('player-a')
    await joinRoom(room.code, 'player-b')
    room.whiteMs = 100
    room.clockStartedAt = Date.now() - 1_000

    const result = await claimTimeout(room.code, 'player-b')
    assert.equal(result.ok, true)
    assert.equal(result.ok && result.room.status, 'finished')
    assert.equal(result.ok && result.room.winner, 'b')
    assert.equal(result.ok && result.room.whiteMs, 0)
  })
})
