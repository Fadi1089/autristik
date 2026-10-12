import type { ThreeElements } from '@react-three/fiber'
import { QUADRANTS, tileKind } from '../game/tiles'
import type { Quadrants, TileMultiplier } from '../game/tiles'
import { BONUS_COLORS, TERRAIN_COLORS } from '../palette'
import { baseGeometry, quadrantGeometry } from './geometry'
import { BASE_HEIGHT, quadrantToLocal, TERRAIN_HEIGHT } from './layout'
import { GoldenTile } from './GoldenTile'
import { WholeSpecialTile } from './WholeSpecialTile'
import { BonusAura } from './BonusAura'

type SquareTileProps = ThreeElements['group'] & {
  quadrants: Quadrants
  multiplier?: TileMultiplier
  /** Brightens the tile slightly, e.g. for the placement ghost. */
  glow?: number
  opacity?: number
  overlay?: boolean
}

const GLOW_COLOR = '#fff3d6'

/**
 * A single, non-instanced tile: a soil block topped by a 2×2 grid of terrain squares.
 * The board renders placed tiles with instancing instead; this is for one-offs.
 */
export function SquareTile({
  quadrants,
  multiplier = 1,
  glow = 0,
  opacity = 1,
  overlay = false,
  ...group
}: SquareTileProps) {
  const kind = tileKind(quadrants)
  if (kind === 'gold') {
    return <GoldenTile {...group} glow={glow} opacity={opacity} overlay={overlay} />
  }
  if (kind === 'void' || kind === 'bedrock')
    return (
      <WholeSpecialTile {...group} kind={kind} glow={glow} opacity={opacity} overlay={overlay} />
    )
  return (
    <group {...group}>
      <mesh geometry={baseGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={BONUS_COLORS[multiplier]}
          metalness={multiplier > 1 ? 0.35 : 0}
          roughness={multiplier > 1 ? 0.4 : 0.85}
          emissive={GLOW_COLOR}
          emissiveIntensity={glow}
          transparent={opacity < 1}
          opacity={opacity}
          depthTest={!overlay}
          depthWrite={!overlay && opacity === 1}
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
              roughness={0.85}
              emissive={GLOW_COLOR}
              emissiveIntensity={glow}
              transparent={opacity < 1}
              opacity={opacity}
              depthTest={!overlay}
              depthWrite={!overlay && opacity === 1}
            />
          </mesh>
        )
      })}
      {multiplier > 1 && <BonusAura multiplier={multiplier} opacity={opacity} />}
    </group>
  )
}
