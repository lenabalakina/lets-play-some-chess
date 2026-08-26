export const MATCHMAKING_POLL_INTERVAL_MS = 2000
export const MATCHMAKING_ACTIVE_WINDOW_MS = 6000

export function matchmakingActiveSince(now = new Date()): string {
  return new Date(now.getTime() - MATCHMAKING_ACTIVE_WINDOW_MS).toISOString()
}

export function isMatchmakingHeartbeatActive(lastSeenAt: string, now = new Date()): boolean {
  const timestamp = Date.parse(lastSeenAt)
  return Number.isFinite(timestamp) && timestamp >= now.getTime() - MATCHMAKING_ACTIVE_WINDOW_MS
}
