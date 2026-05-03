'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Chess } from 'chess.js'
import { ChessBoard2D } from './ChessBoard2D'
import { PlayerPanel } from './PlayerPanel'
import { MoveLog } from './MoveLog'
import { TweaksPanel } from './TweaksPanel'
import { GameControls } from './GameControls'
import { ModeSelector, type GameMode } from './ModeSelector'
import { PromotionDialog } from './PromotionDialog'
import type { PromoPiece } from './PromotionDialog'
import { ChatPanel } from './ChatPanel'
import { DifficultyPanel } from './DifficultyPanel'
import type { Difficulty } from './DifficultyPanel'
import { useChessGame } from '@/features/chess/hooks/useChessGame'
import { useStockfish } from '@/features/ai/useStockfish'
import type { AiLevel } from '@/features/ai/useStockfish'
import { useTimer, formatTime } from '@/features/chess/hooks/useTimer'
import { chessAudio } from '@/lib/audio'
import { TIME_CONTROL_MS } from '@/features/chess/types/chess.types'
import type { BoardTheme, Color, TimeControl } from '@/features/chess/types/chess.types'
import { Radio, Volume2, VolumeX } from 'lucide-react'
import { PawnIcon } from '@/components/ui/PawnIcon'

const ChessBoard3D = dynamic(
  () => import('@/components/3d/ChessBoard3D').then(m => ({ default: m.ChessBoard3D })),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-slate-900/40 rounded-sm animate-pulse" /> }
)

interface PlayerInfo {
  username: string
  elo:      number
}

interface Props {
  me:              PlayerInfo
  opponent:        PlayerInfo
  initialAi?:      boolean
  initialAiLevel?: AiLevel
}

const MODE_TO_TIME: Record<GameMode, TimeControl> = {
  bullet:  'bullet_1',
  blitz:   'blitz_3',
  rapid:   'rapid_10',
  classic: 'classic_15',
}

