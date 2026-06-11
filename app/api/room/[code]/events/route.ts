import { NextRequest } from 'next/server'
import { resolveRoom, subscribe, unsubscribe, safeRoom, broadcastPresence } from '@/lib/rooms'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()
  const playerId  = req.nextUrl.searchParams.get('playerId')
  if (!playerId || playerId === 'anon') {
    return new Response(JSON.stringify({ error: 'playerId required' }), { status: 400 })
  }
  const connId = crypto.randomUUID()
  const enc = new TextEncoder()
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let cleaned = false

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    if (heartbeat) {
      clearInterval(heartbeat)
      heartbeat = null
    }
    unsubscribe(upperCode, playerId, connId)
    broadcastPresence(upperCode, playerId, false)
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await subscribe(upperCode, playerId, controller, connId)
      broadcastPresence(upperCode, playerId, true)

      const currentRoom = await resolveRoom(upperCode)
      if (currentRoom) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'init', room: safeRoom(currentRoom) })}\n\n`))
      } else {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', error: 'Room not found' })}\n\n`))
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(': heartbeat\n\n'))
        } catch {
          cleanup()
        }
      }, 20_000)

      req.signal.addEventListener('abort', cleanup)
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
