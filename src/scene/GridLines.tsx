import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Vector2, Vector4 } from 'three'
import type { ShaderMaterial } from 'three'
import { modeRules } from '../game/modes'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { gridEdges, TILE_SIZE } from './layout'

/** Line colour: a soft brown that reads on the sand-coloured ground. */
const LINE_COLOR = '#8a7559'
/** Strongest line opacity, right at the centre of the view. */
const MAX_OPACITY = 0.45
/** Fraction of the camera distance over which the lines fade out from the view centre. */
const FADE_RADIUS = 0.75

const vertexShader = /* glsl */ `
  varying vec2 world;
  void main() {
    vec4 position4 = modelMatrix * vec4(position, 1.0);
    world = position4.xz;
    gl_Position = projectionMatrix * viewMatrix * position4;
  }
`

// Cell edges sit half a cell from each cell centre; fwidth keeps lines one pixel-ish wide
// at any zoom. The lines fade smoothly with distance from where the camera looks.
const fragmentShader = /* glsl */ `
  varying vec2 world;
  uniform vec2 centre;
  uniform float radius;
  uniform float cellSize;
  uniform vec3 color;
  uniform float maxOpacity;
  uniform float clipped;
  uniform vec4 clip;
  void main() {
    // A bounded grid draws its lines only within it; the half-cell slack keeps its outline.
    vec2 slack = vec2(cellSize * 0.02);
    if (clipped > 0.5 && (any(lessThan(world, clip.xy - slack)) || any(greaterThan(world, clip.zw + slack))))
      discard;
    vec2 coord = world / cellSize + 0.5;
    vec2 width = max(fwidth(coord), vec2(0.00001));
    vec2 edge = abs(fract(coord - 0.5) - 0.5) / width;
    float line = 1.0 - smoothstep(0.0, 1.2, min(edge.x, edge.y));
    float fade = 1.0 - smoothstep(0.0, radius, distance(world, centre));
    float alpha = line * fade * fade * maxOpacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

/**
 * Cell outlines on the ground, clearest around the centre of the view and fading out
 * towards the edges. Placed pieces stand on top and hide the lines beneath them. On a bounded
 * grid there are lines only within it.
 */
export function GridLines() {
  const bounds = useGameStore((s) => modeRules(s.mode).bounds)
  const uniforms = useMemo(
    () => ({
      centre: { value: new Vector2() },
      radius: { value: 10 },
      cellSize: { value: TILE_SIZE },
      color: { value: new Color(LINE_COLOR) },
      maxOpacity: { value: MAX_OPACITY },
      clipped: { value: bounds ? 1 : 0 },
      clip: { value: new Vector4(...(bounds ? gridEdges(bounds) : [0, 0, 0, 0])) },
    }),
    [bounds],
  )
  const material = useRef<ShaderMaterial>(null)

  useFrame(({ camera }) => {
    const live = material.current?.uniforms
    if (!live) return
    const { focusX, focusZ } = useViewStore.getState()
    ;(live.centre!.value as Vector2).set(focusX, focusZ)
    const distance = Math.hypot(
      camera.position.x - focusX,
      camera.position.y,
      camera.position.z - focusZ,
    )
    live.radius!.value = distance * FADE_RADIUS
  })

  return (
    <mesh
      key={bounds ? 'bounded' : 'open'}
      rotation-x={-Math.PI / 2}
      position-y={0.001}
      renderOrder={1}
    >
      <planeGeometry args={[400, 400]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
