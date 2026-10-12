import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace } from 'three'

/** Original procedural textures: mottled rock and a dark violet nebula, with no downloaded assets. */
function makeTexture(
  size: number,
  pixel: (x: number, y: number) => readonly number[],
): DataTexture {
  const bytes = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      bytes.set(
        pixel(x, y).map((value) => Math.min(255, Math.round(value))),
        (y * size + x) * 4,
      )
  const texture = new DataTexture(bytes, size, size, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.needsUpdate = true
  return texture
}

function noise(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return value - Math.floor(value)
}

export const bedrockTexture = makeTexture(16, (x, y) => {
  const grain = noise(x, y)
  const shade = Math.round(35 + grain * 110 + noise(Math.floor(x / 3), Math.floor(y / 3)) * 25)
  return [shade, shade, shade + 4, 255]
})

export const voidTexture = makeTexture(64, (x, y) => {
  const dx = (x - 32) / 32
  const dy = (y - 32) / 32
  const swirl =
    (0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 3 + Math.hypot(dx, dy) * 10 + noise(x, y))) ** 3
  const star = noise(x + 100, y + 100) > 0.996 ? 140 : 0
  return [28 + swirl * 90 + star, 9 + swirl * 18 + star, 48 + swirl * 120 + star, 255]
})
voidTexture.center.set(0.5, 0.5)
