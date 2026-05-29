'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Color } from '@/features/chess/types/chess.types'

export interface RoomMove {
  from: string; to: string; promotion?: string; san: string; fen: string
}

export interface ChatMessage {
  color: 'w' | 'b'
  text:  string
  ts:    number
}

export interface OnlineRoomState {
  fen:            string
  turn:           'w' | 'b'
  status:         'waiting' | 'playing' | 'finished'
  winner:         'w' | 'b' | 'draw' | null
  moves:          RoomMove[]
  messages:       ChatMessage[]
  connected:      boolean
  lastMove:       { from: string; to: string } | null
  drawOfferedBy:  'w' | 'b' | null
  opponentTyping:  boolean
  opponentOnline:  boolean
  roomNotFound:   boolean
}

export function useOnlineRoom(code: string, playerId: string, myColor: Color) {
  const [retryKey,    setRetryKey]    = useState(0)
  const retryCountRef = useRef(0)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [room, setRoom] = useState<OnlineRoomState>({
    fen:            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn:           'w',
    status:         'waiting',
    winner:         null,
    moves:          [],
    messages:       [],
    connected:      false,
    lastMove:       null,
    drawOfferedBy:  null,
    opponentTyping: false,
    opponentOnline: false,
    roomNotFound:   false,
  })

  // SSE connection with auto-reconnect (exponential backoff, max 5 retries)
  useEffect(() => {
    if (!code || !playerId) return
    const es = new EventSource(`/api/room/${code}/events?playerId=${playerId}`)

    es.onopen = () => {
      setRoom(r => ({ ...r, connected: true }))
      retryCountRef.current = 0
    }

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'init' || msg.type === 'start') {
          const rm = msg.room
          setRoom(r => ({
            ...r,
            fen:      rm.fen,
            turn:     rm.turn,
            status:   rm.status,
            winner:   rm.winner,
            moves:    rm.moves ?? [],
            messages: rm.messages ?? [],
            lastMove: rm.moves?.length
              ? { from: rm.moves[rm.moves.length - 1].from, to: rm.moves[rm.moves.length - 1].to }
              : null,
          }))
        } else if (msg.type === 'move') {
          setRoom(r => ({
            ...r,
            fen:      msg.fen,
            turn:     msg.turn,
            status:   msg.status,
            winner:   msg.winner,
            lastMove: { from: msg.from, to: msg.to },
            moves:    [...r.moves, { from: msg.from, to: msg.to, promotion: msg.promotion, san: msg.san, fen: msg.fen }],
          }))
        } else if (msg.type === 'resign') {
          setRoom(r => ({ ...r, status: 'finished', winner: msg.winner }))
        } else if (msg.type === 'chat') {
          setRoom(r => ({ ...r, messages: [...r.messages, { color: msg.color, text: msg.text, ts: msg.ts }] }))
        } else if (msg.type === 'draw_offer') {
          setRoom(r => ({ ...r, drawOfferedBy: msg.by }))
        } else if (msg.type === 'draw_accepted') {
          setRoom(r => ({ ...r, status: 'finished', winner: 'draw', drawOfferedBy: null }))
        } else if (msg.type === 'draw_declined') {
          setRoom(r => ({ ...r, drawOfferedBy: null }))
        } else if (msg.type === 'presence') {
          const isOpponent = msg.color !== myColor
          if (isOpponent) setRoom(r => ({ ...r, opponentOnline: msg.online }))
        } else if (msg.type === 'typing') {
          setRoom(r => ({ ...r, opponentTyping: true }))
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          typingTimerRef.current = setTimeout(
            () => setRoom(r => ({ ...r, opponentTyping: false })),
            3000,
          )
        } else if (msg.type === 'error') {
          setRoom(r => ({ ...r, roomNotFound: true, connected: false }))
          es.close()
        }
      } catch {}
    }

    es.onerror = () => {
      setRoom(r => {
        // Don't retry if room doesn't exist — retrying won't help
        if (r.roomNotFound) return { ...r, connected: false }
        if (retryCountRef.current < 5) {
          const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000)
          retryCountRef.current++
          setTimeout(() => setRetryKey(k => k + 1), delay)
        }
        return { ...r, connected: false }
      })
      es.close()
    }

    return () => es.close()
  }, [code, playerId, retryKey])

  const makeMove = useCallback(async (from: string, to: string, promotion?: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/room/${code}/move`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId, from, to, promotion }),
      })
      const data = await res.json()
      return data
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [code, playerId])

  const resign = useCallback(async () => {
    await fetch(`/api/room/${code}/resign`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId }),
    })
  }, [code, playerId])

  const sendTyping = useCallback(() => {
    fetch(`/api/room/${code}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    }).catch(() => {})
  }, [code, playerId])

  const sendChat = useCallback(async (text: string) => {
    await fetch(`/api/room/${code}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId, text }),
    })
  }, [code, playerId])

  const offerDraw = useCallback(async () => {
    await fetch(`/api/room/${code}/draw`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId, action: 'offer' }),
    })
  }, [code, playerId])

  const respondToDraw = useCallback(async (accept: boolean) => {
    await fetch(`/api/room/${code}/draw`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId, action: accept ? 'accept' : 'decline' }),
    })
  }, [code, playerId])

  const isMyTurn = room.status === 'playing' && room.turn === myColor

  return { room, makeMove, resign, sendChat, sendTyping, offerDraw, respondToDraw, isMyTurn }
}
