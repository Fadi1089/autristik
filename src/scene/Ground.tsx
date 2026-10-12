import { SCENE_THEMES } from '../palette'
import { useSettingsStore } from '../store/settingsStore'
import { useGameStore } from '../store/gameStore'
import { worldToCoord } from './layout'

/** Click/tap selects the lane perpendicular to the chosen gravity direction. */
export function Ground() {
  const theme = useSettingsStore((s) => s.theme)
  const selectPosition = useGameStore((s) => s.selectPosition)
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position-y={-0.002}
      receiveShadow
      onClick={(e) => {
        if (e.delta > 6) return
        selectPosition(worldToCoord(e.point.x, e.point.z))
      }}
    >
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={SCENE_THEMES[theme].ground} roughness={1} />
    </mesh>
  )
}
