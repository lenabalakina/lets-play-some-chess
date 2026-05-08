'use client'

import { useRef } from 'react'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import type { PerspectiveCamera as ThreePerspectiveCamera } from 'three'
import type { Color } from '@/features/chess/types/chess.types'

interface Props {
  playerColor: Color
}

export function CameraRig({ playerColor }: Props) {
  const cameraRef = useRef<ThreePerspectiveCamera>(null)

  // White sees board from +Z side, black from -Z
  const z = playerColor === 'w' ? 10 : -10

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 10, z]}
        fov={50}
        near={0.1}
        far={100}
      />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}     // ~30° — can't go fully top-down
        maxPolarAngle={Math.PI / 2.2}   // ~82° — can't go too flat
        minAzimuthAngle={-Math.PI / 3}  // ±60° horizontal rotation
        maxAzimuthAngle={Math.PI / 3}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  )
}
