import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { useGameStore } from './store/gameStore'
import { GameOver } from './ui/GameOver'
import { HUD } from './ui/HUD'
import { Menu } from './ui/Menu'
import { useGameClock } from './ui/useGameClock'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'

export function App() {
  useKeyboardShortcuts()
  useGameClock()
  const menuOpen = useGameStore((s) => s.menuOpen)

  return (
    <main className="relative h-full w-full touch-none">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 6.5, 7], fov: 40, near: 0.1, far: 200 }}
      >
        <Scene />
      </Canvas>
      {!menuOpen && <HUD />}
      <GameOver />
      {menuOpen && <Menu />}
    </main>
  )
}
