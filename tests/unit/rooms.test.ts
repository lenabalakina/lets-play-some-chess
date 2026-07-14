import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  __setRoomPersistenceForTests,
  createRoom,
  joinRoom,
  applyMove,
  offerDraw,
  rooms,
} from '../../lib/rooms.ts'
import type { Room, RoomMove } from '../../lib/rooms.ts'

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function restoreEnv() {
  if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl

  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
}

function enableMockPersistence() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    code:          'TEST',
    fen:           START_FEN,
    turn:          'w',
    white:         'player-a',
    black:         'player-b',
    status:        'playing',
    winner:        null,
    moves:         [],
    messages:      [],
    drawOfferedBy: null,
    createdAt:      100,
    lastActivityAt: 1000,
    subscribers:    new Map(),
    ...overrides,
  }
}

function persisted(room: Room): Omit<Room, 'subscribers'> {
  const { subscribers, ...rest } = room
  void subscribers
  return rest
}

describe('rooms', () => {
  beforeEach(() => {
    rooms.clear()
    __setRoomPersistenceForTests(null)
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  afterEach(() => {
    __setRoomPersistenceForTests(null)
    restoreEnv()
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

  it('offerDraw refreshes persisted room state before saving', async () => {
    enableMockPersistence()

    const move: RoomMove = {
      from: 'e2',
      to:   'e4',
      san:  'e4',
      fen:  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    }
    const stale = makeRoom()
    const latest = makeRoom({
      fen:            move.fen,
      turn:           'b',
      moves:          [move],
      lastActivityAt: 2000,
    })
    rooms.set('TEST', stale)

    let saved: Room | null = null
    let expectedLastActivityAt: number | undefined
    __setRoomPersistenceForTests({
      loadRoomFromDb: async () => persisted(latest),
      saveRoomToDb: async (room, expected) => {
        saved = room
        expectedLastActivityAt = expected
        return true
      },
    })

    const result = await offerDraw('TEST', 'player-b')

    assert.equal(result.ok, true)
    assert.equal(saved?.fen, latest.fen)
    assert.equal(saved?.moves.length, 1)
    assert.equal(saved?.drawOfferedBy, 'b')
    assert.equal(expectedLastActivityAt, latest.lastActivityAt)
  })

  it('keeps cached room unchanged when persisted save detects a conflict', async () => {
    enableMockPersistence()

    const latest = makeRoom({ lastActivityAt: 2000 })
    rooms.set('TEST', makeRoom())
    __setRoomPersistenceForTests({
      loadRoomFromDb: async () => persisted(latest),
      saveRoomToDb:  async () => false,
    })

    const result = await offerDraw('TEST', 'player-b')

    assert.equal(result.ok, false)
    if (result.ok) return
    assert.match(result.error, /changed/i)
    assert.equal(rooms.get('TEST')?.drawOfferedBy, null)
    assert.equal(rooms.get('TEST')?.lastActivityAt, latest.lastActivityAt)
  })
})
