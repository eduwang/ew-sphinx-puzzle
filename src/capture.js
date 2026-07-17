import * as THREE from 'three'
import { getPieceWorldPolygon } from './collision.js'

function computePiecesBounds(pieces) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const piece of pieces) {
    const polygon = getPieceWorldPolygon(piece)
    if (!polygon) continue
    for (const p of polygon) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }

  if (!Number.isFinite(minX)) return null
  return { minX, maxX, minY, maxY }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 선택한 도형들만 프레임에 맞춰 PNG로 저장합니다.
 */
export async function capturePiecesToPng({
  renderer,
  scene,
  pieces,
  backgroundColor = 0xf4f1ea,
  padding = 0.35,
  maxSize = 1600,
  filename = 'sphinx-puzzle.png',
}) {
  if (!pieces.length) return false

  const bounds = computePiecesBounds(pieces)
  if (!bounds) return false

  const width = Math.max(bounds.maxX - bounds.minX, 0.01) + padding * 2
  const height = Math.max(bounds.maxY - bounds.minY, 0.01) + padding * 2
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  const aspect = width / height
  let pixelW
  let pixelH
  if (aspect >= 1) {
    pixelW = maxSize
    pixelH = Math.max(1, Math.round(maxSize / aspect))
  } else {
    pixelH = maxSize
    pixelW = Math.max(1, Math.round(maxSize * aspect))
  }

  const visibility = []
  scene.traverse((obj) => {
    if (obj === scene) return
    visibility.push([obj, obj.visible])
  })

  scene.traverse((obj) => {
    if (obj === scene) return
    obj.visible = false
  })

  for (const piece of pieces) {
    piece.visible = true
    piece.traverse((child) => {
      child.visible = true
    })
  }

  const prevBackground = scene.background
  scene.background = new THREE.Color(backgroundColor)

  const captureCamera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0.1,
    100,
  )
  captureCamera.position.set(centerX, centerY, 10)
  captureCamera.lookAt(centerX, centerY, 0)
  captureCamera.updateProjectionMatrix()

  const renderTarget = new THREE.WebGLRenderTarget(pixelW, pixelH)

  const prevTarget = renderer.getRenderTarget()
  const prevClear = renderer.getClearColor(new THREE.Color())
  const prevAlpha = renderer.getClearAlpha()

  renderer.setRenderTarget(renderTarget)
  renderer.setClearColor(backgroundColor, 1)
  renderer.clear()
  renderer.render(scene, captureCamera)

  const buffer = new Uint8Array(pixelW * pixelH * 4)
  renderer.readRenderTargetPixels(renderTarget, 0, 0, pixelW, pixelH, buffer)

  renderer.setRenderTarget(prevTarget)
  renderer.setClearColor(prevClear, prevAlpha)

  const canvas = document.createElement('canvas')
  canvas.width = pixelW
  canvas.height = pixelH
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(pixelW, pixelH)

  // WebGL은 아래가 원점이라 Y축을 뒤집어 PNG로 저장
  for (let y = 0; y < pixelH; y += 1) {
    const srcRow = (pixelH - 1 - y) * pixelW * 4
    const dstRow = y * pixelW * 4
    imageData.data.set(buffer.subarray(srcRow, srcRow + pixelW * 4), dstRow)
  }
  ctx.putImageData(imageData, 0, 0)

  for (const [obj, visible] of visibility) {
    obj.visible = visible
  }
  scene.background = prevBackground

  renderTarget.dispose()

  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png')
  })

  if (!blob) return false
  downloadBlob(blob, filename)
  return true
}
