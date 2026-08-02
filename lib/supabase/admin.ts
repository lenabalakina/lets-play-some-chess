import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getAdminConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  // Skip placeholder values from .env.local.example
  if (url.includes('your-project') || key.includes('your-')) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  } catch {
    return null
  }
  return { url, key }
}

/** Service-role client for server-only operations (bypasses RLS). Returns null if not configured. */
export function createAdminClient(): SupabaseClient | null {
  const cfg = getAdminConfig()
  if (!cfg) return null
  try {
    return createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } })
  } catch {
    return null
  }
}

export function requireAdminClient(): SupabaseClient {
  const client = createAdminClient()
  if (!client) throw new Error('Server database write client is not configured')
  return client
}

export function isRoomPersistenceEnabled(): boolean {
  return getAdminConfig() !== null
}
