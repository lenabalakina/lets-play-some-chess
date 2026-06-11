'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { Chess } from 'chess.js'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Download } from 'lucide-react'
import { Board3D } from './Board3D'
import { ChessPiece3D } from './ChessPiece3D'
import { CameraRig } from './CameraRig'
import { NeonBloom } from './NeonBloom'
import { exportSceneAsGlb } from '@/lib/exportGlb'
import type { BoardTheme, Color, PieceType, Square } from '@/features/chess/types/chess.types'

function SceneExporter({ sceneRef }: { sceneRef: React.MutableRefObject<THREE.Scene | null> }) {
  const { scene } = useThree()
  useEffect(() => { sceneRef.current = scene }, [scene, sceneRef])
  return null
}

interface ParsedPiece {
  square:  Square
  type:    PieceType
  color:   Color
}

function parseFen(fen: string): ParsedPiece[] {
  try {
    const chess  = new Chess(fen)
    const board  = chess.board()
    const pieces: ParsedPiece[] = []
    for (const row of board) {
      for (const cell of row) {
        if (cell) {
          pieces.push({
            square: cell.square as Square,
            type:   cell.type as PieceType,
            color:  cell.color as Color,
          })
        }
      }
    }
    return pieces
  } catch { return [] }
}

function getCheckSquare(fen: string): Square | null {
  try {
    const chess = new Chess(fen)
    if (!chess.inCheck()) return null
    const turn  = chess.turn()
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === turn) {
          return cell.square as Square
        }
      }
    }
  } catch {}
  return null
}

interface Props {
  fen:            string
  selectedSquare: Square | null
  legalMoves:     string[]
  lastMove:       { from: Square; to: Square } | null
  theme:          BoardTheme
  showCoords:     boolean
  playerColor:    Color
  isMyTurn:       boolean
  isGameOver:     boolean
  onSquareClick:  (sq: Square) => void
}

export function ChessBoard3D({
  fen, selectedSquare, legalMoves, lastMove,
  theme, showCoords, playerColor, isMyTurn, isGameOver, onSquareClick,
}: Props) {
  const pieces      = parseFen(fen)
  const checkSquare = getCheckSquare(fen)
  const [exporting, setExporting] = useState(false)
  const sceneRef    = useRef<THREE.Scene | null>(null)

  async function handleExport() {
    if (!sceneRef.current) return
    setExporting(true)
    try { await exportSceneAsGlb(sceneRef.current) } finally { setExporting(false) }
  }

  return (
    <div
      className="relative rounded-sm overflow-hidden w-full h-full"
      style={{
        boxShadow: '0 0 48px rgba(6,182,212,0.2), 0 0 96px rgba(192,132,252,0.12), 0 16px 48px rgba(0,0,0,0.5)',
        cursor: isGameOver ? 'default' : (isMyTurn ? 'crosshair' : 'default'),
      }}
    >
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.22,
        }}
        onCreated={({ gl }) => { gl.setClearColor('#070d1a') }}
      >
        <Suspense fallback={null}>
          <SceneExporter sceneRef={sceneRef} />

          {/* Camera */}
          <CameraRig playerColor={playerColor} />

          {/* Lighting — low ambient so emissive neon reads clearly */}
          <ambientLight intensity={0.22} color="#334466" />
          <directionalLight
            position={[5, 12, 8]}
            intensity={0.85}
            color="#c8d8ff"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[0, 5, 0]}   intensity={1.6} color="#06b6d4" distance={16} decay={2} />
          <pointLight position={[-4, 2, -4]} intensity={1.35} color="#c084fc" distance={15} decay={2} />
          <pointLight position={[4, 2, 4]}   intensity={0.9} color="#0ea5e9" distance={13} decay={2} />

          {/* Board */}
          <Board3D
            fen={fen}
            selectedSquare={selectedSquare}
            legalMoves={isMyTurn ? legalMoves : []}
            lastMove={lastMove}
            checkSquare={checkSquare}
            theme={theme}
            playerColor={playerColor}
            onSquareClick={!isGameOver ? onSquareClick : () => {}}
            showCoords={showCoords}
          />

          {/* Pieces */}
          {pieces.map(piece => (
            <ChessPiece3D
              key={`${piece.color}-${piece.type}-${piece.square}`}
              square={piece.square}
              type={piece.type}
              color={piece.color}
              isSelected={piece.square === selectedSquare}
              isInCheck={piece.square === checkSquare}
              playerColor={playerColor}
              onClick={!isGameOver ? onSquareClick : () => {}}
            />
          ))}

        </Suspense>
        <NeonBloom />
      </Canvas>

      {/* Export GLB button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        title="Export piece shapes as GLB (opens in Rhino 7+)"
        className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md
          bg-slate-900/70 border border-slate-700 text-slate-400 text-[10px] font-semibold
          hover:text-cyan-300 hover:border-cyan-700 transition-colors backdrop-blur-sm
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-3 h-3" />
        {exporting ? 'Exporting…' : 'Export Board'}
      </button>

      {/* Game over overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="glass-panel rounded-xl px-8 py-4 text-center">
            <p className="text-white font-bold text-lg">Game Over</p>
          </div>
        </div>
      )}
    </div>
  )
}
