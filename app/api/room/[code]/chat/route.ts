import { NextRequest, NextResponse } from 'next/server'
import { sendChat } from '@/lib/rooms'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId, text } = await req.json()
  if (!playerId || !text) return NextResponse.json({ error: 'playerId and text required' }, { status: 400 })
  const result = await sendChat(code.toUpperCase(), playerId, text)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
