import { NextRequest, NextResponse } from 'next/server'
import { applyMove } from '@/lib/rooms'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId, from, to, promotion } = await req.json()
  if (!playerId || !from || !to) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const result = applyMove(code.toUpperCase(), playerId, from, to, promotion)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
