'use client'

import { EffectComposer, Bloom } from '@react-three/postprocessing'

/** Shared neon bloom for all 3D chess canvases */
export function NeonBloom() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        luminanceThreshold={0.06}
        luminanceSmoothing={0.72}
        intensity={1.85}
        mipmapBlur
        radius={0.78}
      />
    </EffectComposer>
  )
}
