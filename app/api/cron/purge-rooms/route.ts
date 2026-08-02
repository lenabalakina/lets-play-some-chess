import { NextRequest, NextResponse } from 'next/server'
import { deleteStaleRoomsFromDb } from '@/lib/roomPersistence'

export const runtime = 'nodejs'

const WAITING_MS = 6 * 60 * 60 * 1000   // 6h empty waiting rooms
const PLAYING_MS = 12 * 60 * 60 * 1000  // 12h abandoned games

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await deleteStaleRoomsFromDb(WAITING_MS)
  // Second pass with longer horizon catches stale playing rooms
  await deleteStaleRoomsFromDb(PLAYING_MS)

  return NextResponse.json({ ok: true, purgedBeforeMs: PLAYING_MS })
}
