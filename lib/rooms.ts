import { Chess } from 'chess.js'
import type { ChatMessage, Room, RoomMove } from './roomTypes'

export type { ChatMessage, Room, RoomMove } from './roomTypes'

type PersistedRoom = Omit<Room, 'subscribers'>

interface RoomPersistenceAdapter {
  loadRoomFromDb(code: string): Promise<PersistedRoom | null>
  saveRoomToDb(room: Room, expectedLastActivityAt?: number): Promise<boolean>
  roomCodeExistsInDb(code: string): Promise<boolean>
  tryClaimBlackSeatInDb(code: string, playerId: string): Promise<PersistedRoom | null>
  deleteStaleRoomsFromDb(olderThanMs: number): Promise<void>
}

let persistenceOverride: Partial<RoomPersistenceAdapter> | null = null

export function __setRoomPersistenceForTests(adapter: Partial<RoomPersistenceAdapter> | null): void {
  persistenceOverride = adapter
}

async function getPersistence(): Promise<Partial<RoomPersistenceAdapter>> {
  return persistenceOverride ?? await import('./roomPersistence')
}

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

async function loadFromDb(code: string): Promise<PersistedRoom | null> {
  if (!isPersistenceEnabled()) return null
  const { loadRoomFromDb } = await getPersistence()
  return loadRoomFromDb ? loadRoomFromDb(code) : null
}

async function saveToDb(room: Room, expectedLastActivityAt?: number): Promise<boolean> {
  if (!isPersistenceEnabled()) return true
  const { saveRoomToDb } = await getPersistence()
  return saveRoomToDb ? saveRoomToDb(room, expectedLastActivityAt) : false
}

async function codeExistsInDb(code: string): Promise<boolean> {
  if (!isPersistenceEnabled()) return false
  const { roomCodeExistsInDb } = await getPersistence()
  return roomCodeExistsInDb ? roomCodeExistsInDb(code) : false
}

async function claimBlackSeatInDb(code: string, playerId: string): Promise<PersistedRoom | null> {
  if (!isPersistenceEnabled()) return null
  const { tryClaimBlackSeatInDb } = await getPersistence()
  return tryClaimBlackSeatInDb ? tryClaimBlackSeatInDb(code, playerId) : null
}

async function deleteStaleRoomsFromPersistence(olderThanMs: number): Promise<void> {
  if (!isPersistenceEnabled()) return
  const { deleteStaleRoomsFromDb } = await getPersistence()
  await deleteStaleRoomsFromDb?.(olderThanMs)
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

function roomFromPersisted(row: PersistedRoom, subscribers: Room['subscribers']): Room {
  return {
    ...row,
    moves:    [...row.moves],
    messages: [...row.messages],
    subscribers,
  }
}

function cloneRoom(room: Room): Room {
  return {
    ...room,
    moves:    [...room.moves],
    messages: [...room.messages],
    subscribers: room.subscribers,
  }
}

/** Load room from memory cache or database. Preserves existing subscribers if cached. */
export async function resolveRoom(code: string, options: { refresh?: boolean } = {}): Promise<Room | undefined> {
  purgeStaleRooms()
  const upper = code.toUpperCase()
  const cached = rooms.get(upper)
  const shouldRefresh = options.refresh || isPersistenceEnabled()

  if (!shouldRefresh) return cached

  const row = await loadFromDb(upper)
  if (!row) {
    rooms.delete(upper)
    return undefined
  }

  const room = roomFromPersisted(row, cached?.subscribers ?? new Map())
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

async function commitRoom(room: Room, expectedLastActivityAt?: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const saved = await saveToDb(room, expectedLastActivityAt)
    if (!saved) {
      await resolveRoom(room.code, { refresh: true })
      return { ok: false, error: 'Room changed; please retry' }
    }
  } catch (error) {
    console.error('[rooms] save failed:', error instanceof Error ? error.message : error)
    return { ok: false, error: 'Unable to save room' }
  }
  rooms.set(room.code, room)
  return { ok: true }
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
    createdAt:      Date.now(),
    lastActivityAt: Date.now(),
    subscribers:    new Map(),
  }

  const committed = await commitRoom(room)
  if (!committed.ok) throw new Error(committed.error)
  purgeStaleRooms()
  if (isPersistenceEnabled()) {
    void deleteStaleRoomsFromPersistence(6 * 60 * 60 * 1000)
  }
  return room
}

