'use client'

import { useEffect, useRef, useState } from 'react'

export type AiLevel = 'easy' | 'intermediate' | 'hard'

const LEVEL_MAP: Record<AiLevel, { elo: number | null; skill: number; depth: number; moveTime: number; delay: number }> = {
  easy:         { elo: 800,  skill: 5,  depth: 3,  moveTime: 800,  delay: 600  },
  intermediate: { elo: 1200, skill: 8,  depth: 5,  moveTime: 1000, delay: 800  },
  hard:         { elo: null, skill: 20, depth: 15, moveTime: 1500, delay: 400  },
}

interface UseStockfishOptions {
  enabled:  boolean
  level:    AiLevel
  fen:      string
  myColor:  'w' | 'b'
  turn:     'w' | 'b'
  onMove:   (from: string, to: string, promotion?: string) => void
}

export function useStockfish({ enabled, level, fen, myColor, turn, onMove }: UseStockfishOptions) {
  const workerRef  = useRef<Worker | null>(null)
  const readyRef   = useRef(false)
  const pendingRef = useRef(false)
  const onMoveRef  = useRef(onMove)
  const [thinking, setThinking] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => { onMoveRef.current = onMove }, [onMove])

  // Init worker once when enabled
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    try {
      const worker = new Worker('/stockfish.js')

      worker.onmessage = (e: MessageEvent<string>) => {
        const line = typeof e.data === 'string' ? e.data : String(e.data)
        if (line === 'readyok') {
          readyRef.current = true
          setReady(true)
        }
        if (line.startsWith('bestmove')) {
          pendingRef.current = false
          setThinking(false)
          const parts = line.split(' ')
          const move  = parts[1]
          if (!move || move === '(none)') return
          const from      = move.slice(0, 2)
          const to        = move.slice(2, 4)
          const promotion = move.length === 5 ? move[4] : undefined
          onMoveRef.current(from, to, promotion)
        }
      }

      worker.postMessage('uci')
      worker.postMessage('isready')
      workerRef.current = worker
    } catch (err) {
      console.warn('Stockfish worker failed to load:', err)
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      readyRef.current   = false
      pendingRef.current = false
      setThinking(false)
      setReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Trigger AI move when it's the AI's turn
  useEffect(() => {
    if (!enabled) return
    if (turn === myColor) return
    if (pendingRef.current) return
    if (!workerRef.current || !readyRef.current) return

    const cfg = LEVEL_MAP[level]
    pendingRef.current = true

    const timer = setTimeout(() => {
      if (!workerRef.current || !pendingRef.current) return
      setThinking(true)
      const w = workerRef.current
      if (cfg.elo !== null) {
        w.postMessage('setoption name UCI_LimitStrength value true')
        w.postMessage(`setoption name UCI_Elo value ${cfg.elo}`)
      } else {
        w.postMessage('setoption name UCI_LimitStrength value false')
      }
      w.postMessage(`setoption name Skill Level value ${cfg.skill}`)
      w.postMessage(`position fen ${fen}`)
      w.postMessage(`go depth ${cfg.depth} movetime ${cfg.moveTime}`)
    }, cfg.delay)

    return () => {
      clearTimeout(timer)
      pendingRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, turn, fen, level, myColor, ready])

  return { thinking }
}
