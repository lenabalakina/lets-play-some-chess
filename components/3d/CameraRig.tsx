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
  const z = playerColor === 'w' ? 7.5 : -7.5

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 8.5, z]}
        fov={40}
        near={0.1}
        far={100}
      />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 5}     // ~36° — can't go top-down
        maxPolarAngle={Math.PI / 2.4}   // ~75° — can't go too flat
        minAzimuthAngle={-Math.PI / 5}  // ±36° horizontal rotation
        maxAzimuthAngle={Math.PI / 5}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  )
}
