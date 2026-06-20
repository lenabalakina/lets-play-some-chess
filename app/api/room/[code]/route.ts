import { NextRequest, NextResponse } from 'next/server'
import { joinRoom, resolveRoom, roomPlayerColor, safeRoom } from '@/lib/rooms'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const room = await resolveRoom(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const color = roomPlayerColor(room, playerId)
  if (!color) return NextResponse.json({ error: 'Not a player in this room' }, { status: 403 })

  return NextResponse.json({ room: safeRoom(room), color })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const result = await joinRoom(code.toUpperCase(), playerId)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ room: safeRoom(result.room), color: result.color })
}
