import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  MeshStandardMaterial,
} from 'three'
import type { InstancedMesh } from 'three'
import treesUrl from '../assets/models/trees.glb?url'
import type { Board } from '../game/board'
import { boardSquares } from '../game/board'
import { coordKey } from '../game/coords'
import { createRng } from '../game/random'
import type { Route } from '../game/routes'
import { AUTUMN_PALETTES, FOREST_PALETTES } from '../palette'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'
import { PropMeshes } from './PropMeshes'
import type { Model, Prop, Spot } from './props'
import { freeSpot, hash, meshesOf, paletteAt, paletteMaterial, pick } from './props'
import { clearOfRoads, roadDeparture } from './roadClearing'
import { useAfterDrop } from './useAfterDrop'

/** Height of the tallest tree at its usual size; the models come with the tallest 1 high. */
const TREE_HEIGHT = 0.6 * TILE_SIZE
/** Trees lean a little, up to this many radians, so a forest doesn't stand to attention. */
const TREE_TILT = 0.05

/** Leaves falling over each red square at any one time. */
const LEAVES_PER_CELL = 5
const LEAF_SIZE = 0.03
/** Height above its square a leaf starts to fall from, about where the crowns are. */
const LEAF_TOP = 0.75 * TREE_HEIGHT

/** The green forests' palettes come first, then autumn's. */
const treeMaterial = paletteMaterial([...FOREST_PALETTES, ...AUTUMN_PALETTES])

/**
 * Trees on every green and red square: five to eight each, crowding one another as in a wood,
 * green on green squares and turned for autumn on red ones. Every choice comes from a generator
 * seeded by the cell, so a square always grows the same trees, roads or none.
 */
function treesOf(board: Board, models: readonly Model[]): Prop[] {
  const trees: Prop[] = []
  for (const { coord: c, terrain } of boardSquares(board)) {
    if (terrain !== 'green' && terrain !== 'red') continue
    const rng = createRng(hash(c.q, c.r, 7))
    const [cx, cz] = coordToWorld(c)
    const cell = coordKey(c)
    const taken: Spot[] = []
    const count = 5 + pick(rng, [25, 35, 25, 15])
    for (let i = 0; i < count; i++) {
      const kind = Math.floor(rng.next() * models.length)
      const size = 0.6 + rng.next() * 0.45
      const spot = freeSpot(rng, cx, cz, models[kind]!.radius * size, taken, (other) => {
        return -0.5 * other.radius
      })
      if (!spot) continue
      taken.push(spot)
      trees.push({
        id: `${cell}:${i}`,
        cell,
        kind,
        palette:
          terrain === 'green'
            ? paletteAt(rng, c, FOREST_PALETTES.length, 4)
            : FOREST_PALETTES.length + paletteAt(rng, c, AUTUMN_PALETTES.length, 5),
        x: spot.x,
        y: BASE_HEIGHT + TERRAIN_HEIGHT[terrain],
        z: spot.z,
        angle: rng.next() * Math.PI * 2,
        tiltX: (rng.next() * 2 - 1) * TREE_TILT,
        tiltZ: (rng.next() * 2 - 1) * TREE_TILT,
        size,
      })
    }
  }
  return trees
}

function useTreeModels(): Model[] {
  const scene = useGLTF(treesUrl, false).scene
  return useMemo(
    () =>
      meshesOf(scene).map((mesh): Model => {
        const geometry = mesh.geometry as BufferGeometry
        geometry.computeBoundingBox()
        const { min, max } = geometry.boundingBox!
        // A little under half the crown's width: neighbouring crowns may brush.
        const radius = 0.42 * Math.max(max.x - min.x, max.z - min.z) * TREE_HEIGHT
        return { geometry, scale: TREE_HEIGHT, radius, material: treeMaterial, castShadow: true }
      }),
    [scene],
  )
}

const time = { value: 0 }

/**
 * Leaves drifting down from the autumn trees: each falls from the crowns to the ground,
 * swaying and tumbling, fades in and out at either end, and starts over. Every movement is in
 * the shader, from each leaf's own place and a few random numbers.
 */
