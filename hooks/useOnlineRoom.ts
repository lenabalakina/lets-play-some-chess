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
  const [retryKey,      setRetryKey]      = useState(0)
  const retryCountRef   = useRef(0)
  const roomNotFoundRef = useRef(false)
  const typingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mergeRemoteRoom = useCallback((
    local: OnlineRoomState,
    rm: {
      fen: string; turn: 'w' | 'b'; status: OnlineRoomState['status']
      winner: OnlineRoomState['winner']; moves?: RoomMove[]
      messages?: ChatMessage[]; drawOfferedBy?: 'w' | 'b' | null
    },
  ): OnlineRoomState | null => {
    const rmMoves = rm.moves ?? local.moves
    const rmMessages = rm.messages ?? []
    const drawOfferedBy = rm.drawOfferedBy ?? null

    // Client already applied a newer move; ignore stale server snapshot.
    if (local.moves.length > rmMoves.length) return null

    const messages = local.messages.length > rmMessages.length ? local.messages : rmMessages

    if (
      local.fen === rm.fen &&
      local.moves.length === rmMoves.length &&
      local.turn === rm.turn &&
      local.status === rm.status &&
      local.winner === rm.winner &&
      local.drawOfferedBy === drawOfferedBy &&
      local.messages.length === messages.length
    ) {
      return null
    }

    return {
      ...local,
      fen:           rm.fen,
      turn:          rm.turn,
      status:        rm.status,
      winner:        rm.winner,
      moves:         rmMoves,
      messages,
      drawOfferedBy,
      lastMove: rmMoves.length
        ? { from: rmMoves[rmMoves.length - 1].from, to: rmMoves[rmMoves.length - 1].to }
        : local.lastMove,
    }
  }, [])

  const applyRemoteRoom = useCallback((rm: {
    fen: string; turn: 'w' | 'b'; status: OnlineRoomState['status']
    winner: OnlineRoomState['winner']; moves?: RoomMove[]
    messages?: ChatMessage[]; drawOfferedBy?: 'w' | 'b' | null
  }) => {
    setRoom(r => mergeRemoteRoom(r, rm) ?? r)
  }, [mergeRemoteRoom])

  const fetchRoomState = useCallback(async () => {
    if (!code) return
    try {
      const res = await fetch(`/api/room/${code}?playerId=${encodeURIComponent(playerId)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.room) applyRemoteRoom(data.room)
    } catch { /* ignore */ }
  }, [code, playerId, applyRemoteRoom])

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
    roomNotFoundRef.current = false
    const es = new EventSource(`/api/room/${code}/events?playerId=${encodeURIComponent(playerId)}`)

    es.onopen = () => {
      setRoom(r => ({ ...r, connected: true }))
      retryCountRef.current = 0
    }

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'init' || msg.type === 'start') {
          const rm = msg.room
          applyRemoteRoom(rm)
        } else if (msg.type === 'move') {
          setRoom(r => {
            const last = r.moves[r.moves.length - 1]
            if (last?.from === msg.from && last?.to === msg.to && last?.fen === msg.fen) {
              return { ...r, fen: msg.fen, turn: msg.turn, status: msg.status, winner: msg.winner }
            }
            return {
              ...r,
              fen:      msg.fen,
              turn:     msg.turn,
              status:   msg.status,
              winner:   msg.winner,
              lastMove: { from: msg.from, to: msg.to },
              moves:    [...r.moves, { from: msg.from, to: msg.to, promotion: msg.promotion, san: msg.san, fen: msg.fen }],
            }
          })
        } else if (msg.type === 'resign') {
          setRoom(r => ({ ...r, status: 'finished', winner: msg.winner }))
        } else if (msg.type === 'chat') {
          setRoom(r => {
            const last = r.messages[r.messages.length - 1]
            if (last?.color === msg.color && last?.text === msg.text) return r
            return { ...r, messages: [...r.messages, { color: msg.color, text: msg.text, ts: msg.ts }] }
          })
        } else if (msg.type === 'draw_offer') {
          setRoom(r => ({ ...r, drawOfferedBy: msg.by }))
        } else if (msg.type === 'draw_accepted') {
          setRoom(r => ({ ...r, status: 'finished', winner: 'draw', drawOfferedBy: null }))
        } else if (msg.type === 'draw_declined') {
          setRoom(r => ({ ...r, drawOfferedBy: null }))
        } else if (msg.type === 'presence') {
          const isOpponent = msg.color !== myColor
          if (isOpponent) {
            setRoom(r => ({ ...r, opponentOnline: msg.online }))
            if (msg.online) fetchRoomState()
          }
        } else if (msg.type === 'typing') {
          setRoom(r => ({ ...r, opponentTyping: true }))
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          typingTimerRef.current = setTimeout(
            () => setRoom(r => ({ ...r, opponentTyping: false })),
            3000,
          )
        } else if (msg.type === 'error') {
          roomNotFoundRef.current = true
          setRoom(r => ({ ...r, roomNotFound: true, connected: false }))
          es.close()
        }
      } catch {}
    }

    es.onerror = () => {
      es.close()
      setRoom(r => ({ ...r, connected: false }))
      // Side effects must be outside the state updater (state updaters must be pure)
      if (!roomNotFoundRef.current && retryCountRef.current < 5) {
        const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000)
        retryCountRef.current++
        setTimeout(() => setRetryKey(k => k + 1), delay)
      }
    }

    return () => es.close()
  }, [code, playerId, retryKey, myColor, applyRemoteRoom, fetchRoomState])

  // Fast poll while waiting for opponent (covers missed SSE start event)
  const statusRef = useRef(room.status)
  useEffect(() => { statusRef.current = room.status }, [room.status])

  useEffect(() => {
    if (!code) return
    const fast = setInterval(() => {
      if (statusRef.current === 'waiting') fetchRoomState()
    }, 1500)
    return () => clearInterval(fast)
  }, [code, fetchRoomState])

  // Poll authoritative room state as fallback (cross-instance SSE gaps)
  useEffect(() => {
    if (!code) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/${code}?playerId=${encodeURIComponent(playerId)}`)
        if (!res.ok) return
        const data = await res.json()
        const rm = data.room
        if (!rm) return
        setRoom(r => mergeRemoteRoom(r, rm) ?? r)
      } catch { /* ignore poll errors */ }
    }, 5000)
    return () => clearInterval(poll)
  }, [code, playerId, mergeRemoteRoom])

  const applyMoveToState = useCallback((msg: {
    from: string; to: string; promotion?: string; san: string; fen: string
    turn: 'w' | 'b'; status: OnlineRoomState['status']; winner: OnlineRoomState['winner']
  }) => {
    setRoom(r => {
      const last = r.moves[r.moves.length - 1]
      if (last?.from === msg.from && last?.to === msg.to && last?.fen === msg.fen) {
        return { ...r, fen: msg.fen, turn: msg.turn, status: msg.status, winner: msg.winner }
      }
      return {
        ...r,
        fen:      msg.fen,
        turn:     msg.turn,
        status:   msg.status,
        winner:   msg.winner,
        lastMove: { from: msg.from, to: msg.to },
        moves:    [...r.moves, { from: msg.from, to: msg.to, promotion: msg.promotion, san: msg.san, fen: msg.fen }],
      }
    })
  }, [])

  const makeMove = useCallback(async (from: string, to: string, promotion?: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/room/${code}/move`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId, from, to, promotion }),
      })
      const data = await res.json()
      if (data.ok && data.move && data.room) {
        applyMoveToState({
          from: data.move.from,
          to: data.move.to,
          promotion: data.move.promotion,
          san: data.move.san,
          fen: data.room.fen,
          turn: data.room.turn,
          status: data.room.status,
          winner: data.room.winner,
        })
      }
      return data
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [code, playerId, applyMoveToState])

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

  const sendChat = useCallback(async (text: string): Promise<{ ok: boolean; error?: string }> => {
    const { moderateChatMessage } = await import('@/lib/chatModeration')
    const mod = moderateChatMessage(text)
    if (!mod.ok) return { ok: false, error: mod.reason }
    const trimmed = mod.text

    const optimisticTs = Date.now()
    setRoom(r => ({
      ...r,
      messages: [...r.messages, { color: myColor, text: trimmed, ts: optimisticTs }],
    }))

    try {
      const res = await fetch(`/api/room/${code}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId, text: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setRoom(r => ({
          ...r,
          messages: r.messages.filter(m => m.ts !== optimisticTs),
        }))
        return { ok: false, error: data.error ?? 'Send failed' }
      }
      return { ok: true }
    } catch {
      setRoom(r => ({
        ...r,
        messages: r.messages.filter(m => m.ts !== optimisticTs),
      }))
      return { ok: false, error: 'Network error' }
    }
  }, [code, playerId, myColor])

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
