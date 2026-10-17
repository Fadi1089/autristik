import { lazy, Suspense } from 'react'
import { GridStudy } from './exploration/GridStudy'

// Keep the earlier prototype explicit, without mounting game mechanics in the grid study.
const GameApp = lazy(() => import('./GameApp').then((module) => ({ default: module.GameApp })))

export function App() {
  return new URLSearchParams(window.location.search).get('view') === 'game' ? (
    <Suspense fallback={null}>
      <GameApp />
    </Suspense>
  ) : (
    <GridStudy />
  )
}
