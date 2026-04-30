'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { motion, AnimatePresence } from 'framer-motion'
import { ChessBoard2D } from './ChessBoard2D'
import { MoveLog } from './MoveLog'
import { PromotionDialog } from './PromotionDialog'
import type { PromoPiece } from './PromotionDialog'
import { useOnlineRoom } from '@/hooks/useOnlineRoom'
import { chessAudio } from '@/lib/audio'
import type { Color, Square, MoveRecord, BoardTheme } from '@/features/chess/types/chess.types'
import { THEME_COLORS } from '@/features/chess/types/chess.types'
import { Copy, Check, Wifi, WifiOff, Clock } from 'lucide-react'

interface Props {
  code:     string
  playerId: string
  myColor:  Color
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function OnlineGameLayout({ code, playerId, myColor }: Props) {
  const { room, makeMove, resign, isMyTurn } = useOnlineRoom(code, playerId, myColor)

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves,     setLegalMoves]     = useState<string[]>([])
  const [promoDialog,    setPromoDialog]     = useState(false)
  const [theme]                             = useState<BoardTheme>('neon')
  const [copied,         setCopied]         = useState(false)
  const pendingPromoRef = useRef<{ from: string; to: string } | null>(null)
  const prevMoveCountRef = useRef(0)

  // Play sound on new moves
  useEffect(() => {
    if (room.moves.length > prevMoveCountRef.current) {
      chessAudio.move()
      prevMoveCountRef.current = room.moves.length
    }
  }, [room.moves.length])

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSquareClick = useCallback((sq: Square) => {
    if (!isMyTurn) return
    if (room.status !== 'playing') return

    if (selectedSquare && legalMoves.includes(sq)) {
      // Check promotion
      const chess = new Chess(room.fen)
      const piece = chess.get(selectedSquare as Parameters<typeof chess.get>[0])
      const isPromo = piece?.type === 'p' && (
        (piece.color === 'w' && sq[1] === '8') ||
        (piece.color === 'b' && sq[1] === '1')
      )
      if (isPromo) {
        pendingPromoRef.current = { from: selectedSquare, to: sq }
        setPromoDialog(true)
      } else {
        makeMove(selectedSquare, sq)
        setSelectedSquare(null)
        setLegalMoves([])
      }
      return
    }

    // Select piece
    const chess = new Chess(room.fen)
    const moves = chess.moves({ square: sq as Parameters<typeof chess.moves>[0]['square'], verbose: true })
    const myMoves = moves.filter(m => {
      const piece = chess.get(sq as Parameters<typeof chess.get>[0])
      return piece?.color === myColor
    })

    if (myMoves.length > 0) {
      setSelectedSquare(sq)
      setLegalMoves(myMoves.map(m => m.to))
    } else {
      setSelectedSquare(null)
      setLegalMoves([])
    }
  }, [isMyTurn, room.fen, room.status, selectedSquare, legalMoves, makeMove, myColor])

  const handlePromoSelect = useCallback((piece: PromoPiece) => {
    setPromoDialog(false)
    const p = pendingPromoRef.current
    if (!p) return
    makeMove(p.from, p.to, piece)
    setSelectedSquare(null)
    setLegalMoves([])
    pendingPromoRef.current = null
  }, [makeMove])

  const isGameOver = room.status === 'finished'
  const opponentColor: Color = myColor === 'w' ? 'b' : 'w'

  // Build move history for MoveLog
  const moveHistory: MoveRecord[] = room.moves.map((m, i) => ({
    san:        m.san,
    from:       m.from,
    to:         m.to,
    fen:        m.fen,
    moveNumber: Math.floor(i / 2) + 1,
    color:      (i % 2 === 0 ? 'w' : 'b') as Color,
  }))

  function statusText() {
    if (!room.connected)             return '⏳ Connecting…'
    if (room.status === 'waiting')   return '⏳ Waiting for opponent to join…'
    if (isGameOver) {
      if (room.winner === 'draw')    return 'Draw!'
      if (room.winner === myColor)   return '🏆 You win!'
      return '💀 You lose'
    }
    if (isMyTurn)  return '♟ Your move'
    return `Opponent's turn…`
  }

  const colors = THEME_COLORS[theme]

