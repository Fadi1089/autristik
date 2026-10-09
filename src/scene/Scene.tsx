import { SCENE_COLORS } from '../palette'
import { Board } from './Board'
import { CameraRig } from './CameraRig'
import { Cursor } from './Cursor'
import { Ghost } from './Ghost'
import { Ground } from './Ground'
import { Lights } from './Lights'

export function Scene() {
  return (
    <>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <fog attach="fog" args={[SCENE_COLORS.background, 24, 55]} />
      <Lights />
      <CameraRig />
      <Ground />
      <Board />
      <Ghost />
      <Cursor />
    </>
  )
}
