'use client'

import React from 'react'
import type { PieceType } from '@/features/chess/types/chess.types'

// ── Shared geometry helpers ───────────────────────────────────────────────────

function Disc({ r, h, y }: { r: number; h: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <cylinderGeometry args={[r, r * 1.1, h, 20]} />
    </mesh>
  )
}
function Cyl({ rt, rb, h, y, seg = 16 }: { rt: number; rb: number; h: number; y: number; seg?: number }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
    </mesh>
  )
}
function Sph({ r, y }: { r: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <sphereGeometry args={[r, 16, 16]} />
    </mesh>
  )
}
function Cone({ r, h, y }: { r: number; h: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <coneGeometry args={[r, h, 16]} />
    </mesh>
  )
}
function Box({ w, h, d, x = 0, y, z = 0, rotY = 0 }: { w: number; h: number; d: number; x?: number; y: number; z?: number; rotY?: number }) {
  return (
    <mesh position={[x, y, z]} rotation={[0, rotY, 0]} castShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  )
}

// ── Piece shapes ─────────────────────────────────────────────────────────────

export function Pawn() {
  return (
    <group>
      <Disc r={0.30} h={0.07} y={0.035} />
      <Cyl  rt={0.14} rb={0.18} h={0.18} y={0.16} />
      <Sph  r={0.20} y={0.40} />
    </group>
  )
}

export function Rook() {
  return (
    <group>
      <Disc r={0.34} h={0.07} y={0.035} />
      <Cyl  rt={0.18} rb={0.22} h={0.28} y={0.21} />
      <Cyl  rt={0.26} rb={0.24} h={0.12} y={0.41} seg={4} />
      {/* Battlements */}
      {[-1, 1].map(s => (
        <Box key={s} w={0.10} h={0.10} d={0.10} x={s * 0.14} y={0.52} />
      ))}
      {[0].map(s => (
        <Box key={s} w={0.10} h={0.10} d={0.10} z={0.14} y={0.52} />
      ))}
      {[0].map(s => (
        <Box key={s} w={0.10} h={0.10} d={0.10} z={-0.14} y={0.52} />
      ))}
    </group>
  )
}

export function Knight() {
  return (
    <group>
      <Disc r={0.33} h={0.07} y={0.035} />
      <Cyl  rt={0.16} rb={0.21} h={0.20} y={0.17} />
      {/* Horse head — angled box */}
      <mesh position={[0, 0.46, 0.04]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.24, 0.40, 0.16]} />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 0.33, 0.16]} rotation={[0.6, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.14, 0.16]} />
      </mesh>
    </group>
  )
}

export function Bishop() {
  return (
    <group>
      <Disc r={0.33} h={0.07} y={0.035} />
      <Cyl  rt={0.13} rb={0.18} h={0.30} y={0.22} />
      <Cyl  rt={0.16} rb={0.16} h={0.06} y={0.40} />
      <Cone r={0.15}  h={0.32}  y={0.57} />
      <Sph  r={0.06}  y={0.74} />
    </group>
  )
}

export function Queen() {
  return (
    <group>
      <Disc r={0.36} h={0.07} y={0.035} />
      <Cyl  rt={0.13} rb={0.19} h={0.36} y={0.25} />
      <Sph  r={0.24}  y={0.56} />
      {/* Crown points */}
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.2, 0.75, Math.sin(angle) * 0.2]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
          </mesh>
        )
      })}
    </group>
  )
}

export function King() {
  return (
    <group>
      <Disc r={0.36} h={0.07} y={0.035} />
      <Cyl  rt={0.13} rb={0.19} h={0.36} y={0.25} />
      <Cyl  rt={0.20} rb={0.20} h={0.10} y={0.47} />
      {/* Cross vertical */}
      <Box  w={0.07}  h={0.28}  d={0.07} y={0.62} />
      {/* Cross horizontal */}
      <Box  w={0.22}  h={0.07}  d={0.07} y={0.70} />
    </group>
  )
}

export const PIECE_COMPONENTS: Record<PieceType, () => React.ReactElement> = {
  p: Pawn,
  r: Rook,
  n: Knight,
  b: Bishop,
  q: Queen,
  k: King,
}
