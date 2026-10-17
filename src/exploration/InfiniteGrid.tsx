import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, Matrix3, Matrix4, Vector3 } from 'three'
import { SCENE_THEMES } from '../palette'
import { useSettingsStore } from '../store/settingsStore'
import { GRID_CELL_SIZE, GRID_SECTION_SIZE, gridPhase } from './gridMath'

const vertexShader = /* glsl */ `
  varying vec2 screenPosition;
  void main() {
    screenPosition = position.xy;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Intersect each screen ray with an unbounded ground plane. No finite mesh edge,
// distance fade or fog can hide the grid at the edge of the visible viewport.
const fragmentShader = /* glsl */ `
  varying vec2 screenPosition;
  uniform mat4 inverseProjection;
  uniform mat3 cameraRotation;
  uniform vec3 localCameraPosition;
  uniform vec3 groundColor;
  uniform vec3 lineColor;
  uniform float cellSize;
  uniform float sectionSize;

  float gridLine(vec2 position, float spacing, float thickness) {
    vec2 coord = position / spacing;
    vec2 pixels = max(fwidth(coord), vec2(0.00001));
    vec2 edge = abs(fract(coord - 0.5) - 0.5) / pixels;
    return 1.0 - smoothstep(0.0, thickness, min(edge.x, edge.y));
  }

  void main() {
    vec4 view = inverseProjection * vec4(screenPosition, 0.5, 1.0);
    vec3 ray = normalize(cameraRotation * (view.xyz / view.w));
    vec3 color = groundColor;
    if (ray.y < -0.000001) {
      float distanceToGround = -localCameraPosition.y / ray.y;
      vec2 point = (localCameraPosition + ray * distanceToGround).xz;
      // Integer world coordinates remain tile centres, matching the square layout.
      vec2 grid = point + cellSize * 0.5;
      float cell = gridLine(grid, cellSize, 1.15);
      float section = gridLine(grid, sectionSize, 1.6);
      color = mix(color, lineColor, max(cell * 0.28, section * 0.43));
    }
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

export function InfiniteGrid() {
  const theme = useSettingsStore((s) => s.theme)
  const uniforms = useMemo(
    () => ({
      inverseProjection: { value: new Matrix4() },
      cameraRotation: { value: new Matrix3() },
      localCameraPosition: { value: new Vector3() },
      groundColor: { value: new Color(SCENE_THEMES[theme].ground) },
      lineColor: { value: new Color(theme === 'dark' ? '#a6bbb1' : '#82745d') },
      cellSize: { value: GRID_CELL_SIZE },
      sectionSize: { value: GRID_SECTION_SIZE * GRID_CELL_SIZE },
    }),
    [theme],
  )

  useFrame(({ camera }) => {
    camera.updateMatrixWorld()
    uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse)
    uniforms.cameraRotation.value.setFromMatrix4(camera.matrixWorld)
    uniforms.localCameraPosition.value.set(
      gridPhase(camera.position.x),
      camera.position.y,
      gridPhase(camera.position.z),
    )
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
