'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { Chess } from 'chess.js'
import { Board3D } from './3d/Board3D'
import { ChessPiece3D } from './3d/ChessPiece3D'
import { NeonBloom } from './3d/NeonBloom'
import type { Color, PieceType, Square } from '@/features/chess/types/chess.types'

const MOVES = [
  'e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4',
  'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6',
  'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5',
  'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8',
  'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7',
  'Qb8+', 'Nxb8', 'Rd8',
]

interface Piece { square: Square; type: PieceType; color: Color }

function parseFen(fen: string): Piece[] {
  try {
    const chess = new Chess(fen)
    return chess.board().flat().filter(Boolean).map(c => ({
      square: c!.square as Square,
      type: c!.type as PieceType,
      color: c!.color as Color,
    }))
  } catch { return [] }
}

function Scene({ fen, lastMove }: { fen: string; lastMove: { from: Square; to: Square } | null }) {
  const pieces = parseFen(fen)

  return (
    <>
      <ambientLight intensity={0.18} color="#334466" />
      <directionalLight position={[5, 12, 8]} intensity={0.9} color="#c8d8ff" castShadow />
      <pointLight position={[0, 5, 0]}   intensity={1.7} color="#06b6d4" distance={16} decay={2} />
      <pointLight position={[-4, 2, -4]} intensity={1.4} color="#f472b6" distance={14} decay={2} />
      <pointLight position={[4, 2, 4]}   intensity={0.85} color="#0ea5e9" distance={12} decay={2} />

      <Board3D
        fen={fen}
        selectedSquare={null}
        legalMoves={[]}
        lastMove={lastMove}
        checkSquare={null}
        theme="neon"
        playerColor="w"
        onSquareClick={() => {}}
        showCoords={false}
        transparentBg
      />

      {pieces.map(p => (
        <ChessPiece3D
          key={p.square}
          type={p.type}
          color={p.color}
          square={p.square}
          playerColor="w"
          isSelected={false}
          isInCheck={false}
          onClick={() => {}}
        />
      ))}

    </>
  )
}

export function HeroBoard3D() {
  const [chess] = useState(() => new Chess())
  const [fen, setFen] = useState(chess.fen())
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [moveIdx, setMoveIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setMoveIdx(i => {
        const next = i % MOVES.length
        try {
          if (next === 0) chess.reset()
          const result = chess.move(MOVES[next])
          if (result) {
            setFen(chess.fen())
            setLastMove({ from: result.from as Square, to: result.to as Square })
          }
        } catch { /* invalid move in loop */ }
        return next + 1
      })
    }, 1600)
    return () => clearInterval(t)
  }, [chess])

  return (
    <Canvas
      shadows
      camera={{ position: [0, 9, 9], fov: 45 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.22,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Scene fen={fen} lastMove={lastMove} />
      </Suspense>
      <NeonBloom />
    </Canvas>
  )
}
