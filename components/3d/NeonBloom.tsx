'use client'

import { EffectComposer, Bloom } from '@react-three/postprocessing'

/** Shared neon bloom for all 3D chess canvases */
export function NeonBloom() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        luminanceThreshold={0.04}
        luminanceSmoothing={0.65}
        intensity={2.15}
        mipmapBlur
        radius={0.72}
      />
    </EffectComposer>
  )
}
