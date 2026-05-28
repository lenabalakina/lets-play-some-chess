import { NextRequest, NextResponse } from 'next/server'
import { broadcastTyping } from '@/lib/rooms'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId } = await req.json()
  broadcastTyping(code.toUpperCase(), playerId)
  return NextResponse.json({ ok: true })
}
