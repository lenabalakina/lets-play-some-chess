import { NextRequest } from 'next/server'
import { offerDraw, respondDraw } from '@/lib/rooms'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { playerId, action } = await req.json()
  const roomCode = code.toUpperCase()

  if (action === 'offer') {
    return Response.json(offerDraw(roomCode, playerId))
  }
  if (action === 'accept' || action === 'decline') {
    return Response.json(respondDraw(roomCode, playerId, action === 'accept'))
  }
  return Response.json({ ok: false, error: 'Invalid action' }, { status: 400 })
}
