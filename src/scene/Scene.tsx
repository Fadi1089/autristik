import { Suspense } from 'react'
import { SCENE_COLORS } from '../palette'
import { isRevealing, useRevealStore } from '../store/revealStore'
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
import { PlayArea } from './PlayArea'
import { BonusHints, PlacementHints } from './PlacementHints'
import { Roads } from './Roads'
import { ScoreClouds } from './ScoreClouds'

export function Scene() {
  // The piece in hand and where it fits wait until a growing landscape has settled.
  const revealing = useRevealStore(isRevealing)
  return (
    <>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <fog attach="fog" args={[SCENE_COLORS.background, 24, 55]} />
      <Lights />
      <CameraRig />
      <Ground />
      <PlayArea />
      <GridLines />
      {!revealing && <PlacementHints />}
      <BonusHints />
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
      {!revealing && <Ghost />}
      <PlacementDust />
      <ScoreClouds />
    </>
  )
}
