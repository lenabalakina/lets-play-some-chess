import { NextResponse } from 'next/server'
import { createAdminClient, isRoomPersistenceEnabled } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  const configured = isRoomPersistenceEnabled()
  if (!configured) {
    return NextResponse.json({
      ok: true,
      persistence: 'memory_only',
      message: 'SUPABASE_SERVICE_ROLE_KEY not configured; rooms are in-memory only.',
    })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({
      ok: false,
      persistence: 'misconfigured',
      message: 'Invalid Supabase configuration.',
    }, { status: 503 })
  }

  const { error } = await admin
    .from('private_rooms')
    .select('code,white_time_ms,black_time_ms,clock_started_at')
    .limit(1)
  if (error) {
    const missing = error.message.includes('does not exist') ||
      error.message.includes('column') ||
      error.code === '42P01' ||
      error.code === '42703'
    return NextResponse.json({
      ok: false,
      persistence: missing ? 'migration_required' : 'error',
      message: missing
        ? 'Run supabase/migrations/003_private_rooms.sql in the Supabase SQL editor.'
        : error.message,
    }, { status: missing ? 503 : 500 })
  }

  return NextResponse.json({
    ok: true,
    persistence: 'supabase',
    message: 'Private rooms are persisted to Supabase.',
  })
}
