import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef, useState } from 'react'
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh } from 'three'
import type { Departure, Model, Prop } from './props'

/** Time a new square's props take to pop up. */
const GROW_SECONDS = 0.35
/** Time a prop takes to leave: a shiver, then it tips over and sinks into the ground. */
const LEAVE_SECONDS = 0.7
/** Share of LEAVE_SECONDS spent shivering before it tips. */
const SHIVER = 0.3
/** How far it tips over before it is gone, in radians. */
const TOPPLE = 1.2
/** How high an animal hops as it leaves. */
const HOP = 0.05
/** Frames to wait for a leaving prop's start time before it just goes now. */
const DEPARTURE_FRAMES = 20

/** Each rebuild grows the buffers to a power of two, so the meshes are rarely remade. */
function capacityFor(count: number): number {
  return Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, count))))
}

const matrix = new Matrix4()
const position = new Vector3()
const rotation = new Quaternion()
const euler = new Euler(0, 0, 0, 'YXZ')
const scaling = new Vector3()
const paletteColour = new Color()

/** A pop with a little overshoot: 0 → 1 over `t` from 0 to 1. */
function easeOutBack(t: number): number {
  const s = 1.7
  const u = t - 1
  return 1 + (s + 1) * u ** 3 + s * u ** 2
}

/** When a prop that has left the props started to leave: null until known. */
interface Leaving {
  readonly prop: Prop
  start: number | null
  /** Frames spent waiting for its start time. */
  waited: number
}

/**
 * Places each prop in the mesh for its model, with its palette. A prop still growing is scaled
 * up from nothing; a prop leaving shivers, then tips over and sinks away. `now` is the clock
 * time, or null before the first frame, when growing props have yet to start.
 */
function drawProps(
  props: readonly Prop[],
  meshes: readonly (InstancedMesh | null)[],
  models: readonly Model[],
  growing: Map<string, number | null>,
  leaving: Map<string, Leaving>,
  departure: Departure | undefined,
  now: number | null,
): void {
  const counts = meshes.map(() => 0)
  const place = (prop: Prop, scale: number, y: number, tiltX: number, tiltZ: number) => {
    const mesh = meshes[prop.kind]
    if (!mesh) return
    matrix.compose(
      position.set(prop.x, y, prop.z),
      rotation.setFromEuler(euler.set(tiltX, prop.angle, tiltZ)),
      scaling.setScalar(scale),
    )
    // A prop leaving after more than one change may find no room left; it just goes.
    if (counts[prop.kind]! >= mesh.instanceMatrix.count) return
    const i = counts[prop.kind]!++
    mesh.setMatrixAt(i, matrix)
    // The palette's index, read back by paletteMaterial's shader.
    mesh.setColorAt(i, paletteColour.setRGB(prop.palette, 0, 0))
  }

  for (const prop of props) {
    let scale = models[prop.kind]!.scale * prop.size
    if (growing.has(prop.id)) {
      const start = growing.get(prop.id) ?? now
      const t = start === null || now === null ? 0 : Math.min(1, (now - start) / GROW_SECONDS)
      if (start !== null) growing.set(prop.id, start)
      if (t >= 1) growing.delete(prop.id)
      scale *= Math.max(0.001, easeOutBack(t))
    }
    place(prop, scale, prop.y, prop.tiltX, prop.tiltZ)
  }

  for (const [id, leave] of leaving) {
    const { prop } = leave
    if (leave.start === null && now !== null) {
      const start = departure?.(prop, now)
      if (start !== undefined || ++leave.waited > DEPARTURE_FRAMES) leave.start = start ?? now
    }
    const t = leave.start === null || now === null ? 0 : (now - leave.start) / LEAVE_SECONDS
    if (t >= 1) {
      leaving.delete(id)
      continue
    }
    const scale = models[prop.kind]!.scale * prop.size
    if (t < SHIVER) {
      // A shiver that dies down, quicker for a smaller prop.
      const shake = t > 0 ? 0.07 * Math.sin(t * 90 + prop.angle) * (1 - t / SHIVER) : 0
      place(prop, scale, prop.y, prop.tiltX + shake, prop.tiltZ - shake * 0.6)
      continue
    }
    const u = (t - SHIVER) / (1 - SHIVER)
    const fall = u * u
    const style = models[prop.kind]!.leave ?? 'topple'
    if (style === 'hop')
      // A hop up and away, shrinking to nothing as it lands.
      place(
        prop,
        scale * Math.max(0.001, 1 - u ** 2),
        prop.y + HOP * Math.sin(Math.PI * u),
        prop.tiltX - 0.3 * u,
        prop.tiltZ,
      )
    else if (style === 'sink')
      // Straight down into the ground, as if it were never built.
      place(
        prop,
        scale * Math.max(0.001, 1 - 0.4 * fall),
        prop.y - scale * fall,
        prop.tiltX,
        prop.tiltZ,
      )
    // Or it tips over its foot, shrinking as it sinks into the ground.
    else
      place(
        prop,
        scale * Math.max(0.001, 1 - u ** 3),
        prop.y - 0.02 * fall,
        prop.tiltX + TOPPLE * fall,
        prop.tiltZ,
      )
  }

  meshes.forEach((mesh, kind) => {
    if (!mesh) return
    mesh.count = counts[kind]!
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  })
}

