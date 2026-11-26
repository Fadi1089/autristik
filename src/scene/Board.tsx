import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial } from 'three'
import type { BufferGeometry, Mesh } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { PlacedSquare } from '../game/board'
import { boardSquares } from '../game/board'
import { coordKey } from '../game/coords'
import { useGameStore } from '../store/gameStore'
import { isRevealing, revealNow, useRevealStore } from '../store/revealStore'
import type { Reveal } from '../store/revealStore'
import { pieceGeometry } from './pieceGeometry'
import { pieceWater, waterMaterial, waterTime } from './pieceWater'

const DROP_HEIGHT = 0.6
export const DROP_SECONDS = 0.35

/** A piece's blocks, and the water on its blue squares if it has any. */
interface Built {
  readonly blocks: BufferGeometry
  readonly water: BufferGeometry | null
}

/** Each piece's geometry, kept while the piece stays on the board so each is only built once. */
const pieceCache = new Map<string, Built>()

function geometryFor(squares: readonly PlacedSquare[]): Built {
  const key = squares.map((s) => `${coordKey(s.coord)}:${s.terrain}`).join(' ')
  let built = pieceCache.get(key)
  if (!built)
    pieceCache.set(key, (built = { blocks: pieceGeometry(squares), water: pieceWater(squares) }))
  return built
}

/** Frees the cached geometry of pieces that have left the board. */
function prune(keep: ReadonlySet<Built>) {
  for (const [key, built] of pieceCache)
    if (!keep.has(built)) {
      built.blocks.dispose()
      built.water?.dispose()
      pieceCache.delete(key)
    }
}

/** The blocks' look, shared by the pieces of a landscape growing in, each drawn on its own. */
const blockMaterial = new MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.9,
})

/**
 * A landscape growing in: the pieces shown so far, each its own mesh, easing down one after
 * another in the order their cells collapsed, from the centre out.
 */
function GrowingPieces({
  pieces,
  shown,
  reveal,
}: {
  pieces: ReadonlyMap<number, readonly PlacedSquare[]>
  shown: number
  reveal: Reveal
}) {
  const meshes = useRef(new Map<number, Mesh>())
  useFrame(() => {
    const now = revealNow()
    for (const [id, mesh] of meshes.current) {
      const t = Math.min(1, Math.max(0, (now - reveal.start - id * reveal.step) / DROP_SECONDS))
      mesh.position.y = DROP_HEIGHT * (1 - t) ** 3
    }
  })
  return (
    <group>
      {[...pieces]
        .filter(([id]) => id < shown)
        .map(([id, squares]) => {
          const built = geometryFor(squares)
          return (
            <mesh
              key={id}
              ref={(mesh) => {
                if (mesh) meshes.current.set(id, mesh)
                else meshes.current.delete(id)
              }}
              geometry={built.blocks}
              material={blockMaterial}
              position-y={DROP_HEIGHT}
              castShadow
              receiveShadow
            >
              {built.water && (
                <mesh geometry={built.water} material={waterMaterial} receiveShadow />
              )}
            </mesh>
          )
        })}
    </group>
  )
}

const merged = (geometries: readonly BufferGeometry[]) =>
  geometries.length > 0 ? mergeGeometries([...geometries]) : null

/**
 * Placed pieces, merged into one mesh, except while a landscape grows in: each a soil block topped by its biomes, with slightly
 * rounded outer corners, and live water on its blue squares. The piece just placed has its own
 * meshes while it eases down, its water riding down with it.
 */
export function Board() {
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)
  const revealing = useRevealStore(isRevealing)
  const reveal = useRevealStore((s) => s.reveal)
  const shown = useRevealStore((s) => s.shown)

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
    const settled = [...all].filter(([id]) => id !== dropping).map(([, built]) => built)
    return {
      settled: merged(settled.map((built) => built.blocks)),
      settledWater: merged(settled.flatMap((built) => (built.water ? [built.water] : []))),
      dropping: dropping === undefined ? null : (all.get(dropping) ?? null),
    }
  }, [pieces, dropping])
  useEffect(
    () => () => {
      geometry.settled?.dispose()
      geometry.settledWater?.dispose()
    },
    [geometry],
  )

  const droppingRef = useRef<Mesh>(null)
  const drop = useRef<{ elapsed: number } | null>(null)

  useLayoutEffect(() => {
    drop.current = geometry.dropping ? { elapsed: 0 } : null
    if (droppingRef.current) droppingRef.current.position.y = DROP_HEIGHT
  }, [geometry])

  // Ease the most recently placed piece down onto the board.
  useFrame(({ clock }, delta) => {
    waterTime.value = clock.elapsedTime
    useRevealStore.getState().tick(revealNow(), DROP_SECONDS)
    const anim = drop.current
    const mesh = droppingRef.current
    if (!anim || !mesh) return
    anim.elapsed = Math.min(DROP_SECONDS, anim.elapsed + delta)
    const t = anim.elapsed / DROP_SECONDS
    mesh.position.y = DROP_HEIGHT * (1 - t) ** 3
    if (t >= 1) drop.current = null
  })

  if (revealing && reveal) return <GrowingPieces pieces={pieces} shown={shown} reveal={reveal} />

  return (
    <group>
      {geometry.settled && (
        <mesh geometry={geometry.settled} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.9} />
        </mesh>
      )}
      {geometry.settledWater && (
        <mesh geometry={geometry.settledWater} material={waterMaterial} receiveShadow />
      )}
      {geometry.dropping && (
        <mesh ref={droppingRef} geometry={geometry.dropping.blocks} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.9} />
          {geometry.dropping.water && (
            <mesh geometry={geometry.dropping.water} material={waterMaterial} receiveShadow />
          )}
        </mesh>
      )}
    </group>
  )
}
