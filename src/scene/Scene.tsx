import { SCENE_THEMES } from '../palette'
import { useSettingsStore } from '../store/settingsStore'
import { Board } from './Board'
import { CameraRig } from './CameraRig'
import { Ghost } from './Ghost'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { VoidBlast } from './VoidBlast'

export function Scene() {
  const theme = useSettingsStore((s) => s.theme)
  const colors = SCENE_THEMES[theme]
  return (
    <>
      <color attach="background" args={[colors.background]} />
      <fog attach="fog" args={[colors.background, 65, 130]} />
      <Lights />
      <CameraRig />
      <Ground />
      <Board />
      <Ghost />
      <VoidBlast />
    </>
  )
}
