import { Suspense } from 'react'
import { SCENE_COLORS } from '../palette'
import { Board } from './Board'
import { CameraRig } from './CameraRig'
import { Cities } from './Cities'
import { Farms } from './Farms'
import { Forests } from './Forests'
import { Ghost } from './Ghost'
import { GoldFlash } from './GoldFlash'
import { GridLines } from './GridLines'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { PlacementDust } from './PlacementDust'
import { PlacementHints } from './PlacementHints'
import { Roads } from './Roads'
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
      <Roads />
      {/* The houses, trees and farms load models; the rest of the scene doesn't wait for them. */}
      <Suspense fallback={null}>
        <Cities />
      </Suspense>
      <Suspense fallback={null}>
        <Forests />
      </Suspense>
      <Suspense fallback={null}>
        <Farms />
      </Suspense>
      <GoldFlash />
      <Ghost />
      <PlacementDust />
      <ScoreClouds />
    </>
  )
}
