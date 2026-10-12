import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { baseGeometry, goldTopGeometry } from './geometry'
import { BASE_HEIGHT } from './layout'
import { bedrockTexture, voidTexture } from './specialTextures'

/** Whole dark rock or a slowly revolving violet nebula. */
export function WholeSpecialTile({
  kind,
  glow = 0,
  opacity = 1,
  overlay = false,
  ...group
}: ThreeElements['group'] & {
  kind: 'void' | 'bedrock'
  glow?: number
  opacity?: number
  overlay?: boolean
}) {
  useFrame(() => {
    if (kind === 'void') voidTexture.rotation = -performance.now() / 18000
  })
  const cosmic = kind === 'void'
  const texture = cosmic ? voidTexture : bedrockTexture
  return (
    <group {...group}>
      <mesh geometry={baseGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={cosmic ? '#cca3ed' : '#b5b5ba'}
          map={texture}
          roughness={cosmic ? 0.4 : 0.95}
          emissive={cosmic ? '#af67ee' : '#fff3d6'}
          emissiveMap={cosmic ? texture : null}
          emissiveIntensity={cosmic ? 0.35 + glow : glow}
          transparent={opacity < 1}
          opacity={opacity}
          depthTest={!overlay}
          depthWrite={!overlay && opacity === 1}
        />
      </mesh>
      <mesh
        geometry={goldTopGeometry}
        position-y={BASE_HEIGHT}
        scale-y={cosmic ? 1 : 1.2}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={cosmic ? '#e3baff' : '#ededf1'}
          map={texture}
          roughness={cosmic ? 0.3 : 0.95}
          metalness={cosmic ? 0.15 : 0}
          emissive={cosmic ? '#d9a2ff' : '#fff3d6'}
          emissiveMap={cosmic ? texture : null}
          emissiveIntensity={cosmic ? 0.5 + glow : glow}
          transparent={opacity < 1}
          opacity={opacity}
          depthTest={!overlay}
          depthWrite={!overlay && opacity === 1}
        />
      </mesh>
    </group>
  )
}
