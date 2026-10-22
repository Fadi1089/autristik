import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three'
import type { InstancedMesh } from 'three'
import { useGameStore } from '../store/gameStore'
import { burst, CAPACITY, GRAVITY } from './dust'
import type { Particle } from './dust'

const geometry = new SphereGeometry(1, 10, 8)
const matrix = new Matrix4()
const scale = new Vector3()
const NO_ROTATION = new Quaternion()

/** Particles in flight. Plain mutable state outside React: they change every frame. */
let live: Particle[] = []

/** A little dust and a few hopping specks when a tetromino settles on the board. */
export function PlacementDust() {
  const mesh = useRef<InstancedMesh>(null)

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((s, prev) => {
      const placed = s.lastPlacement
      if (!placed || placed === prev.lastPlacement) return
      live = [...live, ...burst(placed.squares)].slice(-CAPACITY)
    })
    return () => {
      unsubscribe()
      live = []
    }
  }, [])

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(delta, 0.05)
    let count = 0
    for (const p of live) {
      p.age += dt
      if (p.age < 0 || p.age >= p.life) continue
      if (p.kind === 'dust') {
        // Drag lets the puff roll out and hang for a moment before it thins away.
        p.velocity.multiplyScalar(Math.exp(-dt * 3.5))
      } else {
        p.velocity.y -= GRAVITY * dt
      }
      p.position.addScaledVector(p.velocity, dt)
      p.position.y = Math.max(0.01, p.position.y)
      const t = p.age / p.life
      // Swell quickly, then shrink away: soft at both ends, so nothing pops.
      const grow = p.kind === 'dust' ? Math.min(1, t * 5) * (1 - t) ** 1.5 : (1 - t) ** 0.8
      m.setMatrixAt(count, matrix.compose(p.position, NO_ROTATION, scale.setScalar(p.size * grow)))
      m.setColorAt(count, p.color)
      count++
    }
    live = live.filter((p) => p.age < p.life)
    m.count = count
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, CAPACITY]}
      count={0}
      frustumCulled={false}
    >
      <meshStandardMaterial roughness={1} transparent opacity={0.9} depthWrite={false} />
    </instancedMesh>
  )
}
