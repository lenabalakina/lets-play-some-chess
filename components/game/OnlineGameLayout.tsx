'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Chess } from 'chess.js'
import { motion, AnimatePresence } from 'framer-motion'
import { ChessBoard2D } from './ChessBoard2D'
import { MoveLog } from './MoveLog'
import { PromotionDialog } from './PromotionDialog'
import type { PromoPiece } from './PromotionDialog'
import { useOnlineRoom } from '@/hooks/useOnlineRoom'
import { getLegalTargetsForPlayer } from '@/features/chess/boardCoordinates'
import { useTimer, formatTime } from '@/features/chess/hooks/useTimer'
import type { GameResultColor } from '@/features/chess/types/chess.types'
import { GameResultModal } from './GameResultModal'
import { toast } from 'sonner'
import { chessAudio } from '@/lib/audio'
import type { Color, Square, MoveRecord, BoardTheme } from '@/features/chess/types/chess.types'
import { Copy, Check, Wifi, WifiOff, Send } from 'lucide-react'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { useBoardSize } from '@/hooks/useBoardSize'

const ChessBoard3D = dynamic(
  () => import('@/components/3d/ChessBoard3D').then(m => ({ default: m.ChessBoard3D })),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-slate-900/40 rounded-sm animate-pulse" /> }
)

interface Props {
  code:     string
  playerId: string
  myColor:  Color
}