/**
 * The props, one instanced mesh per model. When `grow` is set (a piece was just placed), props
 * that are new pop up, and props that have gone leave, starting when `departure` says, or at
 * once without it; otherwise, as for a loaded game or a reset, the props are shown as they are.
 */
export function PropMeshes({
  props,
  models,
  grow,
  departure,
}: {
  props: readonly Prop[]
  models: readonly Model[]
  grow: boolean
  departure?: Departure
}) {
  const meshes = useRef<(InstancedMesh | null)[]>([])
  /** The props drawn last, by id; those that grow, and when they started; those that leave. */
  const known = useRef(new Map<string, Prop>())
  const growing = useRef(new Map<string, number | null>())
  const leaving = useRef(new Map<string, Leaving>())
  // The props before the latest change, so the meshes keep room for the ones leaving.
  const [{ current, previous }, setHistory] = useState({ current: props, previous: props })
  if (current !== props) setHistory({ current: props, previous: current })
  const capacities = models.map((_, kind) => {
    const count = (list: readonly Prop[]) => list.filter((prop) => prop.kind === kind).length
    return capacityFor(count(props) + count(previous))
  })
  const capacityKey = capacities.join()

  useLayoutEffect(() => {
    const ids = new Map(props.map((prop) => [prop.id, prop]))
    if (grow) {
      for (const id of ids.keys()) if (!known.current.has(id)) growing.current.set(id, null)
      for (const [id, prop] of known.current)
        if (!ids.has(id)) leaving.current.set(id, { prop, start: null, waited: 0 })
    } else leaving.current.clear()
    for (const id of ids.keys()) leaving.current.delete(id)
    known.current = ids
    drawProps(props, meshes.current, models, growing.current, leaving.current, departure, null)
  }, [props, models, capacityKey, grow, departure])

  useFrame(({ clock }) => {
    if (growing.current.size > 0 || leaving.current.size > 0)
      drawProps(
        props,
        meshes.current,
        models,
        growing.current,
        leaving.current,
        departure,
        clock.elapsedTime,
      )
  })

  return (
    <group>
      {models.map(({ geometry, material, castShadow }, kind) => (
        <instancedMesh
          key={`${kind}-${capacities[kind]}`}
          ref={(mesh) => {
            meshes.current[kind] = mesh
          }}
          args={[geometry, material, capacities[kind]!]}
          castShadow={castShadow}
          receiveShadow
        />
      ))}
    </group>
  )
}
