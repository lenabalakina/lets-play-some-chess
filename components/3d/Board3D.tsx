'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { BoardTheme, Color, Square } from '@/features/chess/types/chess.types'
import { THEME_COLORS } from '@/features/chess/types/chess.types'
import { chessSquareToWorld3D } from '@/features/chess/boardCoordinates'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8']

interface TileProps {
  square:       Square
  playerColor:  Color
  isLight:      boolean
  isSelected:   boolean
  isLegal:      boolean
  isLastFrom:   boolean
  isLastTo:     boolean
  isCheck:      boolean
  theme:        BoardTheme
  transparentBg: boolean
  onClick:      (sq: Square) => void
}

function Tile({ square, playerColor, isLight, isSelected, isLegal, isLastFrom, isLastTo, isCheck, theme, transparentBg, onClick }: TileProps) {
  const tc  = THEME_COLORS[theme]
  const pos = chessSquareToWorld3D(square, playerColor)
  const dotPos: [number, number, number] = [pos[0], 0.08, pos[2]]

  const hasMarking = isCheck || isSelected || isLastFrom || isLastTo

  // In transparent-bg mode: dark tiles with no marking become invisible (alpha=0)
  if (!isLight && !hasMarking && transparentBg) {
    return (
      <group position={[0, 0, 0]}>
        <mesh position={pos} onClick={(e) => { e.stopPropagation(); onClick(square) }}>
          <boxGeometry args={[0.98, 0.12, 0.98]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {isLegal && (
          <mesh position={dotPos}>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
            <meshStandardMaterial color={tc.highlight} emissive={tc.highlight} emissiveIntensity={0.8} transparent opacity={0.75} />
          </mesh>
        )}
      </group>
    )
  }

  let tileColor = isLight ? tc.light : tc.dark
  let emissiveColor = '#000000'
  let emissiveIntensity = 0

  if (isCheck)                         { tileColor = tc.check;     emissiveColor = '#ef4444'; emissiveIntensity = 0.3 }
  else if (isSelected)                 { tileColor = tc.selected;  emissiveColor = tc.highlight; emissiveIntensity = 0.5 }
  else if (isLastFrom || isLastTo)     { tileColor = tc.highlight; emissiveColor = tc.highlight; emissiveIntensity = 0.2 }

  return (
    <group position={[0, 0, 0]}>
      <mesh position={pos} onClick={(e) => { e.stopPropagation(); onClick(square) }} receiveShadow>
        <boxGeometry args={[0.98, 0.12, 0.98]} />
        <meshStandardMaterial
          color={tileColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {isLegal && (
        <mesh position={dotPos}>
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
  transparentBg?: boolean
}

export function Board3D({ selectedSquare, legalMoves, lastMove, checkSquare, theme, playerColor, onSquareClick, showCoords, transparentBg = false }: Props) {
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
          playerColor={playerColor}
          isLight={isLight}
          isSelected={isSelected}
          isLegal={isLegal}
          isLastFrom={isLastFrom}
          isLastTo={isLastTo}
          isCheck={isCheck}
          theme={theme}
          transparentBg={transparentBg}
          onClick={onSquareClick}
        />
      )
    }
  }

  return (
    <group>
      {/* Board surround — invisible in transparent mode, visible dark frame otherwise */}
      <mesh position={[0, -0.06, 0]} receiveShadow={!transparentBg}>
        <boxGeometry args={[8.4, 0.12, 8.4]} />
        {transparentBg
          ? <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          : <meshStandardMaterial color="#020818" emissive="#06b6d4" emissiveIntensity={0.04} roughness={0.8} metalness={0.3} />
        }
      </mesh>

      {tiles}

      {/* Top ring — flat shape handles connected corners */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} renderOrder={1}>
        <shapeGeometry args={[frameShape]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3.5} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Side glow — thin strips on the outer faces of the board surround */}
      {([-4.21, 4.21] as number[]).map(x => (
        <mesh key={`sx${x}`} position={[x, -0.04, 0]}>
          <boxGeometry args={[0.03, 0.12, 8.4]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
      {([-4.21, 4.21] as number[]).map(z => (
        <mesh key={`sz${z}`} position={[0, -0.04, z]}>
          <boxGeometry args={[8.4, 0.12, 0.03]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
