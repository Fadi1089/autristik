import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial } from 'three'
import roadUrl from '../assets/models/road.glb?url'
import type { Board } from '../game/board'
import { getSquare } from '../game/board'
import type { CoordKey } from '../game/coords'
import { directionOffset } from '../game/coords'
import { ROAD_STONES } from '../palette'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'
import type { RoadCell, RoadPiece } from './roadPieces'
import { appearOrder, roadCells, roadStarts } from './roadPieces'
import { useScenery } from './useScenery'

/** Time from one cell of a new road to the next, as its stones appear from start to end. */
const STEP_SECONDS = 0.12
/** Time one stone takes to pop up. */
const POP_SECONDS = 0.32
/** How far above its place a stone starts, before it settles. */
const DROP = 0.06
/** Most a stone is put off by, so the stones of a cell don't come up in a stiff line. */
const JITTER_SECONDS = 0.05
/** Start time of a stone that is already there. */
const LONG_AGO = -1e4

/** One of the road models, read once from the GLB. */
interface PieceModel {
  readonly position: ArrayLike<number>
  readonly normal: ArrayLike<number>
  readonly index: ArrayLike<number>
  /** Per vertex: light (0) or dark (1) stone. */
  readonly part: Uint8Array
  /** Per vertex: which stone it belongs to. */
  readonly stone: Uint16Array
  /** Middle of each stone, three numbers to a stone. */
  readonly centres: Float32Array
}

/**
 * The model's vertex colours carry, for each stone, whether it is light or dark in red, and
 * which stone it is in green, as id / 256 (see tools/road-glb.py).
 */
function pieceModel(mesh: Mesh): PieceModel {
  const geometry = mesh.geometry as BufferGeometry
  const position = geometry.getAttribute('position')
  const colour = geometry.getAttribute('color')
  const part = new Uint8Array(position.count)
  const stone = new Uint16Array(position.count)
  let stones = 0
  for (let v = 0; v < position.count; v++) {
    part[v] = Math.round(colour.getX(v))
    stone[v] = Math.round(colour.getY(v) * 256)
    stones = Math.max(stones, stone[v]! + 1)
  }
  const sums = new Float32Array(stones * 4)
  for (let v = 0; v < position.count; v++) {
    const s = stone[v]! * 4
    sums[s] = sums[s]! + position.getX(v)
    sums[s + 1] = sums[s + 1]! + position.getY(v)
    sums[s + 2] = sums[s + 2]! + position.getZ(v)
    sums[s + 3] = sums[s + 3]! + 1
  }
  const centres = new Float32Array(stones * 3)
  for (let s = 0; s < stones; s++)
    for (let axis = 0; axis < 3; axis++)
      centres[s * 3 + axis] = sums[s * 4 + axis]! / Math.max(1, sums[s * 4 + 3]!)
  return {
    position: position.array,
    normal: geometry.getAttribute('normal').array,
    index: geometry.index!.array,
    part,
    stone,
    centres,
  }
}

function useRoadModels(): Readonly<Record<RoadPiece, PieceModel>> {
  const scene = useGLTF(roadUrl, false).scene
  return useMemo(() => {
    const byName = (name: string) => pieceModel(scene.getObjectByName(name) as Mesh)
    return {
      straight: byName('road-straight'),
      turn: byName('road-turn'),
      tee: byName('road-tee'),
      cross: byName('road-cross'),
    }
  }, [scene])
}

