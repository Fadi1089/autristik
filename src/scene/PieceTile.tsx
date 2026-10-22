import type { ThreeElements } from '@react-three/fiber'
import type { Square } from '../game/tiles'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { baseGeometry, squareGeometry } from './geometry'
import { BASE_HEIGHT, cellBoxes, TERRAIN_HEIGHT, TILE_SIZE } from './layout'

type PieceTileProps = ThreeElements['group'] & {
  /** The piece's squares, in coordinates relative to this group. */
  squares: readonly Square[]
  /** Brightens the piece slightly, e.g. for the placement ghost. */
  glow?: number
  /** Paints the whole piece in one see-through colour, e.g. red where it can't go. */
  tint?: string
}

const GLOW_COLOR = '#fff3d6'
const TINT_OPACITY = 0.7

/**
 * A single, non-instanced piece: one continuous soil base topped by flush terrain squares,
 * one per cell. The board renders placed pieces with instancing instead; this is for one-offs.
 */
export function PieceTile({ squares, glow = 0, tint, ...group }: PieceTileProps) {
  const cells = squares.map((s) => s.coord)
  return (
    <group {...group}>
      {squares.flatMap((square) =>
        cellBoxes(cells, square.coord).map((soil, k) => (
          <group key={`${square.coord.q},${square.coord.r}-${k}`}>
            <mesh
              geometry={baseGeometry}
              position={[soil.x, 0, soil.z]}
              scale={[soil.width / TILE_SIZE, 1, soil.depth / TILE_SIZE]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={tint ?? SCENE_COLORS.soil}
                flatShading
                emissive={GLOW_COLOR}
                emissiveIntensity={glow}
                transparent={tint !== undefined}
                opacity={tint ? TINT_OPACITY : 1}
              />
            </mesh>
            <mesh
              geometry={squareGeometry}
              position={[soil.x, BASE_HEIGHT, soil.z]}
              scale={[
                soil.width / TILE_SIZE,
                TERRAIN_HEIGHT[square.terrain],
                soil.depth / TILE_SIZE,
              ]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={tint ?? TERRAIN_COLORS[square.terrain]}
                flatShading
                roughness={0.85}
                emissive={GLOW_COLOR}
                emissiveIntensity={glow}
                transparent={tint !== undefined}
                opacity={tint ? TINT_OPACITY : 1}
              />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}
