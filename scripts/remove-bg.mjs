import sharp from 'sharp'
import { readdir } from 'fs/promises'
import path from 'path'

const INPUT_DIR = './public/startpage'
const TOLERANCE = 40

function colorDiff(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
}

async function removeBg(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const buf = Buffer.from(data)

  // Sample background color from the 4 corners
  function getPixel(x, y) {
    const idx = (y * width + x) * channels
    return [buf[idx], buf[idx + 1], buf[idx + 2]]
  }

  const corners = [
    getPixel(0, 0),
    getPixel(width - 1, 0),
    getPixel(0, height - 1),
    getPixel(width - 1, height - 1),
  ]
  // Average corner color as background reference
  const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4)
  const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4)
  const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4)

  const visited = new Uint8Array(width * height)
  const transparent = new Uint8Array(width * height)

  // BFS flood fill from all 4 edges
  const queue = []
  for (let x = 0; x < width; x++) {
    queue.push(x, 0)
    queue.push(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(0, y)
    queue.push(width - 1, y)
  }

  let qi = 0
  while (qi < queue.length) {
    const x = queue[qi++]
    const y = queue[qi++]
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    const idx = y * width + x
    if (visited[idx]) continue
    visited[idx] = 1

    const [r, g, b] = getPixel(x, y)
    if (colorDiff(r, g, b, bgR, bgG, bgB) <= TOLERANCE) {
      transparent[idx] = 1
      queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
    }
  }

  // Apply transparency
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (transparent[idx]) {
        buf[idx * channels + 3] = 0
      }
    }
  }

  await sharp(buf, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath)

  console.log(`✓ ${path.basename(inputPath)}`)
}

const files = (await readdir(INPUT_DIR)).filter(f => f.endsWith('.jpg'))
for (const file of files) {
  await removeBg(
    path.join(INPUT_DIR, file),
    path.join(INPUT_DIR, file.replace('.jpg', '.png'))
  )
}
console.log('Done!')
