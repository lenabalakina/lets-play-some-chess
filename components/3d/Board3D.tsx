'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { BoardTheme, Color, Square } from '@/features/chess/types/chess.types'
import { THEME_COLORS } from '@/features/chess/types/chess.types'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8']

function squareTo3D(sq: Square, playerColor: Color): [number, number, number] {
  const file = sq.charCodeAt(0) - 97
  const rank = parseInt(sq[1]) - 1
  if (playerColor === 'w') return [file - 3.5, 0, 3.5 - rank]
  return [3.5 - file, 0, rank - 3.5]
}

interface TileProps {
  square:     Square
  isLight:    boolean
  isSelected: boolean
  isLegal:    boolean
  isLastFrom: boolean
  isLastTo:   boolean
  isCheck:    boolean
  theme:      BoardTheme
  onClick:    (sq: Square) => void
}

function Tile({ square, isLight, isSelected, isLegal, isLastFrom, isLastTo, isCheck, theme, onClick }: TileProps) {
  const tc = THEME_COLORS[theme]

  let tileColor = isLight ? tc.light : tc.dark
  let emissiveColor = '#000000'
  let emissiveIntensity = 0

  if (isCheck)                         { tileColor = tc.check;     emissiveColor = '#ef4444'; emissiveIntensity = 0.3 }
  else if (isSelected)                 { tileColor = tc.selected;  emissiveColor = tc.highlight; emissiveIntensity = 0.5 }
  else if (isLastFrom || isLastTo)     { tileColor = tc.highlight; emissiveColor = tc.highlight; emissiveIntensity = 0.2 }

  return (
    <group position={[0, 0, 0]}>
      {/* Main tile */}
      <mesh
        position={squareTo3D(square, 'w')}
        onClick={(e) => { e.stopPropagation(); onClick(square) }}
        receiveShadow
      >
        <boxGeometry args={[0.98, 0.12, 0.98]} />
        <meshStandardMaterial
          color={tileColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Legal move indicator */}
      {isLegal && (
        <mesh position={[...squareTo3D(square, 'w').slice(0, 1), 0.08, squareTo3D(square, 'w')[2]] as [number, number, number]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
          <meshStandardMaterial
            color={tc.highlight}
            emissive={tc.highlight}
            emissiveIntensity={0.8}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}
    </group>
  )
}

interface Props {
  fen:            string
  selectedSquare: Square | null
  legalMoves:     string[]
  lastMove:       { from: Square; to: Square } | null
  checkSquare:    Square | null
  theme:          BoardTheme
  playerColor:    Color
  onSquareClick:  (sq: Square) => void
  showCoords:     boolean
}

export function Board3D({ selectedSquare, legalMoves, lastMove, checkSquare, theme, playerColor, onSquareClick, showCoords }: Props) {
  // Single frame shape — no corners, no seams
  const frameShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-4.2, -4.2); s.lineTo(4.2, -4.2); s.lineTo(4.2, 4.2); s.lineTo(-4.2, 4.2); s.closePath()
    const hole = new THREE.Path()
    hole.moveTo(-4.06, -4.06); hole.lineTo(4.06, -4.06); hole.lineTo(4.06, 4.06); hole.lineTo(-4.06, 4.06); hole.closePath()
    s.holes.push(hole)
    return s
  }, [])

  const tiles: React.ReactNode[] = []

  for (const rank of RANKS) {
    for (const file of FILES) {
      const sq  = `${file}${rank}` as Square
      const fi  = FILES.indexOf(file)
      const ri  = RANKS.indexOf(rank)
      const isLight     = (fi + ri) % 2 === 1
      const isSelected  = sq === selectedSquare
      const isLegal     = legalMoves.includes(sq)
      const isLastFrom  = lastMove?.from === sq
      const isLastTo    = lastMove?.to === sq
      const isCheck     = sq === checkSquare

      tiles.push(
        <Tile
          key={sq}
          square={sq}
          isLight={isLight}
          isSelected={isSelected}
          isLegal={isLegal}
          isLastFrom={isLastFrom}
          isLastTo={isLastTo}
          isCheck={isCheck}
          theme={theme}
          onClick={onSquareClick}
        />
      )
    }
  }

  return (
    <group>
      {/* Board surround / frame */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[8.4, 0.12, 8.4]} />
        <meshStandardMaterial
          color="#020818"
          emissive="#06b6d4"
          emissiveIntensity={0.04}
          roughness={0.8}
          metalness={0.3}
        />
      </mesh>

      {tiles}

      {/* Single frame shape — one mesh, no corners, no seams */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]}>
        <shapeGeometry args={[frameShape]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
