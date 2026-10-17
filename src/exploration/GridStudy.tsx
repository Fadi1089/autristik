import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import { useTranslation } from '../i18n/useTranslation'
import { useSettingsStore } from '../store/settingsStore'
import { MoveKeyCaps } from '../ui/KeyCaps'
import { ExplorationCamera } from './ExplorationCamera'
import { InfiniteGrid } from './InfiniteGrid'
import { GRID_CAMERA } from './gridMath'
import { useExplorationPresentation } from './useExplorationPresentation'

// A stable camera configuration avoids reapplying its starting position on HUD updates.
const cameraOptions = { position: GRID_CAMERA.position, fov: GRID_CAMERA.fov, near: 0.1, far: 512 }

/** First validation stage: continuous visible grid and camera exploration only. */
export function GridStudy() {
  useExplorationPresentation()
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const musicEnabled = useSettingsStore((s) => s.musicEnabled)
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled)
  const [resetToken, setResetToken] = useState(0)
  const [centre, setCentre] = useState({ x: 0, z: 0 })
  const onCentreChange = useCallback((x: number, z: number) => {
    setCentre((previous) => (previous.x === x && previous.z === z ? previous : { x, z }))
  }, [])

  return (
    <main className="relative h-full w-full touch-none" aria-label={t('Grid exploration')}>
      <Canvas
        dpr={[1, 2]}
        camera={cameraOptions}
        fallback={<p className="p-8">{t('Enable WebGL to explore the grid.')}</p>}
      >
        <InfiniteGrid />
        <ExplorationCamera resetToken={resetToken} onCentreChange={onCentreChange} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="card px-5 py-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Autristik</h1>
            <p className="mt-1 text-xs text-ink/60">{t('Grid and camera')}</p>
          </div>
          <div className="card flex flex-wrap items-center gap-1 p-2">
            <button
              type="button"
              onClick={() => setResetToken((token) => token + 1)}
              title={t('Return to the origin (C / !)')}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-ink/75 transition hover:bg-ink/6"
            >
              {t('Recenter')}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-ink/75 transition hover:bg-ink/6"
            >
              {theme === 'light' ? t('Dark theme') : t('Light theme')}
            </button>
            <button
              type="button"
              onClick={() => setMusicEnabled(!musicEnabled)}
              aria-pressed={musicEnabled}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-ink/75 transition hover:bg-ink/6"
            >
              {musicEnabled ? t('Mute music') : t('Unmute music')}
            </button>
          </div>
        </header>
        <footer className="flex flex-wrap items-end justify-between gap-3">
          <div className="card max-w-md px-4 py-3 text-xs leading-relaxed text-ink/65">
            <p>{t('Drag to pan · Scroll to zoom · Right-drag to turn')}</p>
            <p className="mt-1">{t('Touch: drag to pan, use two fingers to zoom or turn.')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <MoveKeyCaps slot={0} />
              <span>{t('or')}</span>
              <MoveKeyCaps slot={1} />
              <span className="ml-1">{t('to move the camera')}</span>
            </div>
          </div>
          <output
            className="card px-4 py-2.5 text-xs text-ink/60 tabular-nums"
            aria-label={t('Camera centre')}
          >
            {t('Centre: {x}, {z}', { x: centre.x, z: centre.z })}
          </output>
        </footer>
      </div>
    </main>
  )
}
