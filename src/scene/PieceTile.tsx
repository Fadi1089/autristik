import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { Square } from '../game/tiles'
import { pieceGeometry } from './pieceGeometry'
import { pieceWater, waterMaterial } from './pieceWater'

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
 * A single piece on its own: its soil block topped by its biomes, with slightly rounded outer
 * corners, and live water on its blue squares. The board merges placed pieces into one mesh
 * instead; this is for one-offs.
 */
export function PieceTile({ squares, glow = 0, tint, ...group }: PieceTileProps) {
  const geometry = useMemo(() => pieceGeometry(squares), [squares])
  useEffect(() => () => geometry.dispose(), [geometry])
  // Water only when the piece shows its own biomes, not painted over in one colour.
  const water = useMemo(() => (tint === undefined ? pieceWater(squares) : null), [squares, tint])
  useEffect(() => () => water?.dispose(), [water])
  return (
    <group {...group}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors={tint === undefined}
          color={tint ?? '#ffffff'}
          flatShading
          roughness={0.9}
          emissive={GLOW_COLOR}
          emissiveIntensity={glow}
          transparent={tint !== undefined}
          opacity={tint ? TINT_OPACITY : 1}
        />
      </mesh>
      {water && <mesh geometry={water} material={waterMaterial} receiveShadow />}
    </group>
  )
}
