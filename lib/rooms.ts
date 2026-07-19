import { Chess } from 'chess.js'
import type { ChatMessage, Room, RoomMove, SafeRoom } from './roomTypes'

export type { ChatMessage, Room, RoomMove } from './roomTypes'

export const PRIVATE_ROOM_TIME_MS = 10 * 60 * 1000

function isPersistenceEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  if (url.includes('your-project') || key.includes('your-')) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  } catch {
    return false
  }
  return true
}

async function loadFromDb(code: string): Promise<Omit<Room, 'subscribers'> | null> {
  if (!isPersistenceEnabled()) return null
  const { loadRoomFromDb } = await import('./roomPersistence')
  return loadRoomFromDb(code)
}

async function saveToDb(room: Room): Promise<void> {
  if (!isPersistenceEnabled()) return
  const { saveRoomToDb } = await import('./roomPersistence')
  await saveRoomToDb(room)
}

async function codeExistsInDb(code: string): Promise<boolean> {
  if (!isPersistenceEnabled()) return false
  const { roomCodeExistsInDb } = await import('./roomPersistence')
  return roomCodeExistsInDb(code)
}

// Persist across Next.js hot-reloads in dev
const g = global as typeof globalThis & {
  _chess_rooms?: Map<string, Room>
  _chess_rl?: Map<string, { count: number; resetAt: number }>
  _chess_joinChains?: Map<string, Promise<unknown>>
}
export const rooms: Map<string, Room> = g._chess_rooms ?? (g._chess_rooms = new Map())
const rl: Map<string, { count: number; resetAt: number }> = g._chess_rl ?? (g._chess_rl = new Map())

function rateLimit(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rl.get(key)
  if (!entry || now > entry.resetAt) {
    rl.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= max) return true
  entry.count++
  return false
}

const enc = new TextEncoder()

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

async function codeInUse(code: string): Promise<boolean> {
  if (rooms.has(code)) return true
  if (isPersistenceEnabled()) return codeExistsInDb(code)
  return false
}

/** Load room from memory cache or database. Preserves existing subscribers if cached. */
export async function resolveRoom(code: string): Promise<Room | undefined> {
  purgeStaleRooms()
  const upper = code.toUpperCase()
  const cached = rooms.get(upper)
  if (cached) return cached

  const row = await loadFromDb(upper)
  if (!row) return undefined

  const room: Room = { ...row, subscribers: new Map() }
  rooms.set(upper, room)
  return room
}

async function withRoomJoinLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const upper = code.toUpperCase()
  const chains = g._chess_joinChains ?? (g._chess_joinChains = new Map())
  const prev = chains.get(upper) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  chains.set(upper, prev.then(() => gate))
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (chains.get(upper) === gate) chains.delete(upper)
  }
}

async function commitRoom(room: Room): Promise<void> {
  rooms.set(room.code, room)
  await saveToDb(room)
}

function debitActiveClock(room: Room, now = Date.now()): { ok: true } | { ok: false; loser: 'w' | 'b' } {
  if (room.status !== 'playing' || room.clockStartedAt === null) return { ok: true }

  const elapsed = Math.max(0, now - room.clockStartedAt)
  if (room.turn === 'w') {
    const remaining = room.whiteMs - elapsed
    if (remaining <= 0) {
      room.whiteMs = 0
      return { ok: false, loser: 'w' }
    }
    room.whiteMs = remaining
  } else {
    const remaining = room.blackMs - elapsed
    if (remaining <= 0) {
      room.blackMs = 0
      return { ok: false, loser: 'b' }
    }
    room.blackMs = remaining
  }

  return { ok: true }
}

function finishByTimeout(room: Room, loser: 'w' | 'b', now = Date.now()): void {
  room.status = 'finished'
  room.winner = loser === 'w' ? 'b' : 'w'
  room.clockStartedAt = null
  room.lastActivityAt = now
}

function purgeStaleRooms(): void {
  const now = Date.now()
  const isDev = process.env.NODE_ENV === 'development'
  for (const [k, r] of rooms) {
    const age = now - r.lastActivityAt
    const empty = r.subscribers.size === 0
    let limit = r.status === 'playing' ? 12 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000
    if (isDev && empty) {
      limit = r.status === 'playing' ? 2 * 60 * 60 * 1000 : 10 * 60 * 1000
    }
    if (age > limit) rooms.delete(k)
  }
}

