export type PrivateRoomStatus = 'waiting' | 'playing' | 'finished'

export const WAITING_ROOM_STALE_MS = 6 * 60 * 60 * 1000
export const PLAYING_ROOM_STALE_MS = 12 * 60 * 60 * 1000
export const STALE_WAITING_ROOM_STATUSES: PrivateRoomStatus[] = ['waiting', 'finished']
export const STALE_PLAYING_ROOM_STATUSES: PrivateRoomStatus[] = ['playing']
