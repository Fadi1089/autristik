import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'

/** Procedural assets are shared by all gold tiles and need no external image files. */
const TEXTURE_SIZE = 32
const starPixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
const grainPixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

function randomAt(index: number): number {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

for (let y = 0; y < TEXTURE_SIZE; y++) {
  for (let x = 0; x < TEXTURE_SIZE; x++) {
    const index = (y * TEXTURE_SIZE + x) * 4
    const dx = Math.abs((x + 0.5) / TEXTURE_SIZE - 0.5) * 2
    const dy = Math.abs((y + 0.5) / TEXTURE_SIZE - 0.5) * 2
    const core = Math.max(0, 1 - Math.hypot(dx, dy) * 3)
    const cross = Math.max(0, 1 - Math.min(dx, dy) * 14) * Math.max(0, 1 - Math.max(dx, dy)) ** 2
    starPixels.set([255, 255, 255, Math.round(Math.max(core, cross) * 255)], index)
    const grain = Math.round(225 + randomAt(index) * 30)
    grainPixels.set([grain, grain, grain, 255], index)
  }
}

export const goldStarTexture = new DataTexture(starPixels, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat)
goldStarTexture.magFilter = LinearFilter
goldStarTexture.minFilter = LinearFilter
goldStarTexture.needsUpdate = true

export const goldGrainTexture = new DataTexture(grainPixels, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat)
goldGrainTexture.colorSpace = SRGBColorSpace
goldGrainTexture.needsUpdate = true

const GLINT_COUNT = 12
const positions = new Float32Array(GLINT_COUNT * 3)
const colors = new Float32Array(GLINT_COUNT * 3)
for (let i = 0; i < GLINT_COUNT; i++) {
  positions.set([(randomAt(i + 1) - 0.5) * 0.82, 0, (randomAt(i + 101) - 0.5) * 0.82], i * 3)
}
export const goldGlitterGeometry = new BufferGeometry()
goldGlitterGeometry.setAttribute('position', new BufferAttribute(positions, 3))
goldGlitterGeometry.setAttribute('color', new BufferAttribute(colors, 3))
goldGlitterGeometry.computeBoundingSphere()
let lastFrame = -1

/** Staggered surface glints. Shared buffers update at most once per animation frame. */
export function updateGoldGlitter(seconds: number): void {
  const frame = Math.floor(seconds * 30)
  if (frame === lastFrame) return
  lastFrame = frame
  for (let i = 0; i < GLINT_COUNT; i++) {
    const brightness = 0.08 + 0.92 * (0.5 + 0.5 * Math.sin(seconds * 2.4 + i * 2.399)) ** 8
    colors.fill(brightness, i * 3, i * 3 + 3)
  }
  goldGlitterGeometry.getAttribute('color').needsUpdate = true
}