export async function createRoom(playerId: string): Promise<Room> {
  let code: string
  do { code = randomCode() } while (await codeInUse(code))

  const room: Room = {
    code,
    fen:    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn:   'w',
    white:  playerId,
    black:  null,
    status: 'waiting',
    winner: null,
    moves:    [],
    messages: [],
    drawOfferedBy: null,
    whiteMs:        PRIVATE_ROOM_TIME_MS,
    blackMs:        PRIVATE_ROOM_TIME_MS,
    clockStartedAt: null,
    createdAt:      Date.now(),
    lastActivityAt: Date.now(),
    subscribers:    new Map(),
  }

  await commitRoom(room)
  purgeStaleRooms()
  if (isPersistenceEnabled()) {
    void import('./roomPersistence').then(({ deleteStaleRoomsFromDb }) =>
      deleteStaleRoomsFromDb(6 * 60 * 60 * 1000),
    )
  }
  return room
}

export async function joinRoom(
  code: string, playerId: string,
): Promise<{ room: Room; color: 'w' | 'b' } | { error: string }> {
  return withRoomJoinLock(code, async () => {
    const room = await resolveRoom(code)
    if (!room) return { error: 'Room not found' }

    if (room.white === playerId) return { room, color: 'w' }
    if (room.black === playerId) return { room, color: 'b' }

    if (room.status !== 'waiting') return { error: 'Room is already full' }
    if (room.black !== null) return { error: 'Room is already full' }

    const now = Date.now()
    if (isPersistenceEnabled()) {
      const { tryClaimBlackSeatInDb } = await import('./roomPersistence')
      const claimed = await tryClaimBlackSeatInDb(room.code, playerId)
      if (!claimed) {
        const refreshed = await loadFromDb(room.code)
        if (refreshed?.black === playerId) {
          Object.assign(room, refreshed)
          return { room, color: 'b' }
        }
        return { error: 'Room is already full' }
      }
      Object.assign(room, claimed)
    } else {
      room.black = playerId
      room.status = 'playing'
      room.clockStartedAt = now
    }

    if (room.status === 'playing' && room.clockStartedAt === null) {
      room.clockStartedAt = now
    }
    room.lastActivityAt = now
    await commitRoom(room)
    broadcast(code, { type: 'start', room: safeRoom(room) })
    return { room, color: 'b' }
  })
}

export async function applyMove(
  code: string, playerId: string,
  from: string, to: string, promotion?: string,
): Promise<{
  ok: true
  move: RoomMove
  room: {
    fen: string
    turn: 'w' | 'b'
    status: Room['status']
    winner: Room['winner']
    whiteMs: number
    blackMs: number
    clockStartedAt: number | null
  }
} | { ok: false; error: string }> {
  if (rateLimit(`move:${playerId}`, 60)) return { ok: false, error: 'Too many moves' }

  const room = await resolveRoom(code)
  if (!room)                     return { ok: false, error: 'Room not found' }
  if (room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const myColor = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!myColor)              return { ok: false, error: 'Not a player in this room' }
  if (room.turn !== myColor) return { ok: false, error: 'Not your turn' }

  const chess = new Chess(room.fen)
  try {
    const result = chess.move({ from, to, promotion: promotion ?? 'q' })
    if (!result) return { ok: false, error: 'Illegal move' }

    const now = Date.now()
    const clock = debitActiveClock(room, now)
    if (!clock.ok) {
      finishByTimeout(room, clock.loser, now)
      await commitRoom(room)
      broadcast(code, { type: 'timeout', loser: clock.loser, winner: room.winner, room: safeRoom(room) })
      return { ok: false, error: 'Time expired' }
    }

    room.fen  = chess.fen()
    room.turn = chess.turn() as 'w' | 'b'
    const moveRecord: RoomMove = { from, to, promotion, san: result.san, fen: room.fen }
    room.moves.push(moveRecord)
    room.lastActivityAt = now

    if (chess.isGameOver()) {
      room.status = 'finished'
      if (chess.isCheckmate()) room.winner = room.turn === 'w' ? 'b' : 'w'
      else                     room.winner = 'draw'
      room.clockStartedAt = null
    } else {
      room.clockStartedAt = now
    }

    await commitRoom(room)
    broadcast(code, {
      type: 'move', from, to, promotion,
      san: result.san, fen: room.fen,
      turn: room.turn, status: room.status, winner: room.winner,
      whiteMs: room.whiteMs, blackMs: room.blackMs, clockStartedAt: room.clockStartedAt,
    })
    return {
      ok: true,
      move: moveRecord,
      room: {
        fen: room.fen,
        turn: room.turn,
        status: room.status,
        winner: room.winner,
        whiteMs: room.whiteMs,
        blackMs: room.blackMs,
        clockStartedAt: room.clockStartedAt,
      },
    }
  } catch {
    return { ok: false, error: 'Illegal move' }
  }
}

