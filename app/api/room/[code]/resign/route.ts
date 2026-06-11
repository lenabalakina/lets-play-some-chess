import { NextRequest, NextResponse } from 'next/server'
import { resignRoom } from '@/lib/rooms'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const result = await resignRoom(code.toUpperCase(), playerId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
