'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Color } from '@/features/chess/types/chess.types'

interface IncomingMove {
  from:        string
  to:          string
  san:         string
  promotion?:  string
  fen:         string
  color:       'w' | 'b'
  timeTakenMs: number
}

export interface IncomingChatMessage {
  from: Color
  text: string
  id:   number
}

interface GameChannelOptions {
  gameId:             string
  myColor:            Color
  onOpponentMove:     (move: IncomingMove) => void
  onGameOver:         (result: 'white' | 'black' | 'draw') => void
  onOpponentPresence: (online: boolean) => void
  onDrawOffer?:       () => void
  onDrawDeclined?:    () => void
  onChatMessage?:     (msg: IncomingChatMessage) => void
}

export function useGameChannel({
  gameId, myColor,
  onOpponentMove, onGameOver, onOpponentPresence,
  onDrawOffer, onDrawDeclined, onChatMessage,
}: GameChannelOptions) {
  const supabase    = createClient()
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const refs = {
    onOpponentMove:     useRef(onOpponentMove),
    onGameOver:         useRef(onGameOver),
    onOpponentPresence: useRef(onOpponentPresence),
    onDrawOffer:        useRef(onDrawOffer),
    onDrawDeclined:     useRef(onDrawDeclined),
    onChatMessage:      useRef(onChatMessage),
  }
  useEffect(() => { refs.onOpponentMove.current     = onOpponentMove },     [onOpponentMove])
  useEffect(() => { refs.onGameOver.current         = onGameOver },         [onGameOver])
  useEffect(() => { refs.onOpponentPresence.current = onOpponentPresence }, [onOpponentPresence])
  useEffect(() => { refs.onDrawOffer.current        = onDrawOffer },        [onDrawOffer])
  useEffect(() => { refs.onDrawDeclined.current     = onDrawDeclined },     [onDrawDeclined])
  useEffect(() => { refs.onChatMessage.current      = onChatMessage },      [onChatMessage])

  useEffect(() => {
    if (!gameId) return

    const channel = supabase.channel(`game:${gameId}`, {
      config: { presence: { key: myColor } },
    })

    channel
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== myColor) refs.onOpponentPresence.current(true)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== myColor) refs.onOpponentPresence.current(false)
      })

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const row = payload.new as {
          move_from: string; move_to: string; move_san: string
          fen_after: string; color: 'w' | 'b'; time_taken_ms: number
          promotion?: string
        }
        if (row.color !== myColor) {
          refs.onOpponentMove.current({
            from: row.move_from, to: row.move_to, san: row.move_san,
            fen: row.fen_after, color: row.color,
            timeTakenMs: row.time_taken_ms, promotion: row.promotion,
          })
        }
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => {
        const game = payload.new as { status: string; result: string | null }
        if (game.status === 'completed' && game.result) {
          refs.onGameOver.current(game.result as 'white' | 'black' | 'draw')
        }
      }
    )

    channel.on('broadcast', { event: 'draw_offer' }, ({ payload }) => {
      if (payload?.from !== myColor) refs.onDrawOffer.current?.()
    })
    channel.on('broadcast', { event: 'draw_declined' }, ({ payload }) => {
      if (payload?.from !== myColor) refs.onDrawDeclined.current?.()
    })
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (payload?.from !== myColor && typeof payload?.text === 'string') {
        refs.onChatMessage.current?.({
          from: payload.from as Color,
          text: payload.text,
          id:   typeof payload.id === 'number' ? payload.id : Date.now(),
        })
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online: true, color: myColor })
      }
    })

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, myColor])

  const sendDrawOffer = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast', event: 'draw_offer', payload: { from: myColor },
    })
  }, [myColor])

  const sendDrawDeclined = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast', event: 'draw_declined', payload: { from: myColor },
    })
  }, [myColor])

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim().slice(0, 120)
    if (!trimmed) return null
    const id = Date.now()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { from: myColor, text: trimmed, id },
    })
    return id
  }, [myColor])

  return { sendDrawOffer, sendDrawDeclined, sendChat }
}

export type { IncomingMove }
