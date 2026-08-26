'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinQueue, leaveQueue, attemptMatch, getActiveGame } from '../actions/matchmaking'
import { MATCHMAKING_POLL_INTERVAL_MS } from '../matchmakingPresence'
import type { TimeControl } from '@/features/chess/types/chess.types'

type MatchmakingState = 'idle' | 'searching' | 'matched' | 'error'

const LEAVE_QUEUE_ENDPOINT = '/api/matchmaking/leave'

export function useMatchmaking() {
  const [state, setState]           = useState<MatchmakingState>('idle')
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid_10')
  const [error, setError]           = useState<string | null>(null)
  const [searchSeconds, setSearchSeconds] = useState(0)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchIntentRef = useRef(false)
  const queueActiveRef = useRef(false)
  const abandonedRef   = useRef(false)
  const searchIdRef    = useRef(0)
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

  const sendLeaveQueueRequest = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      if (navigator.sendBeacon(LEAVE_QUEUE_ENDPOINT)) return
    }

    void fetch(LEAVE_QUEUE_ENDPOINT, {
      method:      'POST',
      credentials: 'same-origin',
      keepalive:   true,
    }).catch(() => {})
  }, [])

  const abandonSearch = useCallback(() => {
    if (!searchIntentRef.current && !queueActiveRef.current) return
    searchIntentRef.current = false
    queueActiveRef.current = false
    stopPolling()
    sendLeaveQueueRequest()
  }, [sendLeaveQueueRequest, stopPolling])

  const startSearching = useCallback(async () => {
    const searchId = searchIdRef.current + 1
    searchIdRef.current = searchId
    searchIntentRef.current = true
    abandonedRef.current = false
    setError(null)
    setSearchSeconds(0)
    setState('searching')

    const result = await joinQueue(timeControl)
    if (abandonedRef.current || searchIdRef.current !== searchId) {
      searchIntentRef.current = false
      sendLeaveQueueRequest()
      return
    }

    if (result.error) {
      searchIntentRef.current = false
      setError(result.error)
      setState('error')
      return
    }

    queueActiveRef.current = true

    // Immediately try to match
    const match = await attemptMatch()
    if (abandonedRef.current || searchIdRef.current !== searchId) {
      abandonSearch()
      return
    }

    if (match) {
      searchIntentRef.current = false
      queueActiveRef.current = false
      setState('matched')
      router.push(`/game/${match.gameId}`)
      return
    }

    // Start polling
    timerRef.current = setInterval(() => setSearchSeconds(s => s + 1), 1000)
    pollRef.current  = setInterval(async () => {
      const m = await attemptMatch()
      if (m && !abandonedRef.current && searchIdRef.current === searchId) {
        searchIntentRef.current = false
        queueActiveRef.current = false
        stopPolling()
        setState('matched')
        router.push(`/game/${m.gameId}`)
      }
    }, MATCHMAKING_POLL_INTERVAL_MS)
  }, [abandonSearch, router, sendLeaveQueueRequest, stopPolling, timeControl])

  const cancelSearch = useCallback(async () => {
    searchIdRef.current += 1
    abandonedRef.current = true
    searchIntentRef.current = false
    queueActiveRef.current = false
    stopPolling()
    await leaveQueue()
    setState('idle')
    setSearchSeconds(0)
  }, [stopPolling])

  // Clean up on unmount
  useEffect(() => {
    const handlePageHide = () => {
      searchIdRef.current += 1
      abandonedRef.current = true
      abandonSearch()
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      searchIdRef.current += 1
      abandonedRef.current = true
      abandonSearch()
    }
  }, [abandonSearch])

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
