'use client'

import { Canvas } from '@react-three/fiber'
import { Chess } from 'chess.js'
import { Suspense } from 'react'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Environment } from '@react-three/drei'
import { Board3D } from './Board3D'
import { ChessPiece3D } from './ChessPiece3D'
import { CameraRig } from './CameraRig'
import type { BoardTheme, Color, PieceType, Square } from '@/features/chess/types/chess.types'

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
  const pieces     = parseFen(fen)
  const checkSquare = getCheckSquare(fen)

  return (
    <div
      className="relative rounded-sm overflow-hidden"
      style={{
        width:  'clamp(360px, 55vw, 640px)',
        height: 'clamp(360px, 55vw, 640px)',
        boxShadow: '0 0 60px rgba(6,182,212,0.15), 0 0 120px rgba(139,92,246,0.08)',
        cursor: isGameOver ? 'default' : (isMyTurn ? 'crosshair' : 'default'),
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, toneMapping: 3 /* ACESFilmicToneMapping */ }}
        onCreated={({ gl }) => { gl.setClearColor('#070d1a') }}
      >
        <Suspense fallback={null}>
          {/* Camera */}
          <CameraRig playerColor={playerColor} />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 12, 8]}
            intensity={1.2}
            color="#ffffff"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          {/* Neon fill lights */}
          <pointLight position={[0, 4, 0]}   intensity={1.5}  color="#06b6d4" distance={12} />
          <pointLight position={[-4, 2, -4]} intensity={0.8}  color="#a855f7" distance={10} />
          <pointLight position={[4, 2, 4]}   intensity={0.5}  color="#0ea5e9" distance={10} />

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

          {/* Post-processing */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.4}
              intensity={0.8}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

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
