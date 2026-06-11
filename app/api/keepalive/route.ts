import { NextResponse } from 'next/server'
import { createAdminClient, isRoomPersistenceEnabled } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 })
  }

  const checks: Record<string, boolean | string> = {}

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const anon = createClient(url, anonKey)
    const { error: gamesError } = await anon.from('games').select('id', { count: 'exact', head: true })
    checks.games = !gamesError
    if (gamesError) checks.gamesError = gamesError.message
  } catch (e) {
    checks.games = false
    checks.gamesError = e instanceof Error ? e.message : 'unknown'
  }

  if (isRoomPersistenceEnabled()) {
    const admin = createAdminClient()
    if (admin) {
      const { error } = await admin.from('private_rooms').select('code').limit(1)
      checks.privateRooms = !error
      checks.roomPersistence = error
        ? (error.message.includes('does not exist') ? 'migration_required' : error.message)
        : 'active'
    } else {
      checks.roomPersistence = 'misconfigured'
    }
  } else {
    checks.roomPersistence = 'memory_only'
  }

  const ok = checks.games === true
    && (checks.roomPersistence === 'active' || checks.roomPersistence === 'memory_only')

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 })
}
