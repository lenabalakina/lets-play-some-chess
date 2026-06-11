'use client'

import { EffectComposer, Bloom } from '@react-three/postprocessing'

/** Shared neon bloom for all 3D chess canvases */
export function NeonBloom() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.12}
        luminanceSmoothing={0.82}
        intensity={1.15}
        mipmapBlur
      />
    </EffectComposer>
  )
}
