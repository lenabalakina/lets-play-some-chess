'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PIECE_COMPONENTS } from './PieceShapes'
import type { Color, PieceType, Square } from '@/features/chess/types/chess.types'

interface Props {
  square:      Square
  type:        PieceType
  color:       Color
  isSelected:  boolean
  isInCheck:   boolean
  playerColor: Color
  onClick:     (sq: Square) => void
}

function squareTo3D(sq: Square, playerColor: Color): [number, number, number] {
  const file = sq.charCodeAt(0) - 97   // a=0 … h=7
  const rank = parseInt(sq[1]) - 1     // 1=0 … 8=7
  if (playerColor === 'w') {
    return [file - 3.5, 0, 3.5 - rank]
  }
  return [3.5 - file, 0, rank - 3.5]
}

const WHITE_EMISSIVE = new THREE.Color('#06b6d4')   // cyan
const BLACK_EMISSIVE = new THREE.Color('#a855f7')   // purple
const CHECK_COLOR    = new THREE.Color('#ef4444')   // red

export function ChessPiece3D({ square, type, color, isSelected, isInCheck, playerColor, onClick }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  // Create material imperatively — avoids the JSX ref-override bug where
  // spreading material.props clobbered MaterialProvider's ref, leaving meshes uncolored
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color('#ffffff'),
    emissive:          color === 'w' ? WHITE_EMISSIVE : BLACK_EMISSIVE,
    emissiveIntensity: color === 'w' ? 0.20 : 0.30,
    roughness:         0.30,
    metalness:         0.15,
  }), [color])

  // Apply material to every child mesh after each render
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = mat
      }
    })
  })

  // Target 3D position
  const target  = squareTo3D(square, playerColor)
  const current = useRef<[number, number, number]>([...target])
  const moving  = useRef(false)

  useEffect(() => {
    moving.current = true
  }, [square])

  // Mount: scale in from zero
  useEffect(() => {
    if (groupRef.current) groupRef.current.scale.setScalar(0)
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Smooth position lerp + arc
    const lerpSpeed = 8
    const dx   = target[0] - current.current[0]
    const dz   = target[2] - current.current[2]
    const dist = Math.sqrt(dx * dx + dz * dz)

    current.current[0] += dx * Math.min(delta * lerpSpeed, 1)
    current.current[2] += dz * Math.min(delta * lerpSpeed, 1)

    if (dist > 0.05 && moving.current) {
      current.current[1] = Math.min(current.current[1] + delta * 5, 1.2)
    } else {
      current.current[1] = Math.max(current.current[1] - delta * 6, 0)
      if (dist < 0.01) moving.current = false
    }
    groupRef.current.position.set(...current.current)

    // Animate emissive intensity
    const base = color === 'w' ? 0.20 : 0.30
    mat.emissiveIntensity = isSelected
      ? 0.7 + Math.sin(Date.now() * 0.005) * 0.15
      : isInCheck ? 0.7 : base
    mat.emissive = isInCheck ? CHECK_COLOR : (color === 'w' ? WHITE_EMISSIVE : BLACK_EMISSIVE)

    // Scale pulse on selection
    const targetScale = isSelected ? 1.1 : 1.0
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 10
    )
  })

  const PieceShape = PIECE_COMPONENTS[type]
  // Knight snout faces +Z; white pieces sit at +Z (near camera) so rotate 180° to face the opponent
  const knightRotY = type === 'n' && color === 'w' ? Math.PI : 0

  return (
    <group
      ref={groupRef}
      position={target}
      onClick={(e) => { e.stopPropagation(); onClick(square) }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'default' }}
    >
      <group rotation={[0, knightRotY, 0]}>
        <PieceShape />
      </group>
    </group>
  )
}
