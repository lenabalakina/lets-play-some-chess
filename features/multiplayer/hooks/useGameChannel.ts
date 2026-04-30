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

interface GameChannelOptions {
  gameId:             string
  myColor:            Color
  onOpponentMove:     (move: IncomingMove) => void
  onGameOver:         (result: 'white' | 'black' | 'draw') => void
  onOpponentPresence: (online: boolean) => void
  onDrawOffer?:       () => void
  onDrawDeclined?:    () => void
}

export function useGameChannel({
  gameId, myColor,
  onOpponentMove, onGameOver, onOpponentPresence,
  onDrawOffer, onDrawDeclined,
}: GameChannelOptions) {
  const supabase    = createClient()
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Stable callback refs (avoids re-subscribing on every render)
  const refs = {
    onOpponentMove:     useRef(onOpponentMove),
    onGameOver:         useRef(onGameOver),
    onOpponentPresence: useRef(onOpponentPresence),
    onDrawOffer:        useRef(onDrawOffer),
    onDrawDeclined:     useRef(onDrawDeclined),
  }
  useEffect(() => { refs.onOpponentMove.current     = onOpponentMove },     [onOpponentMove])
  useEffect(() => { refs.onGameOver.current         = onGameOver },         [onGameOver])
  useEffect(() => { refs.onOpponentPresence.current = onOpponentPresence }, [onOpponentPresence])
  useEffect(() => { refs.onDrawOffer.current        = onDrawOffer },        [onDrawOffer])
  useEffect(() => { refs.onDrawDeclined.current     = onDrawDeclined },     [onDrawDeclined])

  useEffect(() => {
    if (!gameId) return

    const channel = supabase.channel(`game:${gameId}`, {
      config: { presence: { key: myColor } },
    })

    // ── Presence ───────────────────────────────────────────────────────────────
    channel
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== myColor) refs.onOpponentPresence.current(true)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== myColor) refs.onOpponentPresence.current(false)
      })

    // ── Move sync via Postgres Changes ─────────────────────────────────────────
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

    // ── Game state changes (completed) ─────────────────────────────────────────
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

    // ── Draw offer / decline broadcasts ────────────────────────────────────────
    channel.on('broadcast', { event: 'draw_offer' }, ({ payload }) => {
      if (payload?.from !== myColor) refs.onDrawOffer.current?.()
    })
    channel.on('broadcast', { event: 'draw_declined' }, ({ payload }) => {
      if (payload?.from !== myColor) refs.onDrawDeclined.current?.()
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

  return { sendDrawOffer, sendDrawDeclined }
}

export type { IncomingMove }
