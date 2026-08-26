import { NextResponse } from 'next/server'
import { leaveQueue } from '@/features/multiplayer/actions/matchmaking'

export async function POST() {
  await leaveQueue()
  return NextResponse.json({ ok: true })
}
