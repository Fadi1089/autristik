import { Canvas } from '@react-three/fiber'
import { canvasEvents } from './scene/canvasEvents'
import { Scene } from './scene/Scene'
import { useGameStore } from './store/gameStore'
import { HUD } from './ui/HUD'
import { Menu } from './ui/Menu'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'
import { useKeyboardLayoutDetection } from './ui/useKeyboardLayoutDetection'

export function App() {
  useKeyboardLayoutDetection()
  useKeyboardShortcuts()
  const menuOpen = useGameStore((s) => s.menuOpen)

  return (
    <main className="relative h-full w-full touch-none">
      <Canvas
        events={canvasEvents}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 6.5, 7], fov: 40, near: 0.1, far: 200 }}
      >
        <Scene />
      </Canvas>
      {!menuOpen && <HUD />}
      {menuOpen && <Menu />}
    </main>
  )
}
