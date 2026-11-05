import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  ShapeGeometry,
} from 'three'
import type { Square } from '../game/tiles'
import { TERRAIN_COLORS } from '../palette'
import { BASE_HEIGHT, TERRAIN_HEIGHT } from './layout'
import { CORNER_SEGMENTS, pieceShapes } from './pieceGeometry'
import type { Point, Triangle } from './waterSurface'
import { distanceToOutline, refine } from './waterSurface'

/** How far the water lies above the top of its blue square at the shore, so the two never flicker. */
const LIFT = 0.002
/** Longest edge of the water's mesh: fine enough for the swells to roll across it. */
const MESH_EDGE = 0.03
/** Width of the band along the shore where the swells die down, so the water meets its edge flat. */
const SHORE_WIDTH = 0.06
/** Colour of the light lines that drift over the water. */
const SHIMMER = '#bfe6ff'

/**
 * The swells, the same in both shaders: three long waves rolling different ways, each with its
 * direction, length, height and speed. The water rises by up to SWELL_HEIGHT above its resting
 * level and sinks as far below it. Returns the height and its slope along x and z.
 */
const SWELLS = [
  [0.8, 0.6, 0.46, 0.004, 1.1],
  [-0.5, 0.85, 0.29, 0.0025, 1.5],
  [0.95, -0.3, 0.21, 0.0015, 1.9],
] as const
const SWELL_HEIGHT = SWELLS.reduce((sum, wave) => sum + wave[3], 0)
const f = (n: number) => n.toFixed(4)
const SWELL_GLSL = `
uniform float time;
vec3 swellWave( vec2 p, vec2 direction, float length, float height, float speed ) {
  float k = 6.2831853 / length;
  float phase = k * dot( normalize( direction ), p ) - speed * time;
  return vec3( height * sin( phase ), height * k * cos( phase ) * normalize( direction ) );
}
vec3 waterSwell( vec2 p ) {
  return ${SWELLS.map(([x, z, length, height, speed]) => `swellWave( p, vec2( ${f(x)}, ${f(z)} ), ${f(length)}, ${f(height)}, ${f(speed)} )`).join('\n    + ')};
}`

/** The scene's clock, which the board keeps up to date for every piece's water. */
export const waterTime = { value: 0 }

/**
 * Water on the blue squares, in their own blue. Its surface rolls with slow swells, rising and
 * sinking for real, lighter on the crests and darker in the troughs, with the sun glinting off
 * their slopes; finer ripples and faint light lines drift over it. Along the shore the swells
 * die down, so the water meets the edge of its square flat. Every movement is in the shader,
 * from the water's place in the world and the time, so neighbouring pieces' water lines up, and
 * a piece's water carries on as it should while the piece is moved about: as the ghost in hand,
 * or dropping onto the board.
 */
export const waterMaterial = new MeshStandardMaterial({
  color: new Color(TERRAIN_COLORS.blue),
  roughness: 0.16,
  metalness: 0,
})
waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.time = waterTime
  shader.uniforms.shimmer = { value: new Color(SHIMMER) }
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      ${SWELL_GLSL}
      attribute float shore;
      varying vec2 vWaterXZ;
      varying float vShore;`,
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vWaterXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
      vShore = shore;
      transformed.y += shore * ( ${f(SWELL_HEIGHT)} + waterSwell( vWaterXZ ).x );`,
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      ${SWELL_GLSL}
      uniform vec3 shimmer;
      varying vec2 vWaterXZ;
      varying float vShore;
      float waterHash( vec2 p ) {
        return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
      }
      float waterNoise( vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );
        vec2 u = f * f * ( 3.0 - 2.0 * f );
        return mix(
          mix( waterHash( i ), waterHash( i + vec2( 1.0, 0.0 ) ), u.x ),
          mix( waterHash( i + vec2( 0.0, 1.0 ) ), waterHash( i + vec2( 1.0, 1.0 ) ), u.x ),
          u.y
        );
      }
      // Two layers of fine ripples drifting different ways, so the surface never settles.
      float ripples( vec2 p ) {
        return 0.6 * waterNoise( p * 7.0 + vec2( 0.35, 0.22 ) * time )
          + 0.4 * waterNoise( p * 13.0 - vec2( 0.28, -0.4 ) * time );
      }`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float level = ripples( vWaterXZ );
      // How high the swell stands here, from 0 in a trough to 1 on a crest.
      float crest = 0.5 + 0.5 * vShore * waterSwell( vWaterXZ ).x / ${f(SWELL_HEIGHT)};
      // Faint thin lines where the ripples cross the middle of their height.
      float lines = pow( 1.0 - abs( 2.0 * level - 1.0 ), 10.0 );
      diffuseColor.rgb *= 0.68 + 0.5 * crest + 0.06 * level;
      diffuseColor.rgb = mix( diffuseColor.rgb, shimmer, 0.15 * lines );`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      {
        // The swells' slope, and a little of the ripples', tip the surface so the sun glints
        // off it as they move.
        float e = 0.01;
        float h = ripples( vWaterXZ );
        vec2 fine = vec2(
          ripples( vWaterXZ + vec2( e, 0.0 ) ) - h,
          ripples( vWaterXZ + vec2( 0.0, e ) ) - h
        ) / e;
        vec2 slope = 3.0 * vShore * waterSwell( vWaterXZ ).yz + 0.006 * fine;
        vec3 tipped = normalize( vec3( -slope.x, 1.0, -slope.y ) );
        normal = normalize( ( viewMatrix * vec4( tipped, 0.0 ) ).xyz );
      }`,
    )
}
waterMaterial.customProgramCacheKey = () => 'water'

/**
 * The water over each blue region of one piece, or null if it has none: each region's outline
 * cut into a fine mesh, each point knowing how far it is from the shore.
 */
export function pieceWater(squares: readonly Square[]): BufferGeometry | null {
  const height = BASE_HEIGHT + TERRAIN_HEIGHT.blue + LIFT
  const positions: number[] = []
  const shores: number[] = []
  const index: number[] = []
  if (!squares.some((square) => square.terrain === 'blue')) return null
  for (const { terrain, shape } of pieceShapes(squares).regions) {
    if (terrain !== 'blue') continue
    const flat = new ShapeGeometry(shape, CORNER_SEGMENTS)
    const at = flat.getAttribute('position')
    const points = Array.from({ length: at.count }, (_, i): Point => [at.getX(i), at.getY(i)])
    const cut = flat.index!.array
    const triangles = Array.from({ length: cut.length / 3 }, (_, i): Triangle => [
      cut[i * 3]!,
      cut[i * 3 + 1]!,
      cut[i * 3 + 2]!,
    ])
    flat.dispose()
    const outline = shape.extractPoints(CORNER_SEGMENTS).shape.map((p): Point => [p.x, p.y])
    const mesh = refine(points, triangles, MESH_EDGE)
    const first = positions.length / 3
    for (const p of mesh.points) {
      // Shapes are drawn in x/y; lying flat, shape y becomes world -z.
      positions.push(p[0], height, -p[1])
      const t = Math.min(1, distanceToOutline(p, outline) / SHORE_WIDTH)
      shores.push(t * t * (3 - 2 * t))
    }
    for (const tri of mesh.triangles) index.push(first + tri[0], first + tri[1], first + tri[2])
  }
  if (index.length === 0) return null
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute(
    'normal',
    new Float32BufferAttribute(
      positions.map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3,
    ),
  )
  geometry.setAttribute('shore', new Float32BufferAttribute(shores, 1))
  geometry.setIndex(index)
  geometry.computeBoundingSphere()
  return geometry
}