  return (
    <div className="flex flex-col h-screen bg-[#070d1a] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-lg">♟</span>
          <div>
            <h1 className="font-black text-sm tracking-widest neon-text uppercase">Let&apos;s Play Some Chess</h1>
            <p className="text-slate-600 text-[10px] tracking-wider">Online · Room {code}</p>
          </div>
        </div>

        {/* Room code share */}
        <div className="flex items-center gap-2">
          {room.connected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          }
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700
              hover:border-slate-500 text-xs font-mono font-bold tracking-widest text-slate-300 transition-all"
          >
            <span className="text-cyan-400">{code}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <span className="text-slate-600 text-[10px]">Share this code</span>
        </div>

        <a href="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">← Leave</a>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: color info */}
        <aside className="w-48 shrink-0 border-r border-slate-800/40 flex flex-col p-4 gap-4">
          <div>
            <p className="text-slate-600 text-[10px] font-semibold tracking-widest uppercase mb-2">You are playing</p>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${myColor === 'w'
              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
              : 'border-purple-500/40 bg-purple-500/10 text-purple-300'
            }`}>
              <span className="text-xl">{myColor === 'w' ? '♔' : '♚'}</span>
              <span className="font-bold text-sm">{myColor === 'w' ? 'White' : 'Black'}</span>
            </div>
          </div>

          <div>
            <p className="text-slate-600 text-[10px] font-semibold tracking-widest uppercase mb-2">Opponent</p>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${opponentColor === 'w'
              ? 'border-cyan-500/20 bg-slate-800/50 text-slate-400'
              : 'border-purple-500/20 bg-slate-800/50 text-slate-400'
            }`}>
              <span className="text-xl">{opponentColor === 'w' ? '♔' : '♚'}</span>
              <span className="font-bold text-sm">{opponentColor === 'w' ? 'White' : 'Black'}</span>
            </div>
          </div>

          {/* Status */}
          <div className="mt-auto">
            {room.status === 'waiting' && (
              <div className="glass-panel rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Invite friend with code</p>
                <p className="font-black text-2xl tracking-widest text-cyan-400 font-mono">{code}</p>
                <button
                  onClick={copyCode}
                  className="mt-2 w-full py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy code'}
                </button>
              </div>
            )}

            {!isGameOver && room.status === 'playing' && (
              <button
                onClick={resign}
                className="w-full py-2 rounded-lg border border-red-900/50 text-red-500 hover:border-red-600
                  hover:text-red-400 text-xs font-semibold transition-all"
              >
                Resign
              </button>
            )}
          </div>
        </aside>

        {/* Center: board */}
        <section className="flex-1 flex flex-col items-center justify-center gap-3 px-4 py-2 min-w-0">
          {/* Status bar */}
          <div className={`text-xs font-semibold tracking-widest uppercase transition-colors ${
            isGameOver
              ? (room.winner === myColor ? 'text-emerald-400' : room.winner === 'draw' ? 'text-slate-400' : 'text-red-400')
              : isMyTurn ? 'text-cyan-300' : 'text-slate-500'
          }`}>
            {statusText()}
          </div>

          {/* Waiting overlay hint */}
          <AnimatePresence>
            {room.status === 'waiting' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-24 left-1/2 -translate-x-1/2 z-20
                  glass-panel rounded-2xl px-8 py-5 text-center shadow-2xl"
              >
                <p className="text-slate-400 text-sm mb-1">Share this code with your opponent:</p>
                <p className="font-black text-4xl tracking-widest text-cyan-400 font-mono my-2">{code}</p>
                <button onClick={copyCode}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copied ? '✓ Link copied' : 'Copy code'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <ChessBoard2D
            fen={room.fen}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={room.lastMove as { from: Square; to: Square } | null}
            theme={theme}
            showCoords={true}
            playerColor={myColor}
            isMyTurn={isMyTurn}
            isGameOver={isGameOver}
            onSquareClick={handleSquareClick}
          />
        </section>

        {/* Right: move log */}
        <aside className="w-56 shrink-0 border-l border-slate-800/40 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800/50">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Move History</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <MoveLog moves={moveHistory} />
          </div>
        </aside>
      </main>

      <PromotionDialog
        open={promoDialog}
        color={myColor}
        onSelect={handlePromoSelect}
      />
    </div>
  )
}
