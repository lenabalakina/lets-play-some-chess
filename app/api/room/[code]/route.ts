import { NextRequest, NextResponse } from 'next/server'
import { rooms, joinRoom, safeRoom } from '@/lib/rooms'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const room = rooms.get(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  return NextResponse.json({ room: safeRoom(room) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const result = joinRoom(code.toUpperCase(), playerId)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ room: safeRoom(result.room), color: result.color })
}
