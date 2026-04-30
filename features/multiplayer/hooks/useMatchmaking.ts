'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinQueue, leaveQueue, attemptMatch, getActiveGame } from '../actions/matchmaking'
import type { TimeControl } from '@/features/chess/types/chess.types'

type MatchmakingState = 'idle' | 'searching' | 'matched' | 'error'

const POLL_INTERVAL_MS = 2000

export function useMatchmaking() {
  const [state, setState]           = useState<MatchmakingState>('idle')
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid_10')
  const [error, setError]           = useState<string | null>(null)
  const [searchSeconds, setSearchSeconds] = useState(0)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const router     = useRouter()

  // On mount: check if already in an active game (reconnect)
  useEffect(() => {
    getActiveGame().then(result => {
      if (result) router.push(`/game/${result.gameId}`)
    })
  }, [router])

  const stopPolling = useCallback(() => {
    if (pollRef.current)  clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    pollRef.current  = null
    timerRef.current = null
  }, [])

  const startSearching = useCallback(async () => {
    setError(null)
    setSearchSeconds(0)
    setState('searching')

    const result = await joinQueue(timeControl)
    if (result.error) {
      setError(result.error)
      setState('error')
      return
    }

    // Immediately try to match
    const match = await attemptMatch()
    if (match) {
      setState('matched')
      router.push(`/game/${match.gameId}`)
      return
    }

    // Start polling
    timerRef.current = setInterval(() => setSearchSeconds(s => s + 1), 1000)
    pollRef.current  = setInterval(async () => {
      const m = await attemptMatch()
      if (m) {
        stopPolling()
        setState('matched')
        router.push(`/game/${m.gameId}`)
      }
    }, POLL_INTERVAL_MS)
  }, [timeControl, router, stopPolling])

  const cancelSearch = useCallback(async () => {
    stopPolling()
    await leaveQueue()
    setState('idle')
    setSearchSeconds(0)
  }, [stopPolling])

  // Clean up on unmount
  useEffect(() => () => { stopPolling() }, [stopPolling])

  return {
    state,
    timeControl,
    setTimeControl,
    searchSeconds,
    error,
    startSearching,
    cancelSearch,
  }
}
