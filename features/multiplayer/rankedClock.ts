export function getServerMoveTiming(
  updatedAt: string,
  activeClockMs: number,
  nowMs = Date.now()
): { elapsedMs: number; timedOut: boolean } {
  const updatedAtMs = Date.parse(updatedAt)
  const elapsedMs = Number.isFinite(updatedAtMs)
    ? Math.max(0, Math.floor(nowMs - updatedAtMs))
    : 0

  return {
    elapsedMs,
    timedOut: elapsedMs >= activeClockMs,
  }
}
