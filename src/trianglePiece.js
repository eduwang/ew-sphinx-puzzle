import * as THREE from 'three'

const SQRT3 = Math.sqrt(3)

function createNumberLabel(number, size) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#1f3b73'
  ctx.font = 'bold 84px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(number), canvas.width / 2, canvas.height / 2 + 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const labelSize = size * 0.45
  const geometry = new THREE.PlaneGeometry(labelSize, labelSize)
  const label = new THREE.Mesh(geometry, material)
  label.name = 'piece-label'
  label.raycast = () => {}

  return label
}

/**
 * 초기 생성 방향 기준 회전 피벗 선택:
 * 가장 왼쪽 점(x 최소), 왼쪽 끝이 세로 직선이면 그중 위쪽 점(y 최대)
 */
function computePivotLocal(vertices, initialRotationZ) {
  const cos = Math.cos(initialRotationZ)
  const sin = Math.sin(initialRotationZ)
  const EPS = 1e-6

  let pivot = null
  let best = null
  for (const v of vertices) {
    const x = v.x * cos - v.y * sin
    const y = v.x * sin + v.y * cos
    if (
      !best ||
      x < best.x - EPS ||
      (Math.abs(x - best.x) <= EPS && y > best.y)
    ) {
      best = { x, y }
      pivot = v.clone()
    }
  }
  return pivot
}

function finalizePiece(mesh, {
  thickness,
  opacity,
  pieceNumber,
  showNumber,
  initialRotationZ,
  position,
  labelSize,
  vertices,
}) {
  const label = createNumberLabel(pieceNumber, labelSize)
  label.position.set(0, 0, thickness / 2 + 0.02)
  label.visible = showNumber
  mesh.add(label)

  mesh.position.set(position.x, position.y, thickness / 2)
  mesh.rotation.z = initialRotationZ
  mesh.userData = {
    ...mesh.userData,
    baseOpacity: opacity,
    selectedOpacity: Math.min(opacity + 0.25, 0.9),
    label,
    pieceNumber,
    localVertices: vertices.map((v) => v.clone()),
    pivotLocal: computePivotLocal(vertices, initialRotationZ),
    isPuzzlePiece: true,
  }

  syncLabelOrientation(mesh)
  return mesh
}

/**
 * 2번 도형: 격자 한 칸 정삼각형
 */
export function createTrianglePiece({
  size = 1,
  thickness = 0.12,
  color = 0x4f8cff,
  opacity = 0.55,
  pieceNumber = 2,
  showNumber = true,
  initialRotationZ = 0,
  position = null,
} = {}) {
  const height = (size * SQRT3) / 2
  const cx = size / 2
  const cy = height / 3

  const tip = new THREE.Vector2(size / 2 - cx, height - cy)
  const baseLeft = new THREE.Vector2(0 - cx, 0 - cy)
  const baseRight = new THREE.Vector2(size - cx, 0 - cy)

  const shape = new THREE.Shape()
  shape.moveTo(baseLeft.x, baseLeft.y)
  shape.lineTo(baseRight.x, baseRight.y)
  shape.lineTo(tip.x, tip.y)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -thickness / 2)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `piece-${pieceNumber}`

  return finalizePiece(mesh, {
    thickness,
    opacity,
    pieceNumber,
    showNumber,
    initialRotationZ,
    position: position ?? { x: cx, y: cy },
    labelSize: size,
    vertices: [baseLeft, baseRight, tip],
  })
}

/**
 * 1번 도형: 정삼각형 2개를 맞붙여 만든 마름모를
 * 긴 대각선으로 반 가른 이등변 삼각형 (변 1, 1, √3 / 각 30°-120°-30°)
 */
export function createIsoscelesPiece({
  size = 1,
  thickness = 0.12,
  color = 0xff7a59,
  opacity = 0.55,
  pieceNumber = 1,
  showNumber = true,
  initialRotationZ = 0,
  position = { x: -2, y: 1 },
} = {}) {
  const leg = size
  const base = size * SQRT3
  const height = size / 2

  // 무게중심이 원점이 되도록 배치
  const cy = height / 3
  const baseLeft = new THREE.Vector2(-base / 2, -cy)
  const baseRight = new THREE.Vector2(base / 2, -cy)
  const tip = new THREE.Vector2(0, height - cy)

  const shape = new THREE.Shape()
  shape.moveTo(baseLeft.x, baseLeft.y)
  shape.lineTo(baseRight.x, baseRight.y)
  shape.lineTo(tip.x, tip.y)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -thickness / 2)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `piece-${pieceNumber}`

  return finalizePiece(mesh, {
    thickness,
    opacity,
    pieceNumber,
    showNumber,
    initialRotationZ,
    position,
    labelSize: leg,
    vertices: [baseLeft, baseRight, tip],
  })
}