export async function sendChat(
  code: string, playerId: string, text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (rateLimit(`chat:${playerId}`, 20)) return { ok: false, error: 'Too many messages' }

  const room = await resolveRoom(code)
  if (!room) return { ok: false, error: 'Room not found' }

  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player in this room' }

  const { moderateChatMessage } = await import('./chatModeration')
  const mod = moderateChatMessage(text)
  if (!mod.ok) return { ok: false, error: mod.reason }
  const trimmed = mod.text

  const msg: ChatMessage = { color, text: trimmed, ts: Date.now() }
  room.messages.push(msg)
  room.lastActivityAt = Date.now()
  await commitRoom(room)
  broadcast(code, { type: 'chat', ...msg })
  return { ok: true }
}

export async function offerDraw(code: string, playerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const room = await resolveRoom(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player' }
  if (room.drawOfferedBy) return { ok: false, error: 'Draw already offered' }

  room.drawOfferedBy = color
  room.lastActivityAt = Date.now()
  await commitRoom(room)
  broadcast(code, { type: 'draw_offer', by: color })
  return { ok: true }
}

export async function respondDraw(
  code: string, playerId: string, accept: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const room = await resolveRoom(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player' }
  if (!room.drawOfferedBy || room.drawOfferedBy === color) {
    return { ok: false, error: 'No draw offer to respond to' }
  }

  room.drawOfferedBy = null
  if (accept) {
    room.status = 'finished'
    room.winner = 'draw'
    room.clockStartedAt = null
    broadcast(code, { type: 'draw_accepted' })
  } else {
    broadcast(code, { type: 'draw_declined' })
  }
  room.lastActivityAt = Date.now()
  await commitRoom(room)
  return { ok: true }
}

export async function resignRoom(code: string, playerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const room = await resolveRoom(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const isWhite = room.white === playerId
  const isBlack = room.black === playerId
  if (!isWhite && !isBlack) return { ok: false, error: 'Not a player' }

  room.status = 'finished'
  room.winner = isWhite ? 'b' : 'w'
  room.clockStartedAt = null
  room.lastActivityAt = Date.now()
  await commitRoom(room)
  broadcast(code, { type: 'resign', winner: room.winner })
  return { ok: true }
}

export async function claimTimeout(
  code: string,
  playerId: string,
): Promise<{ ok: true; room: SafeRoom } | { ok: false; error: string; room?: SafeRoom }> {
  const room = await resolveRoom(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const isWhite = room.white === playerId
  const isBlack = room.black === playerId
  if (!isWhite && !isBlack) return { ok: false, error: 'Not a player' }

  const now = Date.now()
  const clock = debitActiveClock(room, now)
  if (clock.ok) {
    room.clockStartedAt = now
    await commitRoom(room)
    return { ok: false, error: 'Clock has not expired', room: safeRoom(room) }
  }

  finishByTimeout(room, clock.loser, now)
  await commitRoom(room)
  const publicRoom = safeRoom(room)
  broadcast(code, { type: 'timeout', loser: clock.loser, winner: room.winner, room: publicRoom })
  return { ok: true, room: publicRoom }
}

export function safeRoom(room: Room): SafeRoom {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { subscribers: _s, white: _white, black: _black, ...rest } = room
  return rest
}

export function broadcastPresence(code: string, playerId: string, online: boolean) {
  const room = rooms.get(code.toUpperCase())
  if (!room) return
  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return
  broadcast(code, { type: 'presence', color, online })
}

export function broadcastTyping(code: string, playerId: string) {
  const room = rooms.get(code.toUpperCase())
  if (!room) return
  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return
  const chunk = enc.encode(`data: ${JSON.stringify({ type: 'typing', color })}\n\n`)
  for (const [id, ctrl] of room.subscribers.entries()) {
    if (id === playerId) continue
    try { ctrl.enqueue(chunk) } catch { room.subscribers.delete(id) }
  }
}

export async function subscribe(
  code: string, playerId: string,
  ctrl: ReadableStreamDefaultController<Uint8Array>,
  connId: string,
): Promise<void> {
  const room = await resolveRoom(code)
  if (!room) return
  ;(ctrl as unknown as { _connId: string })._connId = connId
  room.subscribers.set(playerId, ctrl)
}

export function unsubscribe(code: string, playerId: string, connId: string) {
  const room = rooms.get(code.toUpperCase())
  if (!room) return
  const existing = room.subscribers.get(playerId)
  if (existing && (existing as unknown as { _connId: string })._connId === connId) {
    room.subscribers.delete(playerId)
  }
}

function broadcast(code: string, data: object) {
  const room = rooms.get(code.toUpperCase())
  if (!room) return
  const chunk = enc.encode(`data: ${JSON.stringify(data)}\n\n`)
  for (const [playerId, ctrl] of room.subscribers.entries()) {
    try {
      ctrl.enqueue(chunk)
    } catch {
      room.subscribers.delete(playerId)
    }
  }
}
