'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Color } from '../types/chess.types'

interface UseTimerOptions {
  initialWhiteMs: number
  initialBlackMs: number
  activeColor:    Color | null   // null = paused (game over / not started)
  onTimeout:      (color: Color) => void
  syncInitial?:    boolean
}

export function useTimer({ initialWhiteMs, initialBlackMs, activeColor, onTimeout, syncInitial = false }: UseTimerOptions) {
  const [whiteMs, setWhiteMs] = useState(initialWhiteMs)
  const [blackMs, setBlackMs] = useState(initialBlackMs)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef<number>(Date.now())

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => {
    if (!syncInitial) return
    setWhiteMs(initialWhiteMs)
    setBlackMs(initialBlackMs)
    lastTickRef.current = Date.now()
  }, [initialWhiteMs, initialBlackMs, syncInitial])

  useEffect(() => {
    clear()
    if (!activeColor) return

    lastTickRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const now    = Date.now()
      const delta  = now - lastTickRef.current
      lastTickRef.current = now

      if (activeColor === 'w') {
        setWhiteMs(ms => {
          const next = ms - delta
          if (next <= 0) { clear(); onTimeout('w'); return 0 }
          return next
        })
      } else {
        setBlackMs(ms => {
          const next = ms - delta
          if (next <= 0) { clear(); onTimeout('b'); return 0 }
          return next
        })
      }
    }, 100)

    return clear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColor])

  const reset = useCallback((whiteMs: number, blackMs: number) => {
    clear()
    setWhiteMs(whiteMs)
    setBlackMs(blackMs)
  }, [])

  return { whiteMs, blackMs, reset }
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
