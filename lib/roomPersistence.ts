import { createAdminClient, isRoomPersistenceEnabled } from './supabase/admin'
import type { ChatMessage, Room, RoomMove } from './roomTypes'
import {
  PLAYING_ROOM_STALE_MS,
  STALE_PLAYING_ROOM_STATUSES,
  STALE_WAITING_ROOM_STATUSES,
  WAITING_ROOM_STALE_MS,
} from './roomRetention'

interface DbPrivateRoom {
  code:             string
  fen:              string
  turn:             'w' | 'b'
  white:            string | null
  black:            string | null
  status:           Room['status']
  winner:           Room['winner']
  moves:            RoomMove[]
  messages:         ChatMessage[]
  draw_offered_by:  'w' | 'b' | null
  created_at:       string
  last_activity_at: string
}

export { isRoomPersistenceEnabled }
export {
  PLAYING_ROOM_STALE_MS,
  STALE_PLAYING_ROOM_STATUSES,
  STALE_WAITING_ROOM_STATUSES,
  WAITING_ROOM_STALE_MS,
} from './roomRetention'

function rowToRoomData(row: DbPrivateRoom): Omit<Room, 'subscribers'> {
  return {
    code:          row.code,
    fen:           row.fen,
    turn:          row.turn,
    white:         row.white,
    black:         row.black,
    status:        row.status,
    winner:        row.winner,
    moves:         row.moves ?? [],
    messages:      row.messages ?? [],
    drawOfferedBy: row.draw_offered_by,
    createdAt:     new Date(row.created_at).getTime(),
    lastActivityAt: new Date(row.last_activity_at).getTime(),
  }
}

function roomToRow(room: Room): Omit<DbPrivateRoom, 'created_at' | 'last_activity_at'> & {
  created_at: string
  last_activity_at: string
} {
  return {
    code:            room.code,
    fen:             room.fen,
    turn:            room.turn,
    white:           room.white,
    black:           room.black,
    status:          room.status,
    winner:          room.winner,
    moves:           room.moves,
    messages:        room.messages,
    draw_offered_by: room.drawOfferedBy,
    created_at:      new Date(room.createdAt).toISOString(),
    last_activity_at: new Date(room.lastActivityAt).toISOString(),
  }
}

export async function loadRoomFromDb(code: string): Promise<Omit<Room, 'subscribers'> | null> {
  const admin = createAdminClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('private_rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error || !data) return null
  return rowToRoomData(data as DbPrivateRoom)
}

export async function saveRoomToDb(room: Room): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  const { error } = await admin.from('private_rooms').upsert(roomToRow(room))
  if (error) console.error('[roomPersistence] save failed:', error.message)
}

export async function roomCodeExistsInDb(code: string): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) return false

  const { data, error } = await admin
    .from('private_rooms')
    .select('code')
    .eq('code', code)
    .maybeSingle()

  return !error && !!data
}

export async function tryClaimBlackSeatInDb(
  code: string,
  playerId: string,
): Promise<Omit<Room, 'subscribers'> | null> {
  const admin = createAdminClient()
  if (!admin) return null

  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('private_rooms')
    .update({
      black: playerId,
      status: 'playing',
      last_activity_at: now,
    })
    .eq('code', code)
    .is('black', null)
    .eq('status', 'waiting')
    .select('*')
    .maybeSingle()

  if (error || !data) return null
  return rowToRoomData(data as DbPrivateRoom)
}

export async function deleteStaleRoomsFromDb(
  olderThanMs: number,
  statuses?: Room['status'][],
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  const cutoff = new Date(Date.now() - olderThanMs).toISOString()
  const query = admin.from('private_rooms').delete().lt('last_activity_at', cutoff)
  if (statuses && statuses.length > 0) {
    await query.in('status', statuses)
    return
  }
  await query
}

export async function deleteDefaultStaleRoomsFromDb(): Promise<void> {
  await deleteStaleRoomsFromDb(WAITING_ROOM_STALE_MS, STALE_WAITING_ROOM_STATUSES)
  await deleteStaleRoomsFromDb(PLAYING_ROOM_STALE_MS, STALE_PLAYING_ROOM_STATUSES)
}