/**
 * 3번 도형: 2번(정삼각형) 2개 + 1번(이등변) 2개를 대칭으로 맞붙여 만든 직사각형
 * 크기: 가로 √3, 세로 1
 */
export function createRectanglePiece({
  size = 1,
  thickness = 0.12,
  color = 0x3ecf8e,
  opacity = 0.55,
  pieceNumber = 3,
  showNumber = true,
  initialRotationZ = 0,
  position = { x: 0, y: 0 },
} = {}) {
  const width = size * SQRT3
  const height = size

  const corners = [
    new THREE.Vector2(-width / 2, -height / 2),
    new THREE.Vector2(width / 2, -height / 2),
    new THREE.Vector2(width / 2, height / 2),
    new THREE.Vector2(-width / 2, height / 2),
  ]

  const shape = new THREE.Shape()
  shape.moveTo(corners[0].x, corners[0].y)
  shape.lineTo(corners[1].x, corners[1].y)
  shape.lineTo(corners[2].x, corners[2].y)
  shape.lineTo(corners[3].x, corners[3].y)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -thickness / 2)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `piece-${pieceNumber}`

  return finalizePiece(mesh, {
    thickness,
    opacity,
    pieceNumber,
    showNumber,
    initialRotationZ,
    position,
    labelSize: size,
    vertices: corners,
  })
}

/**
 * 4번 도형: 2번(정삼각형) 3개를 붙여 만든 등변사다리꼴
 * 윗변(긴 변) 2, 아랫변(짧은 변) 1, 높이 √3/2
 */
export function createTrapezoidPiece({
  size = 1,
  thickness = 0.12,
  color = 0xb06cff,
  opacity = 0.55,
  pieceNumber = 4,
  showNumber = true,
  initialRotationZ = 0,
  position = { x: 1, y: -Math.sqrt(3) / 4 },
} = {}) {
  const longBase = size * 2
  const shortBase = size
  const height = (size * SQRT3) / 2
  const cx = longBase / 2
  const cy = -height / 2

  const topLeft = new THREE.Vector2(0 - cx, 0 - cy)
  const topRight = new THREE.Vector2(longBase - cx, 0 - cy)
  const bottomRight = new THREE.Vector2(longBase - shortBase / 2 - cx, -height - cy)
  const bottomLeft = new THREE.Vector2(shortBase / 2 - cx, -height - cy)

  const shape = new THREE.Shape()
  shape.moveTo(topLeft.x, topLeft.y)
  shape.lineTo(topRight.x, topRight.y)
  shape.lineTo(bottomRight.x, bottomRight.y)
  shape.lineTo(bottomLeft.x, bottomLeft.y)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -thickness / 2)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `piece-${pieceNumber}`

  return finalizePiece(mesh, {
    thickness,
    opacity,
    pieceNumber,
    showNumber,
    initialRotationZ,
    position,
    labelSize: size,
    vertices: [topLeft, topRight, bottomRight, bottomLeft],
  })
}

/**
 * 5번 도형: 1번+2번을 합친 모양 (변 1, √3, 2인 직각삼각형)
 * 기준 형태 꼭짓점: (0,0), (0,1), (√3,0)
 */
export function createRightTrianglePiece({
  size = 1,
  thickness = 0.12,
  color = 0xffc14d,
  opacity = 0.55,
  pieceNumber = 5,
  showNumber = true,
  initialRotationZ = 0,
  position = { x: 0, y: 0 },
} = {}) {
  const cx = (size * SQRT3) / 3
  const cy = size / 3

  const a = new THREE.Vector2(0 - cx, 0 - cy)
  const b = new THREE.Vector2(0 - cx, size - cy)
  const c = new THREE.Vector2(size * SQRT3 - cx, 0 - cy)

  const shape = new THREE.Shape()
  shape.moveTo(a.x, a.y)
  shape.lineTo(b.x, b.y)
  shape.lineTo(c.x, c.y)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -thickness / 2)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `piece-${pieceNumber}`

  return finalizePiece(mesh, {
    thickness,
    opacity,
    pieceNumber,
    showNumber,
    initialRotationZ,
    position,
    labelSize: size,
    vertices: [a, b, c],
  })
}

