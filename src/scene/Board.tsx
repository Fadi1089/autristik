import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import type { PlacedSquare } from '../game/board'
import { boardSquares } from '../game/board'
import type { Coord } from '../game/coords'
import { placementCandidates } from '../game/matching'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { baseGeometry, candidateGeometry, squareGeometry } from './geometry'
import {
  BASE_HEIGHT,
  BOXES_PER_CELL,
  cellBoxes,
  coordToWorld,
  TERRAIN_HEIGHT,
  TILE_SIZE,
} from './layout'

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

const HIDDEN = new Matrix4().makeScale(0, 0, 0)

/**
 * One cell of a piece: its share of the piece's soil, topped by its terrain square, flush
 * with its neighbours. Each cell owns BOXES_PER_CELL instances; unused ones are hidden.
 */
function writeSquare(
  soil: InstancedMesh,
  squares: InstancedMesh,
  index: number,
  square: PlacedSquare,
  piece: readonly Coord[],
  lift = 0,
) {
  const boxes = cellBoxes(piece, square.coord)
  for (let k = 0; k < BOXES_PER_CELL; k++) {
    const at = index * BOXES_PER_CELL + k
    const ground = boxes[k]
    if (!ground) {
      soil.setMatrixAt(at, HIDDEN)
      squares.setMatrixAt(at, HIDDEN)
      continue
    }
    soil.setMatrixAt(
      at,
      matrix.compose(
        position.set(ground.x, lift, ground.z),
        NO_ROTATION,
        scale.set(ground.width / TILE_SIZE, 1, ground.depth / TILE_SIZE),
      ),
    )
    matrix.compose(
      position.set(ground.x, BASE_HEIGHT + lift, ground.z),
      NO_ROTATION,
      scale.set(ground.width / TILE_SIZE, TERRAIN_HEIGHT[square.terrain], ground.depth / TILE_SIZE),
    )
    squares.setMatrixAt(at, matrix)
    squares.setColorAt(at, color.set(TERRAIN_COLORS[square.terrain]))
  }
}

/** Placed squares (two InstancedMeshes) plus markers on every cell next to the board. */
export function Board() {
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)

  const tiles = useMemo(() => boardSquares(board), [board])
  /** Each piece's cells, so its soil reads as one block. */
  const pieces = useMemo(() => {
    const cells = new Map<number, Coord[]>()
    for (const square of tiles)
      cells.set(square.piece, [...(cells.get(square.piece) ?? []), square.coord])
    return cells
  }, [tiles])
  const candidates = useMemo(() => placementCandidates(board), [board])
  const tileCapacity = capacityFor(tiles.length)
  const candidateCapacity = capacityFor(candidates.length)

  const baseRef = useRef<InstancedMesh>(null)
  const squareRef = useRef<InstancedMesh>(null)
  const candidateRef = useRef<InstancedMesh>(null)
  const drop = useRef<{ indices: number[]; elapsed: number } | null>(null)

  useLayoutEffect(() => {
    const base = baseRef.current
    const squares = squareRef.current
    if (!base || !squares) return

    tiles.forEach((tile, i) => writeSquare(base, squares, i, tile, pieces.get(tile.piece)!))
    base.count = tiles.length * BOXES_PER_CELL
    squares.count = tiles.length * BOXES_PER_CELL
    base.instanceMatrix.needsUpdate = true
    squares.instanceMatrix.needsUpdate = true
    if (squares.instanceColor) squares.instanceColor.needsUpdate = true
    base.computeBoundingSphere()
    squares.computeBoundingSphere()

    const placed = lastPlacement?.squares ?? []
    const indices = tiles.flatMap((t, i) =>
      placed.some((p) => p.coord.q === t.coord.q && p.coord.r === t.coord.r) ? [i] : [],
    )
    drop.current = indices.length ? { indices, elapsed: 0 } : null
  }, [tiles, pieces, tileCapacity, lastPlacement])

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

  // Ease the most recently placed piece down onto the board.
  useFrame((_, delta) => {
    const anim = drop.current
    const base = baseRef.current
    const squares = squareRef.current
    if (!anim || !base || !squares) return

    anim.elapsed = Math.min(DROP_SECONDS, anim.elapsed + delta)
    const t = anim.elapsed / DROP_SECONDS
    const lift = DROP_HEIGHT * (1 - t) ** 3
    for (const index of anim.indices) {
      const tile = tiles[index]!
      writeSquare(base, squares, index, tile, pieces.get(tile.piece)!, lift)
    }
    base.instanceMatrix.needsUpdate = true
    squares.instanceMatrix.needsUpdate = true
    if (t >= 1) drop.current = null
  })

  return (
    <group>
      <instancedMesh
        key={`base-${tileCapacity}`}
        ref={baseRef}
        args={[baseGeometry, undefined, tileCapacity * BOXES_PER_CELL]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={SCENE_COLORS.soil} flatShading />
      </instancedMesh>
      <instancedMesh
        key={`squares-${tileCapacity}`}
        ref={squareRef}
        args={[squareGeometry, undefined, tileCapacity * BOXES_PER_CELL]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`candidate-${candidateCapacity}`}
        ref={candidateRef}
        args={[candidateGeometry, undefined, candidateCapacity]}
      >
        <meshBasicMaterial
          color={SCENE_COLORS.candidate}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}
