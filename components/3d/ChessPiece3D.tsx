'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PIECE_COMPONENTS } from './PieceShapes'
import { chessSquareToWorld3D } from '@/features/chess/boardCoordinates'
import type { Color, PieceType, Square } from '@/features/chess/types/chess.types'
import { PIECE_3D } from '@/features/chess/types/chess.types'

interface Props {
  square:      Square
  type:        PieceType
  color:       Color
  isSelected:  boolean
  isInCheck:   boolean
  playerColor: Color
  onClick:     (sq: Square) => void
}

const CHECK_COLOR = new THREE.Color('#ef4444')

export function ChessPiece3D({ square, type, color, isSelected, isInCheck, playerColor, onClick }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const auraRef  = useRef<THREE.Mesh>(null)

  const piece3d = color === 'w' ? PIECE_3D.white : PIECE_3D.black
  const emissiveColor = useMemo(() => new THREE.Color(piece3d.emissive), [piece3d.emissive])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color(piece3d.color),
    emissive:          emissiveColor.clone(),
    emissiveIntensity: piece3d.emissiveIntensity,
    roughness:         0.22,
    metalness:         0.08,
    toneMapped:        false,
  }), [color, piece3d, emissiveColor])

  const auraLayers = useMemo(() => [
    { r: 0.34, y: 0.018, o: color === 'w' ? 0.38 : 0.48 },
    { r: 0.48, y: 0.014, o: color === 'w' ? 0.24 : 0.32 },
    { r: 0.64, y: 0.010, o: color === 'w' ? 0.14 : 0.20 },
  ], [color])

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh && !(obj as THREE.Mesh).userData.isAura) {
        (obj as THREE.Mesh).material = mat
      }
    })
  }, [mat])

  const target  = chessSquareToWorld3D(square, playerColor)
  const current = useRef<[number, number, number]>([...target])
  const moving  = useRef(false)

  useEffect(() => { moving.current = true }, [square])

  useEffect(() => {
    if (groupRef.current) groupRef.current.scale.setScalar(0)
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

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

    const base = piece3d.emissiveIntensity
    mat.emissiveIntensity = isSelected
      ? base * 1.45 + Math.sin(Date.now() * 0.004) * 0.15
      : isInCheck ? base * 1.6 : base
    mat.emissive.copy(isInCheck ? CHECK_COLOR : emissiveColor)

    if (auraRef.current) {
      const pulse = isSelected ? 1.22 + Math.sin(Date.now() * 0.005) * 0.06 : 1
      auraRef.current.scale.setScalar(pulse)
      auraRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        const base = auraLayers[i]?.o ?? 0.2
        ;(mesh.material as THREE.MeshBasicMaterial).opacity =
          base * (isSelected ? 1.4 : 1)
      })
    }

    const targetScale = isSelected ? 1.1 : 1.0
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 10,
    )
  })

  const PieceShape = PIECE_COMPONENTS[type]
  const knightRotY = type === 'n' && color === 'w' ? Math.PI : 0

  return (
    <group
      ref={groupRef}
      position={target}
      onClick={(e) => { e.stopPropagation(); onClick(square) }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'default' }}
    >
      {/* Layered ground glow — cyan / purple neon halo */}
      <group ref={auraRef}>
        {auraLayers.map(({ r, y, o }) => (
          <mesh
            key={r}
            userData={{ isAura: true }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, y, 0]}
          >
            <circleGeometry args={[r, 32]} />
            <meshBasicMaterial
              color={emissiveColor}
              transparent
              opacity={o}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      <group rotation={[0, knightRotY, 0]}>
        <PieceShape />
      </group>
    </group>
  )
}
