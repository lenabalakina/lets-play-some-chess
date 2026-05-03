'use client'

import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PIECE_COMPONENTS } from './PieceShapes'
import type { Color, PieceType, Square } from '@/features/chess/types/chess.types'

interface Props {
  square:     Square
  type:       PieceType
  color:      Color
  isSelected: boolean
  isInCheck:  boolean
  playerColor: Color
  onClick:    (sq: Square) => void
}

function squareTo3D(sq: Square, playerColor: Color): [number, number, number] {
  const file = sq.charCodeAt(0) - 97   // a=0 … h=7
  const rank = parseInt(sq[1]) - 1     // 1=0 … 8=7
  if (playerColor === 'w') {
    return [file - 3.5, 0, 3.5 - rank]
  }
  return [3.5 - file, 0, rank - 3.5]
}

const WHITE_EMISSIVE = new THREE.Color('#06b6d4')   // cyan glow
const BLACK_EMISSIVE = new THREE.Color('#a855f7')   // bright purple glow
const CHECK_COLOR    = new THREE.Color('#ef4444')

export function ChessPiece3D({ square, type, color, isSelected, isInCheck, playerColor, onClick }: Props) {
  const groupRef    = useRef<THREE.Group>(null)
  const matRef      = useRef<THREE.MeshStandardMaterial>(null)

  // Target 3D position
  const target = squareTo3D(square, playerColor)

  // Animate position toward target (smooth move)
  const current = useRef<[number, number, number]>([...target])
  const moving  = useRef(false)

  useEffect(() => {
    // When square changes, mark as moving to trigger arc animation
    moving.current = true
  }, [square])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const lerpSpeed = 8
    const dx = target[0] - current.current[0]
    const dz = target[2] - current.current[2]
    const dist = Math.sqrt(dx * dx + dz * dz)

    current.current[0] += dx * Math.min(delta * lerpSpeed, 1)
    current.current[2] += dz * Math.min(delta * lerpSpeed, 1)

    // Arc Y during movement
    if (dist > 0.05 && moving.current) {
      current.current[1] = Math.min(current.current[1] + delta * 5, 1.2)
    } else {
      current.current[1] = Math.max(current.current[1] - delta * 6, 0)
      if (dist < 0.01) moving.current = false
    }

    groupRef.current.position.set(...current.current)

    // Pulse emissive when selected
    if (matRef.current) {
      const base = color === 'w' ? 0.20 : 0.50
      const intensity = isSelected
        ? 0.7 + Math.sin(Date.now() * 0.005) * 0.15
        : isInCheck ? 0.6 : base
      matRef.current.emissiveIntensity = intensity
    }

    // Hover scale: slight grow on selection
    const targetScale = isSelected ? 1.1 : 1.0
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 10
    )
  })

  // Mount scale-in animation
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(0)
    }
  }, [])

  const emissive   = isInCheck ? CHECK_COLOR : (color === 'w' ? WHITE_EMISSIVE : BLACK_EMISSIVE)
  const PieceShape = PIECE_COMPONENTS[type]

  // White = icy chrome-white (cyan glow), Black = bright lavender-purple (purple glow)
  const material = (
    <meshStandardMaterial
      ref={matRef}
      color={color === 'w' ? '#cce8ff' : '#cc99ff'}
      emissive={emissive}
      emissiveIntensity={isSelected ? 0.9 : color === 'w' ? 0.20 : 0.50}
      roughness={color === 'w' ? 0.08 : 0.10}
      metalness={color === 'w' ? 0.85 : 0.45}
    />
  )

  return (
    <group
      ref={groupRef}
      position={target}
      onClick={(e) => {
        e.stopPropagation()
        onClick(square)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    >
      {/* Inject shared material into all piece meshes */}
      <group>
        {/* We clone the material into each child mesh via traverse */}
        <MaterialProvider material={material}>
          <PieceShape />
        </MaterialProvider>
      </group>
    </group>
  )
}

// Inject a shared material into all child meshes
function MaterialProvider({ material, children }: { material: React.ReactElement; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef   = useRef<THREE.MeshStandardMaterial>(null)

  useEffect(() => {
    if (!groupRef.current || !matRef.current) return
    groupRef.current.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = matRef.current!
      }
    })
  })

  return (
    <>
      {/* Hidden material instance that we reference */}
      <meshStandardMaterial ref={matRef} {...(material.props as object)} />
      <group ref={groupRef}>{children}</group>
    </>
  )
}
