import { SCENE_COLORS } from '../palette'
import { Board } from './Board'
import { CameraRig } from './CameraRig'
import { Ghost } from './Ghost'
import { GoldFlash } from './GoldFlash'
import { GridLines } from './GridLines'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { PlacementDust } from './PlacementDust'
import { PlacementHints } from './PlacementHints'
import { ScoreClouds } from './ScoreClouds'

export function Scene() {
  return (
    <>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <fog attach="fog" args={[SCENE_COLORS.background, 24, 55]} />
      <Lights />
      <CameraRig />
      <Ground />
      <GridLines />
      <PlacementHints />
      <Board />
      <GoldFlash />
      <Ghost />
      <PlacementDust />
      <ScoreClouds />
    </>
  )
}