export function OnlineGameLayout({ code, playerId, myColor }: Props) {
  const { room, makeMove, resign, claimTimeout, sendChat, sendTyping, offerDraw, respondToDraw, isMyTurn } = useOnlineRoom(code, playerId, myColor)
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const handleTimeout = useCallback((color: Color) => {
    if (color === room.turn && room.status === 'playing') {
      void claimTimeout()
    }
  }, [claimTimeout, room.status, room.turn])

  const { whiteMs, blackMs, reset: resetDisplayedClock } = useTimer({
    initialWhiteMs: room.whiteMs,
    initialBlackMs: room.blackMs,
    activeColor:    room.status === 'playing' ? room.turn : null,
    onTimeout:      handleTimeout,
  })

  useEffect(() => {
    resetDisplayedClock(room.whiteMs, room.blackMs)
  }, [room.whiteMs, room.blackMs, room.clockStartedAt, resetDisplayedClock])

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves,     setLegalMoves]     = useState<string[]>([])
  const [promoDialog,    setPromoDialog]     = useState(false)
  const [theme]                             = useState<BoardTheme>('neon')
  const [copied,         setCopied]         = useState(false)
  const [mobileTab,      setMobileTab]      = useState<'moves' | 'chat' | 'info'>('moves')
  const [desktopTab,     setDesktopTab]     = useState<'moves' | 'chat'>('chat')
  const [leaveConfirm,   setLeaveConfirm]   = useState(false)
  const [resignConfirm,  setResignConfirm]  = useState(false)
  const [moveError,      setMoveError]      = useState<string | null>(null)
  const [view3D,         setView3D]         = useState(false)

  function toggle3D() {
    setView3D(v => !v)
    setSelectedSquare(null)
    setLegalMoves([])
  }
  const [chatInput,      setChatInput]      = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { ref: boardAreaRef, size: boardSize } = useBoardSize()
  const pendingPromoRef = useRef<{ from: string; to: string } | null>(null)
  const prevMoveCountRef = useRef(0)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room.messages])

  useEffect(() => {
    if (room.opponentTyping) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [room.opponentTyping])

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    const result = await sendChat(text)
    if (!result.ok) toast.error(result.error ?? 'Could not send message')
  }

  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    if (room.moves.length > prevMoveCountRef.current) {
      chessAudio.move()
      prevMoveCountRef.current = room.moves.length
    }
  }, [room.moves.length])

  useEffect(() => {
    if (room.messages.length > prevMsgCountRef.current) {
      const last = room.messages[room.messages.length - 1]
      if (last?.color !== myColor) chessAudio.chatMessage()
      prevMsgCountRef.current = room.messages.length
    }
  }, [room.messages, myColor])

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
        const from = selectedSquare
        setSelectedSquare(null)
        setLegalMoves([])
        makeMove(from, sq).then(result => {
          if (!result.ok) {
            setMoveError(result.error ?? 'Move failed')
            setTimeout(() => setMoveError(null), 3000)
          }
        })
      }
      return
    }

    const myMoves = getLegalTargetsForPlayer(room.fen, sq, myColor)

    if (myMoves.length > 0) {
      setSelectedSquare(sq)
      setLegalMoves(myMoves)
    } else {
      setSelectedSquare(null)
      setLegalMoves([])
    }
  }, [isMyTurn, room.fen, room.status, selectedSquare, legalMoves, makeMove, myColor])

  const handlePromoSelect = useCallback((piece: PromoPiece) => {
    setPromoDialog(false)
    const p = pendingPromoRef.current
    if (!p) return
    makeMove(p.from, p.to, piece).then(result => {
      if (!result.ok) {
        setMoveError(result.error ?? 'Move failed')
        setTimeout(() => setMoveError(null), 3000)
      }
    })
    setSelectedSquare(null)
    setLegalMoves([])
    pendingPromoRef.current = null
  }, [makeMove])

  const isGameOver = room.status === 'finished'
  const opponentColor: Color = myColor === 'w' ? 'b' : 'w'
  const myMs  = myColor === 'w' ? whiteMs : blackMs
  const oppMs = opponentColor === 'w' ? whiteMs : blackMs
  const gameResult: GameResultColor | null = isGameOver
    ? (room.winner === 'draw' ? 'draw'
      : room.winner === 'w' ? 'white'
      : room.winner === 'b' ? 'black'
      : null)
    : null

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
    if (room.status === 'waiting')   return room.opponentOnline ? '🟢 Opponent connected!' : '⏳ Waiting for opponent…'
    if (isGameOver) {
      if (room.winner === 'draw')    return 'Draw!'
      if (room.winner === myColor)   return '🏆 You win!'
      return '💀 You lose'
    }
    if (isMyTurn)  return '♟ Your move'
    return `Opponent's turn…`
  }

  // Room no longer exists on the server (expired or server restarted)
  if (room.roomNotFound) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex flex-col items-center justify-center gap-6 text-white px-6">
        <div className="text-5xl">♟</div>
        <div className="text-center">
          <h1 className="text-xl font-black mb-2">Room no longer exists</h1>
          <p className="text-slate-400 text-sm max-w-xs">
            This game session has expired. Create a new room and share the code with your opponent.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => { localStorage.removeItem('chess_last_room'); router.push('/play/online') }}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition-colors"
          >
            New Game
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-semibold transition-colors text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

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
        <button onClick={() => isGameOver ? router.push('/') : setLeaveConfirm(true)} className="text-slate-600 hover:text-slate-400 text-xs transition-colors cursor-pointer">← Leave</button>
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
          <button onClick={() => isGameOver ? router.push('/') : setLeaveConfirm(true)} className="text-slate-600 hover:text-slate-400 text-xs transition-colors cursor-pointer">← Leave</button>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Center: board */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

          {/* Mobile: opponent color strip */}
          <div className="lg:hidden px-2 pt-2 pb-1 shrink-0">
            <div className={`flex items-center justify-between px-3 py-2 glass-panel rounded-xl`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{opponentColor === 'w' ? '♔' : '♚'}</span>
                <span className={`font-bold text-sm ${opponentColor === 'w' ? 'text-cyan-300' : 'text-purple-300'}`}>
                  Opponent ({opponentColor === 'w' ? 'White' : 'Black'})
                </span>
              </div>
              {room.status === 'playing' && (
                <span className={`font-mono text-sm font-bold tabular-nums ${room.turn === opponentColor ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {formatTime(oppMs)}
                </span>
              )}
            </div>
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden px-2 py-1 lg:px-4 lg:py-2">
            <div className={`text-[11px] font-semibold tracking-widest uppercase shrink-0 py-1 ${
              moveError
                ? 'text-red-400'
                : isGameOver
                  ? (room.winner === myColor ? 'text-emerald-400' : room.winner === 'draw' ? 'text-slate-400' : 'text-red-400')
                  : isMyTurn ? 'text-cyan-300' : 'text-slate-500'
            }`}>
              {moveError ?? statusText()}
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
                {view3D
                  ? <ChessBoard3D
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
                  : <ChessBoard2D
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
                }
              </div>
            </div>
          </div>

          {/* Draw offer notification — mobile */}
          {room.drawOfferedBy && room.drawOfferedBy !== myColor && !isGameOver && (
            <div className="lg:hidden mx-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
              <span className="text-amber-300 text-[10px] font-bold flex-1">Opponent offered a draw</span>
              <button onClick={() => respondToDraw(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                Accept
              </button>
              <button onClick={() => respondToDraw(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 text-[10px] font-bold">
                Decline
              </button>
            </div>
          )}

          {/* Mobile: my color strip */}
          <div className="lg:hidden px-2 pb-1 shrink-0">
            <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{myColor === 'w' ? '♔' : '♚'}</span>
                <span className={`font-bold text-sm truncate ${myColor === 'w' ? 'text-cyan-300' : 'text-purple-300'}`}>
                  You ({myColor === 'w' ? 'White' : 'Black'})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {room.status === 'playing' && (
                  <span className={`font-mono text-sm font-bold tabular-nums ${room.turn === myColor ? 'text-cyan-300' : 'text-slate-500'}`}>
                    {formatTime(myMs)}
                  </span>
                )}
                {!isGameOver && room.status === 'playing' && (
                  <>
                    {!room.drawOfferedBy && (
                      <button onClick={offerDraw}
                        className="px-2.5 py-1 rounded-lg border border-slate-600/50 text-slate-400 text-xs font-semibold transition-all">
                        ½
                      </button>
                    )}
                    <button onClick={() => setResignConfirm(true)}
                      className="px-3 py-1 rounded-lg border border-red-900/50 text-red-500 hover:border-red-600
                        text-xs font-semibold transition-all">
                      Resign
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile tabs: Moves / Chat / Info */}
          <div className="lg:hidden flex flex-col border-t border-slate-800/50 shrink-0" style={{ height: 150 }}>
            <div className="flex border-b border-slate-800/50 shrink-0">
              {(['moves', 'chat', 'info'] as const).map(tab => (
                <button key={tab} onClick={() => setMobileTab(tab)}
                  className={`relative flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                    ${mobileTab === tab ? 'text-cyan-300 border-b-2 border-cyan-500' : 'text-slate-600 hover:text-slate-400'}`}>
                  {tab}
                  {tab === 'chat' && room.opponentTyping && mobileTab !== 'chat' && (
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {mobileTab === 'moves' && <MoveLog moves={moveHistory} />}
              {mobileTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
                    {room.messages.length === 0 && (
                      <p className="text-slate-600 text-[10px] text-center mt-2">No messages yet</p>
                    )}
                    {room.messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.color === myColor ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-2.5 py-1.5 rounded-xl text-sm max-w-[75%] break-words leading-snug
                          ${msg.color === myColor
                            ? 'bg-cyan-500/25 text-white'
                            : 'bg-slate-700/80 text-slate-100'
                          }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {room.opponentTyping && (
                      <div className="flex items-start">
                        <div className="px-2.5 py-2 rounded-xl bg-slate-700/80 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendChat} className="flex gap-1.5 p-2 border-t border-slate-800/50 shrink-0">
                    <input
                      value={chatInput}
                      onChange={e => {
                        setChatInput(e.target.value)
                        if (!typingDebounceRef.current) sendTyping()
                        if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
                        typingDebounceRef.current = setTimeout(() => { typingDebounceRef.current = null }, 2000)
                      }}
                      placeholder="Message…"
                      maxLength={200}
                      className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button type="submit" disabled={!chatInput.trim()}
                      className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 disabled:opacity-30 transition-all">
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              )}
              {mobileTab === 'info' && (
                <div className="p-3 space-y-2 overflow-y-auto h-full">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${myColor === 'w'
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                  }`}>
                    <span>{myColor === 'w' ? '♔' : '♚'}</span>
                    <span className="font-bold text-xs">You — {myColor === 'w' ? 'White' : 'Black'}</span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-slate-400 text-xs">3D Board</span>
                    <button role="switch" aria-checked={view3D} onClick={toggle3D}
                      className={`relative w-9 h-5 rounded-full transition-colors ${view3D ? 'bg-fuchsia-500' : 'bg-slate-700'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${view3D ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
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

        {/* Right panel — desktop only */}
        <aside className="hidden lg:flex w-64 shrink-0 border-l border-slate-800/40 flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-800/50 shrink-0">
            {(['chat', 'moves'] as const).map(tab => (
              <button key={tab} onClick={() => setDesktopTab(tab)}
                className={`relative flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                  ${desktopTab === tab ? 'text-cyan-300 border-b-2 border-cyan-500' : 'text-slate-600 hover:text-slate-400'}`}>
                {tab === 'chat' ? 'Chat' : 'Moves'}
                {tab === 'chat' && room.opponentTyping && desktopTab !== 'chat' && (
                  <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {desktopTab === 'moves' && (
            <div className="flex-1 overflow-hidden min-h-0">
              <MoveLog moves={moveHistory} />
            </div>
          )}

          {desktopTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {room.messages.length === 0 && (
                  <p className="text-slate-600 text-[11px] text-center mt-4">No messages yet</p>
                )}
                {room.messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-0.5 ${msg.color === myColor ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-500 font-semibold px-1">
                      {msg.color === myColor ? 'You' : 'Opponent'}
                    </span>
                    <div className={`px-3 py-2 rounded-xl text-base max-w-[80%] break-words leading-snug
                      ${msg.color === myColor
                        ? 'bg-cyan-500/25 text-white rounded-tr-sm'
                        : 'bg-slate-700/80 text-slate-100 rounded-tl-sm'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {room.opponentTyping && (
                  <div className="flex items-start gap-2">
                    <div className="px-3 py-2.5 rounded-xl bg-slate-700/80 rounded-tl-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2 p-3 border-t border-slate-800/50 shrink-0">
                <input
                  value={chatInput}
                  onChange={e => {
                    setChatInput(e.target.value)
                    if (!typingDebounceRef.current) sendTyping()
                    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
                    typingDebounceRef.current = setTimeout(() => { typingDebounceRef.current = null }, 2000)
                  }}
                  placeholder="Say something…"
                  maxLength={200}
                  className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-base text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
                <button type="submit" disabled={!chatInput.trim()}
                  className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Game controls + settings */}
          <div className="border-t border-slate-800/50 shrink-0 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">3D Board</span>
              <button role="switch" aria-checked={view3D} onClick={toggle3D}
                className={`relative w-9 h-5 rounded-full transition-colors ${view3D ? 'bg-fuchsia-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${view3D ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            {room.status === 'waiting' && (
              <div className="glass-panel rounded-xl p-3 text-center mt-1">
                <p className="text-[10px] text-slate-500 mb-1">Invite friend with code</p>
                <p className="font-black text-2xl tracking-widest text-cyan-400 font-mono my-2">{code}</p>
                <button onClick={copyCode} className="mt-1 w-full py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors">
                  {copied ? '✓ Copied!' : 'Copy code'}
                </button>
              </div>
            )}
            {!isGameOver && room.status === 'playing' && (
              <div className="flex flex-col gap-1.5 mt-1">
                {!room.drawOfferedBy && (
                  <button onClick={offerDraw}
                    className="w-full py-1.5 rounded-lg border border-slate-600/50 text-slate-400 hover:border-slate-400 hover:text-slate-200 text-xs font-semibold transition-all">
                    ½ Offer Draw
                  </button>
                )}
                {room.drawOfferedBy && room.drawOfferedBy !== myColor && (
                  <div className="flex gap-1.5">
                    <button onClick={() => respondToDraw(true)}
                      className="flex-1 py-1.5 rounded-lg border border-emerald-600/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition-all">
                      Accept Draw
                    </button>
                    <button onClick={() => respondToDraw(false)}
                      className="flex-1 py-1.5 rounded-lg border border-slate-600/50 text-slate-400 text-xs font-semibold transition-all">
                      Decline
                    </button>
                  </div>
                )}
                {room.drawOfferedBy === myColor && (
                  <p className="text-slate-500 text-[10px] text-center">Draw offered…</p>
                )}
                <button onClick={() => setResignConfirm(true)}
                  className="w-full py-1.5 rounded-lg border border-red-900/50 text-red-500 hover:border-red-600 hover:text-red-400 text-xs font-semibold transition-all">
                  Resign
                </button>
              </div>
            )}
          </div>
        </aside>

      </main>

      <PromotionDialog
        open={promoDialog}
        color={myColor}
        onSelect={handlePromoSelect}
      />

      {/* ── Resign confirmation ──────────────────────────────────────────────── */}
      {resignConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setResignConfirm(false)}
        >
          <div
            className="bg-[#0d1829] border border-slate-700 rounded-2xl p-6 w-80 flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-bold text-base tracking-wide">Resign this game?</h2>
            <p className="text-slate-400 text-sm">You will lose the game. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResignConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { setResignConfirm(false); resign() }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600/80 border border-red-500/60 hover:bg-red-600 transition-all cursor-pointer"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h2 className="text-white font-bold text-base tracking-wide">Leave and resign?</h2>
            <p className="text-slate-400 text-sm">You&apos;ll forfeit this game. Your opponent wins if the game is still in progress.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setLeaveConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  setLeaveConfirm(false)
                  if (isGameOver) router.push('/')
                  else if (room.status === 'playing') resign()
                  else router.push('/')
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600/80 border border-red-500/60 hover:bg-red-600 transition-all cursor-pointer"
              >
                Resign &amp; leave
              </button>
            </div>
          </div>
        </div>
      )}

      <GameResultModal
        open={isGameOver}
        result={gameResult}
        myColor={myColor}
        reason={room.winner === 'draw' ? 'draw' : 'checkmate'}
        myUsername="You"
        oppUsername="Opponent"
        myElo={1200}
        userId=""
        onNewGame={() => router.push('/play/online')}
        onDashboard={() => router.push('/')}
        onRematch={() => router.push('/play/online')}
      />
    </div>
  )
}
