import { NextRequest } from 'next/server'
import { rooms, subscribe, unsubscribe, safeRoom } from '@/lib/rooms'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()
  const playerId  = req.nextUrl.searchParams.get('playerId') ?? 'anon'

  const room = rooms.get(upperCode)
  const enc  = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send initial state immediately
      if (room) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'init', room: safeRoom(room) })}\n\n`))
      } else {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', error: 'Room not found' })}\n\n`))
      }

      subscribe(upperCode, playerId, controller)

      // Keep-alive heartbeat every 20 s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 20_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe(upperCode, playerId)
      })
    },
    cancel() {
      unsubscribe(upperCode, playerId)
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