/** A steady number from 0 to 1 for stone `s` of the cell (q, r). */
function jitter(q: number, r: number, s: number): number {
  const x = Math.sin(q * 127.1 + r * 311.7 + s * 74.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * The stones of every road cell in one mesh, each model turned to fit its cell and lying on the
 * cell's own biome. Each stone carries its middle and the time it starts to appear, for the
 * material to pop it up: `startOf` gives a cell's start, null for one that is already there.
 */
function roadGeometry(
  board: Board,
  cells: readonly RoadCell[],
  models: Readonly<Record<RoadPiece, PieceModel>>,
  startOf: (cell: RoadCell) => number | null,
): BufferGeometry {
  let vertices = 0
  let indices = 0
  for (const { piece } of cells) {
    vertices += models[piece].part.length
    indices += models[piece].index.length
  }
  const position = new Float32Array(vertices * 3)
  const normal = new Float32Array(vertices * 3)
  const colour = new Float32Array(vertices * 3)
  const centre = new Float32Array(vertices * 3)
  const start = new Float32Array(vertices)
  const index = new Uint32Array(indices)
  const stoneColours = ROAD_STONES.map((hex) => new Color(hex))
  const half = TILE_SIZE / 2

  let v0 = 0
  let i0 = 0
  for (const cell of cells) {
    const model = models[cell.piece]
    const [cx, cz] = coordToWorld(cell.coord)
    const terrain = getSquare(board, cell.coord)?.terrain ?? 'black'
    const cy = BASE_HEIGHT + TERRAIN_HEIGHT[terrain] + 0.001
    const angle = (cell.turns * Math.PI) / 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    // Turned about y as three.js turns by `angle`, scaled to the cell, moved onto it.
    const place = (out: Float32Array, at: number, x: number, y: number, z: number) => {
      out[at] = cx + TILE_SIZE * (x * cos + z * sin)
      out[at + 1] = cy + TILE_SIZE * y
      out[at + 2] = cz + TILE_SIZE * (z * cos - x * sin)
    }

    // Each stone starts once the road has come that far across the cell: how near it is to the
    // edge the road comes in by, against the edge it goes out by.
    const cellStart = startOf(cell)
    const stones = model.centres.length / 3
    const starts = new Float32Array(stones).fill(LONG_AGO)
    const centres = new Float32Array(stones * 3)
    const entry = directionOffset(cell.from)
    const exit = directionOffset(cell.to)
    for (let s = 0; s < stones; s++) {
      place(
        centres,
        s * 3,
        model.centres[s * 3]!,
        model.centres[s * 3 + 1]!,
        model.centres[s * 3 + 2]!,
      )
      if (cellStart === null) continue
      const x = centres[s * 3]!
      const z = centres[s * 3 + 2]!
      const fromEntry = Math.hypot(x - cx - entry.q * half, z - cz - entry.r * half)
      const toExit = Math.hypot(x - cx - exit.q * half, z - cz - exit.r * half)
      const across = fromEntry / Math.max(1e-6, fromEntry + toExit)
      starts[s] =
        cellStart + across * STEP_SECONDS + jitter(cell.coord.q, cell.coord.r, s) * JITTER_SECONDS
    }

    for (let v = 0; v < model.part.length; v++) {
      const at = (v0 + v) * 3
      place(
        position,
        at,
        model.position[v * 3]!,
        model.position[v * 3 + 1]!,
        model.position[v * 3 + 2]!,
      )
      const nx = model.normal[v * 3]!
      const nz = model.normal[v * 3 + 2]!
      normal[at] = nx * cos + nz * sin
      normal[at + 1] = model.normal[v * 3 + 1]!
      normal[at + 2] = nz * cos - nx * sin
      stoneColours[model.part[v]!]!.toArray(colour, at)
      const s = model.stone[v]!
      centre.set(centres.subarray(s * 3, s * 3 + 3), at)
      start[v0 + v] = starts[s]!
    }
    for (let i = 0; i < model.index.length; i++) index[i0 + i] = v0 + model.index[i]!
    v0 += model.part.length
    i0 += model.index.length
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('normal', new BufferAttribute(normal, 3))
  geometry.setAttribute('color', new BufferAttribute(colour, 3))
  geometry.setAttribute('stoneCentre', new BufferAttribute(centre, 3))
  geometry.setAttribute('stoneStart', new BufferAttribute(start, 1))
  geometry.setIndex(new BufferAttribute(index, 1))
  geometry.computeBoundingSphere()
  return geometry
}

const time = { value: 0 }

/**
 * The stones' own colours, with each stone popping up about its middle from its start time:
 * it grows with a little overshoot as it settles down from just above its place.
 */
const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })
material.onBeforeCompile = (shader) => {
  shader.uniforms.time = time
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float time;
      attribute vec3 stoneCentre;
      attribute float stoneStart;`,
    )
    .replace(
      '#include <begin_vertex>',
      `float grow = clamp( ( time - stoneStart ) / ${POP_SECONDS.toFixed(3)}, 0.0, 1.0 );
      float u = grow - 1.0;
      float pop = 1.0 + 2.7 * u * u * u + 1.7 * u * u;
      vec3 transformed = stoneCentre + ( position - stoneCentre ) * pop;
      transformed.y += ( 1.0 - grow ) * ( 1.0 - grow ) * ${DROP.toFixed(3)};`,
    )
}
material.customProgramCacheKey = () => 'road-stones'

/** Each cell's piece and how it is turned, to tell when a cell's road has changed. */
const shapeOf = (cell: RoadCell) => `${cell.piece}${cell.turns}`

/**
 * The roads between cities, laid in stone along their shortest allowed way: a straight, a turn,
 * a T or a cross on each cell they cross, up to the edge of each city. A new road appears once
 * the piece that made it has landed, its stones popping up one after another from its first
 * city to its second.
 *
 * The stones are "Path Straight" by Quaternius, CC0, made into its turn, T and cross by
 * tools/road-glb.py.
 */
export function Roads() {
  const models = useRoadModels()
  const clock = useThree((s) => s.clock)
  const shown = useScenery()
  const { grow } = shown
  const mesh = useRef<Mesh>(null)
  /** The shape of each cell's road last drawn, so only new or changed cells appear. */
  const known = useRef(new Map<CoordKey, string>())

  useLayoutEffect(() => {
    if (!mesh.current) return
    const cells = roadCells(shown.routes)
    const shapes = new Map(cells.map((cell) => [cell.key, shapeOf(cell)]))
    // Only a placement or a landscape growing in lays roads stone by stone; a loaded game shows
    // its roads at once.
    const order = grow
      ? appearOrder(shown.routes, (key) => known.current.get(key) !== shapes.get(key))
      : new Map<CoordKey, number>()
    known.current = shapes
    const now = clock.elapsedTime
    for (const [key, step] of order) roadStarts.set(key, now + step * STEP_SECONDS)
    const geometry = roadGeometry(shown.board, cells, models, (cell) => {
      const step = order.get(cell.key)
      return step === undefined ? null : now + step * STEP_SECONDS
    })
    mesh.current.geometry.dispose()
    mesh.current.geometry = geometry
  }, [shown.routes, shown.board, models, grow, clock])

  useFrame(({ clock }) => {
    time.value = clock.elapsedTime
  })

  return <mesh ref={mesh} material={material} receiveShadow />
}

useGLTF.preload(roadUrl, false)
