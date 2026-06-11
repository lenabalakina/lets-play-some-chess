import { NextRequest, NextResponse } from 'next/server'
import { createRoom, safeRoom } from '@/lib/rooms'

export async function POST(req: NextRequest) {
  const { playerId } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const room = await createRoom(playerId)
  return NextResponse.json({ room: safeRoom(room), color: 'w' })
}
