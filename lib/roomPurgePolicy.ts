export const PLAYING_ROOM_STALE_MS = 12 * 60 * 60 * 1000

export function getStaleRoomCutoffs(olderThanMs: number, now = Date.now()): {
  inactiveCutoff: string
  playingCutoff: string
} {
  return {
    inactiveCutoff: new Date(now - olderThanMs).toISOString(),
    playingCutoff:  new Date(now - Math.max(olderThanMs, PLAYING_ROOM_STALE_MS)).toISOString(),
  }
}