/**
 * 7번 도형: 2번×2 + 1번×1을 합친 형태
 * 큰 직사각형 [-√3,√3]×[0,2]의 나머지 영역을 채움
 * 월드 꼭짓점: (-√3,2), (0,2), (√3/2, 3/2), (0,1)
 */
export function createPiece7({
  size = 1,
  thickness = 0.12,
  color = 0xff6b9d,
  opacity = 0.55,
  pieceNumber = 7,
  showNumber = true,
  initialRotationZ = 0,
  position = null,
} = {}) {
  const vertices = [
    new THREE.Vector2(-size * SQRT3, size * 2),
    new THREE.Vector2(0, size * 2),
    new THREE.Vector2((size * SQRT3) / 2, (size * 3) / 2),
    new THREE.Vector2(0, size),
  ]

  const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
  const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length

  const local = vertices.map((v) => new THREE.Vector2(v.x - cx, v.y - cy))

  const shape = new THREE.Shape()
  shape.moveTo(local[0].x, local[0].y)
  for (let i = 1; i < local.length; i += 1) {
    shape.lineTo(local[i].x, local[i].y)
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -thickness / 2)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `piece-${pieceNumber}`

  return finalizePiece(mesh, {
    thickness,
    opacity,
    pieceNumber,
    showNumber,
    initialRotationZ,
    position: position ?? { x: cx, y: cy },
    labelSize: size,
    vertices: local,
  })
}

export function setPieceSelected(piece, selected) {
  if (!piece?.material) return
  piece.userData.selected = selected
  piece.material.opacity = selected
    ? piece.userData.selectedOpacity
    : piece.userData.baseOpacity
}

export function setPieceNumbersVisible(pieces, visible) {
  for (const piece of pieces) {
    if (piece.userData.label) {
      piece.userData.label.visible = visible
    }
  }
}

/** 숫자는 월드 기준으로 항상 똑바로, 뒤집혀 보이지 않게 보정 */
function syncLabelOrientation(piece) {
  const label = piece.userData.label
  if (!label) return

  const facing = Math.sign(piece.scale.x || 1)
  label.scale.x = facing
  // 뒤집힌 상태(scale.x < 0)에서는 회전 보정 부호가 반대여야 숫자가 그대로 유지됨
  label.rotation.z = facing < 0 ? piece.rotation.z : -piece.rotation.z
}

/** 조각의 회전 피벗(pivotLocal)의 현재 월드 좌표 */
export function getPiecePivotWorld(piece) {
  const pivot = piece.userData.pivotLocal
  if (!pivot) return null

  const cos = Math.cos(piece.rotation.z)
  const sin = Math.sin(piece.rotation.z)
  const lx = pivot.x * piece.scale.x
  const ly = pivot.y * piece.scale.y
  return {
    x: piece.position.x + lx * cos - ly * sin,
    y: piece.position.y + lx * sin + ly * cos,
  }
}

/**
 * 평면(XY)에서 30° 회전.
 * 기본은 시계방향, 뒤집힌 상태(scale.x < 0)에서는 화면 기준 반대 방향으로 돕니다.
 * 피벗(초기 생성 기준 가장 왼쪽 점)을 중심으로 돕니다.
 */
export function rotatePiece(piece) {
  const delta = -Math.PI / 6

  const pivotWorld = getPiecePivotWorld(piece)
  piece.rotation.z += delta

  if (pivotWorld) {
    const cos = Math.cos(delta)
    const sin = Math.sin(delta)
    const ox = piece.position.x - pivotWorld.x
    const oy = piece.position.y - pivotWorld.y
    piece.position.x = pivotWorld.x + ox * cos - oy * sin
    piece.position.y = pivotWorld.y + ox * sin + oy * cos
  }

  syncLabelOrientation(piece)
}

/**
 * 월드 기준으로 왼쪽 180° 뒤집기.
 * 조각 중심을 지나는 월드 세로축(Y)에 대해 좌우 반전합니다.
 */
export function flipPiece(piece) {
  piece.rotation.z = -piece.rotation.z
  piece.scale.x *= -1
  syncLabelOrientation(piece)
}