function MobilePlayerStrip({
  username, elo, ms, isActive, color,
}: { username: string; elo: number; ms: number; isActive: boolean; color: Color }) {
  const low = ms < 30_000
  return (
    <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
          {username.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-xs truncate">{username}</p>
          <p className="text-slate-400 text-[10px]">ELO {elo}</p>
        </div>
      </div>
      <div className={`font-mono text-xl font-bold tracking-widest shrink-0 ml-2
        ${isActive && low  ? 'text-red-400 animate-pulse' :
          isActive         ? (color === 'w' ? 'text-cyan-300' : 'text-purple-300') :
          'text-slate-500'}`}>
        {formatTime(ms)}
      </div>
    </div>
  )
}

export function GameLayout({ me, opponent, initialAi = false, initialAiLevel = 'easy' }: Props) {
  const [playerColor] = useState<Color>('w')
  const [theme,       setTheme]       = useState<BoardTheme>('neon')
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid_10')
  const [gameMode,    setGameMode]    = useState<GameMode>('rapid')
  const [aiEnabled,   setAiEnabled]   = useState(initialAi)
  const [coords,      setCoords]      = useState(true)
  const [view3D,      setView3D]      = useState(false)
  const [muted,       setMuted]       = useState(false)
  const [tweaksOpen,  setTweaksOpen]  = useState(false)
  const [resigned,    setResigned]    = useState(false)
  const [promoDialog,  setPromoDialog]  = useState(false)
  const [activeTab,    setActiveTab]    = useState<'moves' | 'chat'>('moves')
  const [mobileTab,    setMobileTab]    = useState<'moves' | 'chat' | 'play'>('moves')
  const [difficulty,   setDifficulty]   = useState<Difficulty>('vision')
  const [aiLevel,      setAiLevel]      = useState<AiLevel>(initialAiLevel)
  const pendingPromoRef = useRef<{ from: string; to: string } | null>(null)

  const { state, selectSquare, makeMove, resetGame } = useChessGame(playerColor)

  const handleTimeout = useCallback((color: Color) => {
    chessAudio.gameLose()
    console.log(`${color} timed out`)
  }, [])

  const { whiteMs, blackMs, reset: resetTimer } = useTimer({
    initialWhiteMs: TIME_CONTROL_MS[timeControl],
    initialBlackMs: TIME_CONTROL_MS[timeControl],
    activeColor:    state.isGameOver || resigned ? null : state.turn,
    onTimeout:      handleTimeout,
  })

  function handleNewGame() {
    resetGame()
    resetTimer(TIME_CONTROL_MS[timeControl], TIME_CONTROL_MS[timeControl])
    setResigned(false)
    chessAudio.gameStart()
  }

  function handleResign() {
    setResigned(true)
    chessAudio.gameLose()
  }

  function handleModeChange(mode: GameMode) {
    const tc = MODE_TO_TIME[mode]
    setGameMode(mode)
    setTimeControl(tc)
    resetGame()
    resetTimer(TIME_CONTROL_MS[tc], TIME_CONTROL_MS[tc])
    setResigned(false)
  }

  const isGameOver = state.isGameOver || resigned
  const myInfo     = { ...me,       color: playerColor }
  const oppInfo    = { ...opponent, color: (playerColor === 'w' ? 'b' : 'w') as Color }

  const myMs  = playerColor === 'w' ? whiteMs : blackMs
  const oppMs = oppInfo.color === 'w' ? whiteMs : blackMs
  const myActive  = !isGameOver && state.turn === playerColor
  const oppActive = !isGameOver && state.turn === oppInfo.color

  const { thinking: aiThinking } = useStockfish({
    enabled:  aiEnabled && !isGameOver,
    level:    aiLevel,
    fen:      state.fen,
    myColor:  playerColor,
    turn:     state.turn,
    onMove:   (from, to, promotion) => {
      makeMove(from, to, promotion)
      chessAudio.move()
    },
  })

  const handleSquareClick = useCallback((square: string) => {
    if (isGameOver) return
    if (aiEnabled && (state.turn !== playerColor || aiThinking)) return
    const prevSelected = state.selectedSquare
    const prevLegal    = state.legalMoves

    if (prevSelected && prevLegal.includes(square)) {
      const chess = new Chess(state.fen)
      const piece = chess.get(prevSelected as Parameters<typeof chess.get>[0])
      const isPromo = piece?.type === 'p' && (
        (piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1')
      )
      if (isPromo) {
        pendingPromoRef.current = { from: prevSelected, to: square }
        setPromoDialog(true)
      } else {
        selectSquare(square)
        chessAudio.move()
      }
    } else {
      selectSquare(square)
    }
  }, [isGameOver, state, selectSquare, aiEnabled, aiThinking, playerColor])

  const handlePromoSelect = useCallback((piece: PromoPiece) => {
    setPromoDialog(false)
    const p = pendingPromoRef.current
    if (!p) return
    makeMove(p.from, p.to, piece)
    chessAudio.promote()
    pendingPromoRef.current = null
  }, [makeMove])

  function getShadowFen(fen: string, myColor: Color): string {
    try {
      const chess    = new Chess(fen)
      const board    = chess.board()
      const visible  = new Set<string>()
      for (const row of board) {
        for (const cell of row) {
          if (!cell || cell.color !== myColor) continue
          visible.add(cell.square)
          chess.moves({ square: cell.square as Parameters<typeof chess.moves>[0]['square'], verbose: true })
            .forEach(m => visible.add(m.to))
        }
      }
      const shadow = new Chess(fen)
      for (const row of board) {
        for (const cell of row) {
          if (cell && cell.color !== myColor && !visible.has(cell.square)) {
            shadow.remove(cell.square as Parameters<typeof shadow.remove>[0])
          }
        }
      }
      return shadow.fen()
    } catch { return fen }
  }

  const displayFen = difficulty === 'shadow'
    ? getShadowFen(state.fen, state.turn)
    : state.fen

  const isMyTurn = aiEnabled ? (state.turn === playerColor && !aiThinking) : true

  const sharedBoardProps = {
    fen:            displayFen,
    selectedSquare: state.selectedSquare,
    legalMoves:     difficulty === 'vision' ? state.legalMoves : [],
    lastMove:       state.lastMove,
    theme,
    showCoords:     coords,
    isMyTurn,
    isGameOver,
    onSquareClick:  handleSquareClick,
  }
  const board2DProps = { ...sharedBoardProps, playerColor: aiEnabled ? playerColor : state.turn }
  const board3DProps = { ...sharedBoardProps, playerColor: 'w' as const }

  const statusText = isGameOver
    ? (resigned
        ? 'Game over — better luck next time'
        : state.winner === 'draw'
          ? 'Draw!'
          : `${state.winner === 'w' ? 'White' : 'Black'} wins!`)
    : aiEnabled && aiThinking
      ? '🤖 AI is thinking…'
      : aiEnabled
        ? (state.turn === playerColor ? '♔ Your move' : '♚ AI to move')
        : (state.turn === 'w' ? '♔ White to move' : '♚ Black to move')

  const statusColor = isGameOver
    ? 'text-slate-400'
    : state.turn === 'w' ? 'text-cyan-300' : 'text-purple-300'

  const tweaksPanelJSX = (
    <TweaksPanel
      theme={theme}
      timeControl={timeControl}
      aiEnabled={aiEnabled}
      aiLevel={aiLevel}
      coordinates={coords}
      view3D={view3D}
      onTheme={setTheme}
      onTime={(tc) => {
        setTimeControl(tc)
        resetTimer(TIME_CONTROL_MS[tc], TIME_CONTROL_MS[tc])
      }}
      onAI={setAiEnabled}
      onAILevel={setAiLevel}
      onCoords={setCoords}
      on3D={setView3D}
      onClose={() => setTweaksOpen(false)}
    />
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#070d1a] text-white overflow-hidden">

      {/* ── DESKTOP HEADER (lg+) ──────────────────────────────── */}
      <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-slate-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <PawnIcon size={18} />
          <div>
            <h1 className="font-black text-sm tracking-widest neon-text uppercase">LET&apos;S PLAY SOME CHESS</h1>
            <p className="text-slate-600 text-[10px] tracking-wider">Your move. Make it legendary.</p>
          </div>
        </div>
        <ModeSelector activeMode={gameMode} onChange={handleModeChange} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => { const m = !muted; setMuted(m); chessAudio.setMuted(m) }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ARENA
            <Radio className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* ── MOBILE HEADER (< lg) ─────────────────────────────── */}
      <header className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 shrink-0">
        <PawnIcon size={16} />
        <span className="font-black text-[10px] tracking-widest neon-text uppercase shrink-0 hidden xs:block">
          LET&apos;S PLAY SOME CHESS
        </span>
        {/* Scrollable mode selector */}
        <div className="flex-1 overflow-x-auto scrollbar-none">
          <ModeSelector activeMode={gameMode} onChange={handleModeChange} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { const m = !muted; setMuted(m); chessAudio.setMuted(m) }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Left panel — desktop only */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-slate-800/40 flex-col overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <PlayerPanel
              player={myInfo}
              opponent={oppInfo}
              whiteMs={whiteMs}
              blackMs={blackMs}
              turn={state.turn}
              isGameOver={isGameOver}
            />
          </div>
          <div className="border-t border-slate-800/40 shrink-0">
            <DifficultyPanel value={difficulty} onChange={setDifficulty} />
          </div>
        </aside>

        {/* Center — board + mobile UI */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile opponent strip */}
          <div className="lg:hidden px-2 pt-2 pb-1 shrink-0">
            <MobilePlayerStrip
              username={opponent.username}
              elo={opponent.elo}
              ms={oppMs}
              isActive={oppActive}
              color={oppInfo.color}
            />
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-1 min-h-0 lg:gap-4 lg:px-4 lg:py-2">
            <div className={`text-[11px] font-semibold tracking-widest uppercase shrink-0 ${statusColor}`}>
              {statusText}
            </div>
            {view3D
              ? <ChessBoard3D {...board3DProps} />
              : <ChessBoard2D {...board2DProps} />
            }
          </div>

          {/* Mobile my strip */}
          <div className="lg:hidden px-2 pt-1 pb-1 shrink-0">
            <MobilePlayerStrip
              username={me.username}
              elo={me.elo}
              ms={myMs}
              isActive={myActive}
              color={playerColor}
            />
          </div>

          {/* Mobile tabs: Moves / Chat / Play */}
          <div className="lg:hidden flex flex-col border-t border-slate-800/50 shrink-0" style={{ height: 130 }}>
            <div className="flex border-b border-slate-800/50 shrink-0">
              {(['moves', 'chat', 'play'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                    ${mobileTab === tab
                      ? 'text-cyan-300 border-b-2 border-cyan-500'
                      : 'text-slate-600 hover:text-slate-400'
                    }`}
                >
                  {tab === 'moves' ? 'Moves' : tab === 'chat' ? '💬 Chat' : '⚙ Play'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {mobileTab === 'moves' && <MoveLog moves={state.moveHistory} />}
              {mobileTab === 'chat' && (
                <ChatPanel
                  whiteUsername={me.username}
                  blackUsername={opponent.username}
                  turn={state.turn}
                />
              )}
              {mobileTab === 'play' && (
                <div className="overflow-y-auto h-full p-2">
                  <DifficultyPanel value={difficulty} onChange={setDifficulty} />
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Right panel — desktop only */}
        <aside className="hidden lg:flex w-64 shrink-0 border-l border-slate-800/40 flex-col">
          <div className="flex border-b border-slate-800/50 shrink-0">
            {(['moves', 'chat'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                  ${activeTab === tab
                    ? 'text-cyan-300 border-b-2 border-cyan-500'
                    : 'text-slate-600 hover:text-slate-400'
                  }`}
              >
                {tab === 'moves' ? 'Moves' : '💬 Chat'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'moves'
              ? <MoveLog moves={state.moveHistory} />
              : <ChatPanel
                  whiteUsername={me.username}
                  blackUsername={opponent.username}
                  turn={state.turn}
                />
            }
          </div>
          <div className="p-3 border-t border-slate-800/40 shrink-0">
            <AnimatePresence>
              {tweaksOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {tweaksPanelJSX}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 shrink-0">
        <GameControls
          onResign={handleResign}
          onDraw={() => {}}
          onSettings={() => setTweaksOpen(v => !v)}
          onNewGame={handleNewGame}
          disabled={isGameOver}
        />
      </footer>

      {/* ── MOBILE SETTINGS BOTTOM SHEET ─────────────────────── */}
      <AnimatePresence>
        {tweaksOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setTweaksOpen(false)}
            />
            <motion.div
              className="relative bg-[#0d1829] border-t border-slate-700/50 rounded-t-2xl overflow-y-auto max-h-[88vh]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-600 rounded-full" />
              </div>
              <div className="p-4">
                {tweaksPanelJSX}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotion dialog */}
      <PromotionDialog
        open={promoDialog}
        color={playerColor}
        onSelect={handlePromoSelect}
      />
    </div>
  )
}