const leafMaterial = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.8 })
leafMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.time = time
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float time;
      attribute vec3 leafOrigin;
      attribute vec4 leafSeed;
      vec3 tumble( vec3 v, vec3 axis, float angle ) {
        float c = cos( angle );
        float s = sin( angle );
        return v * c + cross( axis, v ) * s + axis * dot( axis, v ) * ( 1.0 - c );
      }`,
    )
    .replace(
      '#include <beginnormal_vertex>',
      `float leafPeriod = 3.2 + 2.4 * leafSeed.x;
      float leafT = fract( time / leafPeriod + leafSeed.y );
      vec3 leafAxis = normalize( vec3( leafSeed.z - 0.5, 0.6, leafSeed.w - 0.5 ) );
      float leafSpin = time * ( 1.5 + 2.5 * leafSeed.z ) + leafSeed.w * 6.2831853;
      vec3 objectNormal = tumble( vec3( 0.0, 0.0, 1.0 ), leafAxis, leafSpin );
      #ifdef USE_TANGENT
        vec3 objectTangent = vec3( tangent.xyz );
      #endif`,
    )
    .replace(
      '#include <begin_vertex>',
      `float leafShow = smoothstep( 0.0, 0.08, leafT ) * ( 1.0 - smoothstep( 0.85, 1.0, leafT ) );
      vec3 transformed = leafOrigin + tumble( position * leafShow, leafAxis, leafSpin );
      transformed.y -= leafT * ${LEAF_TOP.toFixed(4)};
      transformed.x += 0.025 * sin( time * 1.6 + leafSeed.x * 6.2831853 ) + 0.03 * leafT * ( leafSeed.z - 0.5 );
      transformed.z += 0.02 * cos( time * 1.3 + leafSeed.y * 6.2831853 ) + 0.03 * leafT * ( leafSeed.w - 0.5 );`,
    )
}
leafMaterial.customProgramCacheKey = () => 'falling-leaves'

/** A leaf: a small diamond, longer than it is wide. */
function leafShape(): BufferGeometry {
  const geometry = new BufferGeometry()
  const s = LEAF_SIZE / 2
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, s, 0, 0.6 * s, 0, 0, 0, -s, 0, -0.6 * s, 0, 0]), 3),
  )
  geometry.setAttribute(
    'normal',
    new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3),
  )
  geometry.setIndex([0, 3, 1, 1, 3, 2])
  return geometry
}

/** Leaves falling over every red square, in its autumn trees' colours. */
function FallingLeaves({ board }: { board: Board }) {
  const cells = useMemo(
    () => boardSquares(board).filter((square) => square.terrain === 'red'),
    [board],
  )
  const count = cells.length * LEAVES_PER_CELL
  const geometry = useMemo(() => {
    const leaves = leafShape()
    const origins = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    cells.forEach(({ coord }, n) => {
      const rng = createRng(hash(coord.q, coord.r, 11))
      const [cx, cz] = coordToWorld(coord)
      const ground = BASE_HEIGHT + TERRAIN_HEIGHT.red
      for (let l = 0; l < LEAVES_PER_CELL; l++) {
        const i = n * LEAVES_PER_CELL + l
        origins.set(
          [
            cx + (rng.next() - 0.5) * 0.8 * TILE_SIZE,
            ground + LEAF_TOP * (0.85 + 0.3 * rng.next()),
            cz + (rng.next() - 0.5) * 0.8 * TILE_SIZE,
          ],
          i * 3,
        )
        seeds.set([rng.next(), rng.next(), rng.next(), rng.next()], i * 4)
      }
    })
    leaves.setAttribute('leafOrigin', new InstancedBufferAttribute(origins, 3))
    leaves.setAttribute('leafSeed', new InstancedBufferAttribute(seeds, 4))
    return leaves
  }, [cells, count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const leaves = mesh.current
    if (!leaves) return
    const colour = new Color()
    cells.forEach(({ coord }, n) => {
      const rng = createRng(hash(coord.q, coord.r, 13))
      const palette = AUTUMN_PALETTES[Math.floor(rng.next() * AUTUMN_PALETTES.length)]!
      for (let l = 0; l < LEAVES_PER_CELL; l++)
        leaves.setColorAt(n * LEAVES_PER_CELL + l, colour.set(palette[l % 2]!))
    })
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true
  }, [cells, geometry])

  useFrame(({ clock }) => {
    time.value = clock.elapsedTime
  })

  if (count === 0) return null
  // Placed in the shader, so the mesh's own bounds say nothing of where the leaves are.
  return (
    <instancedMesh
      key={count}
      ref={mesh}
      args={[geometry, leafMaterial, count]}
      frustumCulled={false}
    />
  )
}

/**
 * Forests on the green and red squares: green woods, and autumn woods with leaves falling. A
 * new square's trees pop up once its piece has landed. Where a new road comes through, the
 * trees in its way shiver, tip over and sink away just ahead of its stones.
 *
 * The trees are from "Forest" by Nathan Merrill and "Forest" by Poly by Google, both CC BY
 * 3.0, painted from the game's own palettes.
 */
export function Forests() {
  const models = useTreeModels()
  const board = useGameStore((s) => s.board)
  const routes = useGameStore((s) => s.routes)
  const lastPlacement = useGameStore((s) => s.lastPlacement)
  const latest = useMemo(() => ({ board, routes }), [board, routes])
  const shown = useAfterDrop<{ board: Board; routes: readonly Route[] }>(
    latest,
    lastPlacement !== null,
  )
  const trees = useMemo(() => treesOf(shown.board, models), [shown.board, models])
  const standing = useMemo(
    () => clearOfRoads(trees, shown.routes, models),
    [trees, shown.routes, models],
  )

  return (
    <>
      <PropMeshes
        props={standing}
        models={models}
        grow={lastPlacement !== null}
        departure={roadDeparture}
      />
      <FallingLeaves board={shown.board} />
    </>
  )
}

useGLTF.preload(treesUrl, false)
