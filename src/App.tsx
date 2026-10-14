import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { useGameStore } from './store/gameStore'
import { GameOver } from './ui/GameOver'
import { HUD } from './ui/HUD'
import { Menu } from './ui/Menu'
import { useGravity } from './ui/useGravity'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'
import { usePresentation } from './ui/usePresentation'

export function App() {
  useKeyboardShortcuts()
  useGravity()
  usePresentation()
  const menuOpen = useGameStore((s) => s.menuOpen)

  return (
    <main className="relative h-full w-full touch-none">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 16, 16], fov: 50, near: 0.1, far: 512 }}
      >
        <Scene />
      </Canvas>
      {!menuOpen && <HUD />}
      <GameOver />
      {menuOpen && <Menu />}
    </main>
  )
}
