'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { Copy, Check, Wifi, WifiOff } from 'lucide-react'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { useBoardSize } from '@/hooks/useBoardSize'

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
  const router = useRouter()

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves,     setLegalMoves]     = useState<string[]>([])
  const [promoDialog,    setPromoDialog]     = useState(false)
  const [theme]                             = useState<BoardTheme>('neon')
  const [copied,         setCopied]         = useState(false)
  const [mobileTab,      setMobileTab]      = useState<'moves' | 'info'>('moves')
  const [leaveConfirm,   setLeaveConfirm]   = useState(false)
  const { ref: boardAreaRef, size: boardSize } = useBoardSize()
  const pendingPromoRef = useRef<{ from: string; to: string } | null>(null)
  const prevMoveCountRef = useRef(0)

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

    const chess = new Chess(room.fen)
    const moves = chess.moves({ square: sq as Parameters<typeof chess.moves>[0]['square'], verbose: true })
    const myMoves = moves.filter(() => {
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
    if (room.status === 'waiting')   return '⏳ Waiting for opponent…'
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
    <div className="flex flex-col h-[100dvh] bg-[#070d1a] text-white overflow-hidden">

      {/* ── DESKTOP HEADER (lg+) ──────────────────────────────── */}
      <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-slate-800/50 shrink-0">
        <button
          onClick={() => isGameOver ? router.push('/') : setLeaveConfirm(true)}
          aria-label="Go to homepage"
          className="flex items-center gap-3 cursor-pointer group"
        >
          <PawnIcon size={18} />
          <div>
            <h1 className="font-black text-sm tracking-widest neon-text uppercase group-hover:opacity-80 transition-opacity">Let&apos;s Play Some Chess</h1>
            <p className="text-slate-600 text-[10px] tracking-wider">Online · Room {code}</p>
          </div>
        </button>
        <div className="flex items-center gap-3">
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

      {/* ── MOBILE HEADER (< lg) ─────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-slate-800/50 shrink-0">
        <button
          onClick={() => isGameOver ? router.push('/') : setLeaveConfirm(true)}
          aria-label="Go to homepage"
          className="flex items-center gap-2 cursor-pointer group"
        >
          <PawnIcon size={16} />
          <div>
            <h1 className="font-black text-[10px] tracking-widest neon-text uppercase group-hover:opacity-80 transition-opacity">CHESS</h1>
            <p className="text-slate-600 text-[9px]">Room {code}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {room.connected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          }
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700
              text-xs font-mono font-bold text-slate-300 transition-all"
          >
            <span className="text-cyan-400">{code}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <a href="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">← Leave</a>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: color info — desktop only */}
        <aside className="hidden lg:flex w-48 shrink-0 border-r border-slate-800/40 flex-col p-4 gap-4">
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

          <div className="mt-auto">
            {room.status === 'waiting' && (
              <div className="glass-panel rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Invite friend with code</p>
                <p className="font-black text-2xl tracking-widest text-cyan-400 font-mono my-2">{code}</p>
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
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile: opponent color strip */}
          <div className="lg:hidden px-2 pt-2 pb-1 shrink-0">
            <div className={`flex items-center justify-between px-3 py-2 glass-panel rounded-xl`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{opponentColor === 'w' ? '♔' : '♚'}</span>
                <span className={`font-bold text-sm ${opponentColor === 'w' ? 'text-cyan-300' : 'text-purple-300'}`}>
                  Opponent ({opponentColor === 'w' ? 'White' : 'Black'})
                </span>
              </div>
            </div>
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden px-2 py-1 lg:px-4 lg:py-2">
            <div className={`text-[11px] font-semibold tracking-widest uppercase shrink-0 py-1 ${
              isGameOver
                ? (room.winner === myColor ? 'text-emerald-400' : room.winner === 'draw' ? 'text-slate-400' : 'text-red-400')
                : isMyTurn ? 'text-cyan-300' : 'text-slate-500'
            }`}>
              {statusText()}
            </div>

            {/* Waiting overlay */}
            <AnimatePresence>
              {room.status === 'waiting' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-24 left-1/2 -translate-x-1/2 z-20
                    glass-panel rounded-2xl px-6 py-4 text-center shadow-2xl w-[85vw] max-w-sm"
                >
                  <p className="text-slate-400 text-sm mb-1">Share code with opponent:</p>
                  <p className="font-black text-4xl tracking-widest text-cyan-400 font-mono my-2">{code}</p>
                  <button onClick={copyCode}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {copied ? '✓ Copied' : 'Copy code'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              ref={boardAreaRef}
              className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
            >
              <div style={{ width: boardSize, height: boardSize, flexShrink: 0 }}>
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
              </div>
            </div>
          </div>

          {/* Mobile: my color strip */}
          <div className="lg:hidden px-2 pb-1 shrink-0">
            <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">{myColor === 'w' ? '♔' : '♚'}</span>
                <span className={`font-bold text-sm ${myColor === 'w' ? 'text-cyan-300' : 'text-purple-300'}`}>
                  You ({myColor === 'w' ? 'White' : 'Black'})
                </span>
              </div>
              {!isGameOver && room.status === 'playing' && (
                <button
                  onClick={resign}
                  className="px-3 py-1 rounded-lg border border-red-900/50 text-red-500 hover:border-red-600
                    text-xs font-semibold transition-all"
                >
                  Resign
                </button>
              )}
            </div>
          </div>

          {/* Mobile tabs: Moves / Info */}
          <div className="lg:hidden flex flex-col border-t border-slate-800/50 shrink-0" style={{ height: 120 }}>
            <div className="flex border-b border-slate-800/50 shrink-0">
              {(['moves', 'info'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                    ${mobileTab === tab
                      ? 'text-cyan-300 border-b-2 border-cyan-500'
                      : 'text-slate-600 hover:text-slate-400'
                    }`}
                >
                  {tab === 'moves' ? 'Moves' : 'Info'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {mobileTab === 'moves' && <MoveLog moves={moveHistory} />}
              {mobileTab === 'info' && (
                <div className="p-3 space-y-2 overflow-y-auto h-full">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${myColor === 'w'
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                  }`}>
                    <span>{myColor === 'w' ? '♔' : '♚'}</span>
                    <span className="font-bold text-xs">You — {myColor === 'w' ? 'White' : 'Black'}</span>
                  </div>
                  <div className="glass-panel rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">Room code</p>
                    <p className="font-black text-xl tracking-widest text-cyan-400 font-mono">{code}</p>
                    <button onClick={copyCode} className="mt-1 text-[10px] text-slate-500 hover:text-slate-300">
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Right: move log — desktop only */}
        <aside className="hidden lg:flex w-56 shrink-0 border-l border-slate-800/40 flex-col">
          <div className="px-4 py-3 border-b border-slate-800/50 shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Move History</p>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <MoveLog moves={moveHistory} />
          </div>
        </aside>

      </main>

      <PromotionDialog
        open={promoDialog}
        color={myColor}
        onSelect={handlePromoSelect}
      />

      {/* ── Leave confirmation ───────────────────────────────────────────────── */}
      {leaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLeaveConfirm(false)}
        >
          <div
            className="bg-[#0d1829] border border-slate-700 rounded-2xl p-6 w-80 flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-bold text-base tracking-wide">Leave current game?</h2>
            <p className="text-slate-400 text-sm">Your game will be counted as a loss if you leave now.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setLeaveConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600/80 border border-red-500/60 hover:bg-red-600 transition-all cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