export async function joinRoom(
  code: string, playerId: string,
): Promise<{ room: Room; color: 'w' | 'b' } | { error: string }> {
  return withRoomJoinLock(code, async () => {
    const current = await resolveRoom(code, { refresh: true })
    if (!current) return { error: 'Room not found' }

    if (current.white === playerId) return { room: current, color: 'w' }
    if (current.black === playerId) return { room: current, color: 'b' }

    if (current.status !== 'waiting') return { error: 'Room is already full' }
    if (current.black !== null) return { error: 'Room is already full' }

    if (isPersistenceEnabled()) {
      const claimed = await claimBlackSeatInDb(current.code, playerId)
      if (!claimed) {
        const refreshed = await loadFromDb(current.code)
        if (refreshed?.black === playerId) {
          const room = roomFromPersisted(refreshed, current.subscribers)
          rooms.set(room.code, room)
          return { room, color: 'b' }
        }
        return { error: 'Room is already full' }
      }
      const room = roomFromPersisted(claimed, current.subscribers)
      rooms.set(room.code, room)
      broadcast(code, { type: 'start', room: safeRoom(room) })
      return { room, color: 'b' }
    } else {
      const room = cloneRoom(current)
      room.black = playerId
      room.status = 'playing'

      room.lastActivityAt = Date.now()
      const committed = await commitRoom(room, current.lastActivityAt)
      if (!committed.ok) return { error: committed.error }
      broadcast(code, { type: 'start', room: safeRoom(room) })
      return { room, color: 'b' }
    }
  })
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

  const current = await resolveRoom(code, { refresh: true })
  if (!current)                     return { ok: false, error: 'Room not found' }
  if (current.status !== 'playing') return { ok: false, error: 'Game not active' }

  const myColor = current.white === playerId ? 'w' : current.black === playerId ? 'b' : null
  if (!myColor)              return { ok: false, error: 'Not a player in this room' }
  if (current.turn !== myColor) return { ok: false, error: 'Not your turn' }

  const room = cloneRoom(current)
  const chess = new Chess(room.fen)
  let result: ReturnType<Chess['move']> | null = null
  try {
    result = chess.move({ from, to, promotion: promotion ?? 'q' })
    if (!result) return { ok: false, error: 'Illegal move' }
  } catch {
    return { ok: false, error: 'Illegal move' }
  }

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

  const committed = await commitRoom(room, current.lastActivityAt)
  if (!committed.ok) return committed

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
}

export async function sendChat(
  code: string, playerId: string, text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (rateLimit(`chat:${playerId}`, 20)) return { ok: false, error: 'Too many messages' }

  const current = await resolveRoom(code, { refresh: true })
  if (!current) return { ok: false, error: 'Room not found' }

  const color = current.white === playerId ? 'w' : current.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player in this room' }

  const { moderateChatMessage } = await import('./chatModeration')
  const mod = moderateChatMessage(text)
  if (!mod.ok) return { ok: false, error: mod.reason }
  const trimmed = mod.text

  const room = cloneRoom(current)
  const msg: ChatMessage = { color, text: trimmed, ts: Date.now() }
  room.messages.push(msg)
  room.lastActivityAt = Date.now()
  const committed = await commitRoom(room, current.lastActivityAt)
  if (!committed.ok) return committed
  broadcast(code, { type: 'chat', ...msg })
  return { ok: true }
}

export async function offerDraw(code: string, playerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await resolveRoom(code, { refresh: true })
  if (!current || current.status !== 'playing') return { ok: false, error: 'Game not active' }

  const color = current.white === playerId ? 'w' : current.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player' }
  if (current.drawOfferedBy) return { ok: false, error: 'Draw already offered' }

  const room = cloneRoom(current)
  room.drawOfferedBy = color
  room.lastActivityAt = Date.now()
  const committed = await commitRoom(room, current.lastActivityAt)
  if (!committed.ok) return committed
  broadcast(code, { type: 'draw_offer', by: color })
  return { ok: true }
}

export async function respondDraw(
  code: string, playerId: string, accept: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await resolveRoom(code, { refresh: true })
  if (!current || current.status !== 'playing') return { ok: false, error: 'Game not active' }

  const color = current.white === playerId ? 'w' : current.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player' }
  if (!current.drawOfferedBy || current.drawOfferedBy === color) {
    return { ok: false, error: 'No draw offer to respond to' }
  }

  const room = cloneRoom(current)
  room.drawOfferedBy = null
  const event = accept ? { type: 'draw_accepted' } : { type: 'draw_declined' }
  if (accept) {
    room.status = 'finished'
    room.winner = 'draw'
  }
  room.lastActivityAt = Date.now()
  const committed = await commitRoom(room, current.lastActivityAt)
  if (!committed.ok) return committed
  broadcast(code, event)
  return { ok: true }
}

export async function resignRoom(code: string, playerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await resolveRoom(code, { refresh: true })
  if (!current || current.status !== 'playing') return { ok: false, error: 'Game not active' }

  const isWhite = current.white === playerId
  const isBlack = current.black === playerId
  if (!isWhite && !isBlack) return { ok: false, error: 'Not a player' }

  const room = cloneRoom(current)
  room.status = 'finished'
  room.winner = isWhite ? 'b' : 'w'
  room.lastActivityAt = Date.now()
  const committed = await commitRoom(room, current.lastActivityAt)
  if (!committed.ok) return committed
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
