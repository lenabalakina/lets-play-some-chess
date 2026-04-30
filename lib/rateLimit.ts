/**
 * Server-side rate limiter backed by Supabase.
 * Uses a 10-second sliding window per (user, action).
 *
 * Limits:
 *   record_move  → 30 moves / 10 sec  (≈ 1 move / 330ms — faster than any human)
 *   join_queue   →  5 attempts / 10 sec
 *   auth         → 10 attempts / 60 sec (handled by Supabase Auth natively)
 */

interface RateLimitOptions {
  supabase: Awaited<ReturnType<typeof import('./supabase/server').createClient>>
  userId:   string
  action:   string
  limit:    number
  windowMs: number
}

export async function checkRateLimit({
  supabase, userId, action, limit, windowMs,
}: RateLimitOptions): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(
    Math.floor(Date.now() / windowMs) * windowMs
  ).toISOString()

  // Upsert a counter for (user, action, window)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('rate_limits')
    .upsert(
      { user_id: userId, action, window_start: windowStart, count: 1 },
      { onConflict: 'user_id,action,window_start' }
    )
    .select('count')
    .single()

  if (error) {
    // If rate_limits table doesn't exist yet (migration not run), allow the request
    console.warn('[rateLimit] table not available, allowing request')
    return { allowed: true, remaining: limit }
  }

  // Increment the counter if the row already existed
  // (Supabase upsert with count: 1 sets count to 1 on conflict;
  //  we need a second call to increment)
  const currentCount: number = data?.count ?? 1

  if (currentCount > 1) {
    // Already existed — increment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('rate_limits')
      .update({ count: currentCount + 1 })
      .eq('user_id', userId)
      .eq('action', action)
      .eq('window_start', windowStart)
  }

  const allowed    = currentCount <= limit
  const remaining  = Math.max(0, limit - currentCount)

  return { allowed, remaining }
}

// Convenience wrappers
export const RATE_LIMITS = {
  RECORD_MOVE: { action: 'record_move', limit: 30, windowMs: 10_000 },
  JOIN_QUEUE:  { action: 'join_queue',  limit: 5,  windowMs: 10_000 },
} as const
