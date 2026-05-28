import { Chess } from 'chess.js'

export interface RoomMove {
  from: string
  to: string
  promotion?: string
  san: string
  fen: string
}

export interface ChatMessage {
  color: 'w' | 'b'
  text:  string
  ts:    number
}

export interface Room {
  code:    string
  fen:     string
  turn:    'w' | 'b'
  white:   string | null  // playerId
  black:   string | null  // playerId
  status:  'waiting' | 'playing' | 'finished'
  winner:  'w' | 'b' | 'draw' | null
  moves:   RoomMove[]
  messages: ChatMessage[]
  drawOfferedBy: 'w' | 'b' | null
  createdAt:       number
  lastActivityAt:  number
  subscribers: Map<string, ReadableStreamDefaultController<Uint8Array>>
}

// Persist across Next.js hot-reloads in dev
const g = global as typeof globalThis & { _chess_rooms?: Map<string, Room> }
export const rooms: Map<string, Room> = g._chess_rooms ?? (g._chess_rooms = new Map())

const enc = new TextEncoder()

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function createRoom(playerId: string): Room {
  let code: string
  do { code = randomCode() } while (rooms.has(code))

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
  rooms.set(code, room)

  // Clean up rooms older than 2 hours
  for (const [k, r] of rooms) {
    if (Date.now() - r.createdAt > 2 * 60 * 60 * 1000) rooms.delete(k)
  }

  return room
}

export function joinRoom(code: string, playerId: string): { room: Room; color: 'b' } | { error: string } {
  const room = rooms.get(code)
  if (!room)                          return { error: 'Room not found' }
  if (room.white === playerId)        return { error: 'You are already in this room as White' }
  if (room.black === playerId)        return { error: 'You are already in this room as Black' }
  if (room.status !== 'waiting')      return { error: 'Room is already full or finished' }

  room.black = playerId
  room.status = 'playing'
  room.lastActivityAt = Date.now()
  broadcast(code, { type: 'start', room: safeRoom(room) })
  return { room, color: 'b' }
}

export function applyMove(
  code: string, playerId: string,
  from: string, to: string, promotion?: string
): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(code)
  if (!room)                     return { ok: false, error: 'Room not found' }
  if (room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const myColor = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!myColor)                  return { ok: false, error: 'Not a player in this room' }
  if (room.turn !== myColor)     return { ok: false, error: 'Not your turn' }

  const chess = new Chess(room.fen)
  try {
    const result = chess.move({ from, to, promotion: promotion ?? 'q' })
    if (!result) return { ok: false, error: 'Illegal move' }

    room.fen  = chess.fen()
    room.turn = chess.turn() as 'w' | 'b'
    room.moves.push({ from, to, promotion, san: result.san, fen: room.fen })
    room.lastActivityAt = Date.now()

    if (chess.isGameOver()) {
      room.status = 'finished'
      if (chess.isCheckmate()) room.winner = room.turn === 'w' ? 'b' : 'w'
      else                     room.winner = 'draw'
    }

    broadcast(code, {
      type: 'move', from, to, promotion,
      san: result.san, fen: room.fen,
      turn: room.turn, status: room.status, winner: room.winner,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Illegal move' }
  }
}

export function sendChat(
  code: string, playerId: string, text: string
): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(code)
  if (!room) return { ok: false, error: 'Room not found' }
  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player in this room' }
  const trimmed = text.trim().slice(0, 200)
  if (!trimmed) return { ok: false, error: 'Empty message' }
  const msg: ChatMessage = { color, text: trimmed, ts: Date.now() }
  room.messages.push(msg)
  broadcast(code, { type: 'chat', ...msg })
  return { ok: true }
}

export function offerDraw(code: string, playerId: string): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }
  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player' }
  if (room.drawOfferedBy) return { ok: false, error: 'Draw already offered' }
  room.drawOfferedBy = color
  broadcast(code, { type: 'draw_offer', by: color })
  return { ok: true }
}

export function respondDraw(code: string, playerId: string, accept: boolean): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }
  const color = room.white === playerId ? 'w' : room.black === playerId ? 'b' : null
  if (!color) return { ok: false, error: 'Not a player' }
  if (!room.drawOfferedBy || room.drawOfferedBy === color) return { ok: false, error: 'No draw offer to respond to' }
  room.drawOfferedBy = null
  if (accept) {
    room.status = 'finished'
    room.winner = 'draw'
    broadcast(code, { type: 'draw_accepted' })
  } else {
    broadcast(code, { type: 'draw_declined' })
  }
  return { ok: true }
}

export function resignRoom(code: string, playerId: string): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(code)
  if (!room || room.status !== 'playing') return { ok: false, error: 'Game not active' }

  const isWhite = room.white === playerId
  const isBlack = room.black === playerId
  if (!isWhite && !isBlack) return { ok: false, error: 'Not a player' }

  room.status = 'finished'
  room.winner = isWhite ? 'b' : 'w'
  broadcast(code, { type: 'resign', winner: room.winner })
  return { ok: true }
}

export function safeRoom(room: Room) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { subscribers: _s, ...rest } = room
  return rest
}

export function subscribe(code: string, playerId: string, ctrl: ReadableStreamDefaultController<Uint8Array>) {
  rooms.get(code)?.subscribers.set(playerId, ctrl)
}

export function unsubscribe(code: string, playerId: string) {
  rooms.get(code)?.subscribers.delete(playerId)
}

function broadcast(code: string, data: object) {
  const room = rooms.get(code)
  if (!room) return
  const chunk = enc.encode(`data: ${JSON.stringify(data)}\n\n`)
  for (const ctrl of room.subscribers.values()) {
    try { ctrl.enqueue(chunk) } catch {}
  }
}
