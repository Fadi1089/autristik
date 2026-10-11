import type { ThreeElements } from '@react-three/fiber'
import { QUADRANTS } from '../game/tiles'
import type { Quadrants } from '../game/tiles'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { baseGeometry, quadrantGeometry } from './geometry'
import { BASE_HEIGHT, quadrantToLocal, TERRAIN_HEIGHT } from './layout'

type SquareTileProps = ThreeElements['group'] & {
  quadrants: Quadrants
  /** Brightens the tile slightly, e.g. for the placement ghost. */
  glow?: number
  opacity?: number
}

const GLOW_COLOR = '#fff3d6'

/**
 * A single, non-instanced tile: a soil block topped by a 2×2 grid of terrain squares.
 * The board renders placed tiles with instancing instead; this is for one-offs.
 */
export function SquareTile({ quadrants, glow = 0, opacity = 1, ...group }: SquareTileProps) {
  return (
    <group {...group}>
      <mesh geometry={baseGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={SCENE_COLORS.soil}
          flatShading
          emissive={GLOW_COLOR}
          emissiveIntensity={glow}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity === 1}
        />
      </mesh>
      {QUADRANTS.map((quadrant) => {
        const [x, z] = quadrantToLocal(quadrant)
        const terrain = quadrants[quadrant]
        return (
          <mesh
            key={quadrant}
            geometry={quadrantGeometry}
            position={[x, BASE_HEIGHT, z]}
            scale-y={TERRAIN_HEIGHT[terrain]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={TERRAIN_COLORS[terrain]}
              flatShading
              roughness={0.85}
              emissive={GLOW_COLOR}
              emissiveIntensity={glow}
              transparent={opacity < 1}
              opacity={opacity}
              depthWrite={opacity === 1}
            />
          </mesh>
        )
      })}
    </group>
  )
}
