'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Color } from '@/features/chess/types/chess.types'

export interface RoomMove {
  from: string; to: string; promotion?: string; san: string; fen: string
}

export interface OnlineRoomState {
  fen:       string
  turn:      'w' | 'b'
  status:    'waiting' | 'playing' | 'finished'
  winner:    'w' | 'b' | 'draw' | null
  moves:     RoomMove[]
  connected: boolean
  lastMove:  { from: string; to: string } | null
}

export function useOnlineRoom(code: string, playerId: string, myColor: Color) {
  const [room, setRoom] = useState<OnlineRoomState>({
    fen:       'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn:      'w',
    status:    'waiting',
    winner:    null,
    moves:     [],
    connected: false,
    lastMove:  null,
  })

  // SSE connection
  useEffect(() => {
    if (!code || !playerId) return
    const es = new EventSource(`/api/room/${code}/events?playerId=${playerId}`)

    es.onopen = () => setRoom(r => ({ ...r, connected: true }))

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
        }
      } catch {}
    }

    es.onerror = () => setRoom(r => ({ ...r, connected: false }))

    return () => es.close()
  }, [code, playerId])

  const makeMove = useCallback(async (from: string, to: string, promotion?: string) => {
    await fetch(`/api/room/${code}/move`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId, from, to, promotion }),
    })
  }, [code, playerId])

  const resign = useCallback(async () => {
    await fetch(`/api/room/${code}/resign`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId }),
    })
  }, [code, playerId])

  const isMyTurn = room.status === 'playing' && room.turn === myColor

  return { room, makeMove, resign, isMyTurn }
}
