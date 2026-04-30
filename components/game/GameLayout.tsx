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
import { useTimer } from '@/features/chess/hooks/useTimer'
import { chessAudio } from '@/lib/audio'
import { TIME_CONTROL_MS } from '@/features/chess/types/chess.types'
import type { BoardTheme, Color, TimeControl } from '@/features/chess/types/chess.types'
import { Radio, Volume2, VolumeX } from 'lucide-react'

const ChessBoard3D = dynamic(
  () => import('@/components/3d/ChessBoard3D').then(m => ({ default: m.ChessBoard3D })),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-slate-900/40 rounded-sm animate-pulse" /> }
)

interface PlayerInfo {
  username: string
  elo:      number
}

interface Props {
  me:             PlayerInfo
  opponent:       PlayerInfo
  initialAi?:     boolean
  initialAiLevel?: AiLevel
}

const MODE_TO_TIME: Record<GameMode, TimeControl> = {
  bullet:  'bullet_1',
  blitz:   'blitz_3',
  rapid:   'rapid_10',
  classic: 'classic_15',
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
  const [tweaksOpen,  setTweaksOpen]  = useState(true)
  const [resigned,    setResigned]    = useState(false)
  const [promoDialog,  setPromoDialog]  = useState(false)
  const [activeTab,    setActiveTab]    = useState<'moves' | 'chat'>('moves')
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
  const oppInfo    = { ...opponent, color: (playerColor === 'w' ? 'b' : 'w') as Color }

  // Click-to-move with promotion detection
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

  // ── Fog of War: hide enemy pieces outside attack range ───────────────────
  function getShadowFen(fen: string, myColor: Color): string {
    try {
      const chess    = new Chess(fen)
      const board    = chess.board()
      const visible  = new Set<string>()
      // My pieces + squares I can move to are always visible
      for (const row of board) {
        for (const cell of row) {
          if (!cell || cell.color !== myColor) continue
          visible.add(cell.square)
          chess.moves({ square: cell.square as Parameters<typeof chess.moves>[0]['square'], verbose: true })
            .forEach(m => visible.add(m.to))
        }
      }
      // Remove enemy pieces on invisible squares from a copy
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

  // When playing vs AI it's only my turn when it's my color's move and AI isn't thinking
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
  // When vs AI: always show from white's perspective (player is always white)
  // When pass-and-play: flip each turn so active player sees their pieces at bottom
  const board2DProps = { ...sharedBoardProps, playerColor: aiEnabled ? playerColor : state.turn }
  // 3D stays fixed from white's side — flipping breaks the 3D coordinate system
  const board3DProps = { ...sharedBoardProps, playerColor: 'w' as const }

  return (
    <div className="flex flex-col h-screen bg-[#070d1a] text-white overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-lg">♟</span>
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

      {/* Main 3-column layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Player panel + Difficulty */}
        <aside className="w-56 shrink-0 border-r border-slate-800/40 flex flex-col overflow-hidden">
          {/* Players fill remaining space */}
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
          {/* Difficulty pinned at bottom */}
          <div className="border-t border-slate-800/40 shrink-0">
            <DifficultyPanel value={difficulty} onChange={setDifficulty} />
          </div>
        </aside>

        {/* Center: Board */}
        <section className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-2 min-w-0">
          {/* Status */}
          <div className={`text-xs font-semibold tracking-widest uppercase ${
            isGameOver ? 'text-slate-400'
            : state.turn === 'w' ? 'text-cyan-300' : 'text-purple-300'
          }`}>
            {isGameOver
              ? (resigned ? 'Game over — better luck next time' : state.winner === 'draw' ? 'Draw!' : `${state.winner === 'w' ? 'White wins!' : 'Black wins!'}`)
              : aiEnabled && aiThinking
                ? '🤖 AI is thinking…'
                : aiEnabled
                  ? (state.turn === playerColor ? '♔ Your move' : '♚ AI to move')
                  : (state.turn === 'w' ? '♔ White to move' : '♚ Black to move')
            }
          </div>

          {view3D
            ? <ChessBoard3D {...board3DProps} />
            : <ChessBoard2D {...board2DProps} />
          }
        </section>

        {/* Right: tabs — Move log / Chat / Tweaks */}
        <aside className="w-64 shrink-0 border-l border-slate-800/40 flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-800/50">
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

          <div className="flex-1 overflow-hidden">
            {activeTab === 'moves'
              ? <MoveLog moves={state.moveHistory} />
              : <ChatPanel
                  whiteUsername={me.username}
                  blackUsername={opponent.username}
                  turn={state.turn}
                />
            }
          </div>

          <div className="p-3 border-t border-slate-800/40">
            <AnimatePresence>
              {tweaksOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </main>

      {/* Bottom controls */}
      <footer className="border-t border-slate-800/50">
        <GameControls
          onResign={handleResign}
          onDraw={() => {}}
          onSettings={() => setTweaksOpen(v => !v)}
          onNewGame={handleNewGame}
          disabled={isGameOver}
        />
      </footer>

      {/* Promotion dialog */}
      <PromotionDialog
        open={promoDialog}
        color={playerColor}
        onSelect={handlePromoSelect}
      />
    </div>
  )
}
