import { Chess } from 'chess.js'
import type { ChatMessage, Room, RoomMove } from './roomTypes'

export type { ChatMessage, Room, RoomMove } from './roomTypes'

function isPersistenceEnabled(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL
}

async function loadFromDb(code: string): Promise<Omit<Room, 'subscribers'> | null> {
  if (!isPersistenceEnabled()) return null
  const { loadRoomFromDb } = await import('./roomPersistence')
  return loadRoomFromDb(code)
}

async function saveToDb(room: Room): Promise<void> {
  if (!isPersistenceEnabled()) return
  const { saveRoomToDb } = await import('./roomPersistence')
  await saveToDb(room)
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
  const upper = code.toUpperCase()
  const cached = rooms.get(upper)
  if (cached) return cached

  const row = await loadFromDb(upper)
  if (!row) return undefined

  const room: Room = { ...row, subscribers: new Map() }
  rooms.set(upper, room)
  return room
}

async function commitRoom(room: Room): Promise<void> {
  rooms.set(room.code, room)
  await saveToDb(room)
}

function purgeStaleRooms(): void {
  for (const [k, r] of rooms) {
    const age = Date.now() - r.lastActivityAt
    const limit = r.status === 'playing' ? 12 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000
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
    createdAt:      Date.now(),
    lastActivityAt: Date.now(),
    subscribers:    new Map(),
  }

  await commitRoom(room)
  purgeStaleRooms()
  return room
}

export async function joinRoom(
  code: string, playerId: string,
): Promise<{ room: Room; color: 'w' | 'b' } | { error: string }> {
  const room = await resolveRoom(code)
  if (!room) return { error: 'Room not found' }

  if (room.white === playerId) return { room, color: 'w' }
  if (room.black === playerId) return { room, color: 'b' }

  if (room.status !== 'waiting') return { error: 'Room is already full' }
  if (room.black !== null) return { error: 'Room is already full' }

  room.black = playerId
  room.status = 'playing'
  room.lastActivityAt = Date.now()
  await commitRoom(room)
  broadcast(code, { type: 'start', room: safeRoom(room) })
  return { room, color: 'b' }
}

export async function applyMove(
  code: string, playerId: string,
  from: string, to: string, promotion?: string,
): Promise<{
  ok: true
  move: RoomMove
  room: { fen: string; turn: 'w' | 'b'; status: Room['status']; winner: Room['winner'] }
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

    room.fen  = chess.fen()
    room.turn = chess.turn() as 'w' | 'b'
    const moveRecord: RoomMove = { from, to, promotion, san: result.san, fen: room.fen }
    room.moves.push(moveRecord)
    room.lastActivityAt = Date.now()

    if (chess.isGameOver()) {
      room.status = 'finished'
      if (chess.isCheckmate()) room.winner = room.turn === 'w' ? 'b' : 'w'
      else                     room.winner = 'draw'
    }

    await commitRoom(room)
    broadcast(code, {
      type: 'move', from, to, promotion,
      san: result.san, fen: room.fen,
      turn: room.turn, status: room.status, winner: room.winner,
    })
    return {
      ok: true,
      move: moveRecord,
      room: { fen: room.fen, turn: room.turn, status: room.status, winner: room.winner },
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

  const trimmed = text.trim().slice(0, 200)
  if (!trimmed) return { ok: false, error: 'Empty message' }

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
  room.lastActivityAt = Date.now()
  await commitRoom(room)
  broadcast(code, { type: 'resign', winner: room.winner })
  return { ok: true }
}

export function safeRoom(room: Room) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { subscribers: _s, ...rest } = room
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
    try { ctrl.enqueue(chunk) } catch {}
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
  for (const ctrl of room.subscribers.values()) {
    try { ctrl.enqueue(chunk) } catch {}
  }
}
