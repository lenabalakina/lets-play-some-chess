import { NextRequest, NextResponse } from 'next/server'
import { deleteDefaultStaleRoomsFromDb, PLAYING_ROOM_STALE_MS } from '@/lib/roomPersistence'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  await deleteDefaultStaleRoomsFromDb()

  return NextResponse.json({ ok: true, purgedBeforeMs: PLAYING_ROOM_STALE_MS })
}
