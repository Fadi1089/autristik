import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { BufferGeometry, Mesh } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { PlacedSquare } from '../game/board'
import { boardSquares } from '../game/board'
import { coordKey } from '../game/coords'
import { useGameStore } from '../store/gameStore'
import { pieceGeometry } from './pieceGeometry'

const DROP_HEIGHT = 0.6
export const DROP_SECONDS = 0.35

/** Each piece's geometry, kept while the piece stays on the board so each is only built once. */
const pieceCache = new Map<string, BufferGeometry>()

function geometryFor(squares: readonly PlacedSquare[]): BufferGeometry {
  const key = squares.map((s) => `${coordKey(s.coord)}:${s.terrain}`).join(' ')
  let geometry = pieceCache.get(key)
  if (!geometry) pieceCache.set(key, (geometry = pieceGeometry(squares)))
  return geometry
}

/** Frees the cached geometry of pieces that have left the board. */
function prune(keep: ReadonlySet<BufferGeometry>) {
  for (const [key, geometry] of pieceCache)
    if (!keep.has(geometry)) {
      geometry.dispose()
      pieceCache.delete(key)
    }
}

/**
 * Placed pieces, merged into one mesh: each a soil block topped by its biomes, with slightly
 * rounded outer corners. The piece just placed has its own mesh while it eases down.
 */
export function Board() {
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)

  /** Each piece's squares, by piece id. */
  const pieces = useMemo(() => {
    const squares = new Map<number, PlacedSquare[]>()
    for (const square of boardSquares(board))
      squares.set(square.piece, [...(squares.get(square.piece) ?? []), square])
    return squares
  }, [board])

  /** The piece that just landed, if it is still on the board. */
  const dropping = useMemo(() => {
    const first = lastPlacement?.squares[0]
    return first ? board[coordKey(first.coord)]?.piece : undefined
  }, [board, lastPlacement])

  const geometry = useMemo(() => {
    const all = new Map([...pieces].map(([id, squares]) => [id, geometryFor(squares)]))
    prune(new Set(all.values()))
    const settled = [...all].filter(([id]) => id !== dropping).map(([, g]) => g)
    return {
      settled: settled.length > 0 ? mergeGeometries(settled) : null,
      dropping: dropping === undefined ? null : (all.get(dropping) ?? null),
    }
  }, [pieces, dropping])
  useEffect(() => () => geometry.settled?.dispose(), [geometry])

  const droppingRef = useRef<Mesh>(null)
  const drop = useRef<{ elapsed: number } | null>(null)

  useLayoutEffect(() => {
    drop.current = geometry.dropping ? { elapsed: 0 } : null
    if (droppingRef.current) droppingRef.current.position.y = DROP_HEIGHT
  }, [geometry])

  // Ease the most recently placed piece down onto the board.
  useFrame((_, delta) => {
    const anim = drop.current
    const mesh = droppingRef.current
    if (!anim || !mesh) return
    anim.elapsed = Math.min(DROP_SECONDS, anim.elapsed + delta)
    const t = anim.elapsed / DROP_SECONDS
    mesh.position.y = DROP_HEIGHT * (1 - t) ** 3
    if (t >= 1) drop.current = null
  })

  return (
    <group>
      {geometry.settled && (
        <mesh geometry={geometry.settled} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.9} />
        </mesh>
      )}
      {geometry.dropping && (
        <mesh ref={droppingRef} geometry={geometry.dropping} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}
