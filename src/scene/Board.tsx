import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import type { PlacedTile } from '../game/board'
import { boardTiles } from '../game/board'
import { coordsEqual } from '../game/coords'
import { QUADRANTS, tileKind } from '../game/tiles'
import { placementCandidates } from '../game/matching'
import { SCENE_COLORS, SCENE_THEMES, TERRAIN_COLORS } from '../palette'
import { useSettingsStore } from '../store/settingsStore'
import { useGameStore } from '../store/gameStore'
import { baseGeometry, candidateGeometry, quadrantGeometry } from './geometry'
import { BASE_HEIGHT, coordToWorld, quadrantToLocal, TERRAIN_HEIGHT } from './layout'
import { PlacedSpecialTile } from './PlacedSpecialTile'

const DROP_HEIGHT = 0.6
const DROP_SECONDS = 0.35

/** Instance buffers grow in powers of two so the meshes are rarely rebuilt. */
function capacityFor(count: number): number {
  return Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, count))))
}

const matrix = new Matrix4()
const position = new Vector3()
const scale = new Vector3()
const color = new Color()
const ONE = new Vector3(1, 1, 1)
const NO_ROTATION = new Quaternion()

function writeTile(
  base: InstancedMesh,
  squares: InstancedMesh,
  index: number,
  tile: PlacedTile,
  lift = 0,
) {
  const [x, z] = coordToWorld(tile.coord)
  base.setMatrixAt(index, matrix.compose(position.set(x, lift, z), NO_ROTATION, ONE))

  for (const quadrant of QUADRANTS) {
    const terrain = tile.quadrants[quadrant]
    const [dx, dz] = quadrantToLocal(quadrant)
    matrix.compose(
      position.set(x + dx, BASE_HEIGHT + lift, z + dz),
      NO_ROTATION,
      scale.set(1, TERRAIN_HEIGHT[terrain], 1),
    )
    squares.setMatrixAt(index * 4 + quadrant, matrix)
    squares.setColorAt(index * 4 + quadrant, color.set(TERRAIN_COLORS[terrain]))
  }
}

/** Placed tiles (two InstancedMeshes) plus markers on every square that can take a tile. */
export function Board() {
  const theme = useSettingsStore((s) => s.theme)
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)

  const { tiles, specialTiles } = useMemo(() => {
    const tiles: PlacedTile[] = []
    const specialTiles: PlacedTile[] = []
    for (const tile of boardTiles(board)) {
      ;(tileKind(tile.quadrants) !== 'normal' || (tile.multiplier ?? 1) > 1
        ? specialTiles
        : tiles
      ).push(tile)
    }
    return { tiles, specialTiles }
  }, [board])
  const candidates = useMemo(() => placementCandidates(board), [board])
  const tileCapacity = capacityFor(tiles.length)
  const candidateCapacity = capacityFor(candidates.length)

  const baseRef = useRef<InstancedMesh>(null)
  const squareRef = useRef<InstancedMesh>(null)
  const candidateRef = useRef<InstancedMesh>(null)
  const drop = useRef<{ index: number; elapsed: number } | null>(null)

  useLayoutEffect(() => {
    const base = baseRef.current
    const squares = squareRef.current
    if (!base || !squares) return

    tiles.forEach((tile, i) => writeTile(base, squares, i, tile))
    base.count = tiles.length
    squares.count = tiles.length * 4
    base.instanceMatrix.needsUpdate = true
    squares.instanceMatrix.needsUpdate = true
    if (squares.instanceColor) squares.instanceColor.needsUpdate = true
    base.computeBoundingSphere()
    squares.computeBoundingSphere()

    const placedAt = lastPlacement?.coord
    const index = placedAt ? tiles.findIndex((t) => coordsEqual(t.coord, placedAt)) : -1
    drop.current = index >= 0 ? { index, elapsed: 0 } : null
  }, [tiles, tileCapacity, lastPlacement])

  useLayoutEffect(() => {
    const mesh = candidateRef.current
    if (!mesh) return
    candidates.forEach((c, i) => {
      const [x, z] = coordToWorld(c)
      mesh.setMatrixAt(i, matrix.compose(position.set(x, 0.004, z), NO_ROTATION, ONE))
    })
    mesh.count = candidates.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [candidates, candidateCapacity])

  // Ease the most recently placed tile down onto the board.
  useFrame((_, delta) => {
    const anim = drop.current
    const base = baseRef.current
    const squares = squareRef.current
    const tile = anim && tiles[anim.index]
    if (!squares) return
    if (anim && base && tile) {
      anim.elapsed = Math.min(DROP_SECONDS, anim.elapsed + delta)
      const t = anim.elapsed / DROP_SECONDS
      const lift = DROP_HEIGHT * (1 - t) ** 3
      writeTile(base, squares, anim.index, tile, lift)
      base.instanceMatrix.needsUpdate = true
      squares.instanceMatrix.needsUpdate = true
      if (squares.instanceColor) squares.instanceColor.needsUpdate = true
      if (t >= 1) drop.current = null
    }
  })

  return (
    <group>
      <instancedMesh
        key={`base-${tileCapacity}`}
        ref={baseRef}
        args={[baseGeometry, undefined, tileCapacity]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={SCENE_COLORS.soil} />
      </instancedMesh>
      <instancedMesh
        key={`squares-${tileCapacity}`}
        ref={squareRef}
        args={[quadrantGeometry, undefined, tileCapacity * 4]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`candidate-${candidateCapacity}`}
        ref={candidateRef}
        args={[candidateGeometry, undefined, candidateCapacity]}
      >
        <meshBasicMaterial
          color={SCENE_THEMES[theme].candidate}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </instancedMesh>
      {specialTiles.map((tile) => (
        <PlacedSpecialTile
          key={`${tile.coord.q},${tile.coord.r}`}
          tile={tile}
          animate={!!lastPlacement && coordsEqual(tile.coord, lastPlacement.coord)}
        />
      ))}
    </group>
  )
}
