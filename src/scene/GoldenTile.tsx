import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { AdditiveBlending } from 'three'
import { TERRAIN_COLORS } from '../palette'
import { baseGeometry, goldTopGeometry } from './geometry'
import { goldGlitterGeometry, goldGrainTexture, goldStarTexture, updateGoldGlitter } from './gold'
import { BASE_HEIGHT, TERRAIN_HEIGHT } from './layout'

type GoldenTileProps = ThreeElements['group'] & {
  glow?: number
  opacity?: number
  overlay?: boolean
}

/** A solid gold joker, with a low roughness finish and small twinkling surface flecks. */
export function GoldenTile({ glow = 0, opacity = 1, overlay = false, ...group }: GoldenTileProps) {
  useFrame(() => updateGoldGlitter(performance.now() / 1000))
  return (
    <group {...group}>
      <mesh geometry={baseGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#d6a12c"
          map={goldGrainTexture}
          metalness={0.35}
          roughness={0.32}
          emissive="#bd8a20"
          emissiveIntensity={0.12 + glow}
          transparent={opacity < 1}
          opacity={opacity}
          depthTest={!overlay}
          depthWrite={!overlay && opacity === 1}
        />
      </mesh>
      <mesh geometry={goldTopGeometry} position-y={BASE_HEIGHT} castShadow receiveShadow>
        <meshStandardMaterial
          color={TERRAIN_COLORS.rainbow}
          map={goldGrainTexture}
          metalness={0.45}
          roughness={0.24}
          emissive="#d6a12c"
          emissiveIntensity={0.18 + glow}
          transparent={opacity < 1}
          opacity={opacity}
          depthTest={!overlay}
          depthWrite={!overlay && opacity === 1}
        />
      </mesh>
      <points
        geometry={goldGlitterGeometry}
        position-y={BASE_HEIGHT + TERRAIN_HEIGHT.rainbow + 0.012}
      >
        <pointsMaterial
          map={goldStarTexture}
          color="#fff4c5"
          vertexColors
          size={0.07}
          sizeAttenuation
          transparent
          opacity={opacity * 0.85}
          depthWrite={false}
          depthTest={!overlay}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
