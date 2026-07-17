import * as THREE from 'three'

const SQRT3 = Math.sqrt(3)

/**
 * 월드 좌표를 가장 가까운 삼각형 격자 스냅점으로 맞춥니다.
 * - 격자 교점
 * - 교점을 잇는 세 방향 선분의 중점
 *   (30° 회전 격자에서 그중 한 방향은 화면 세로선)
 */
export function snapToTriangularGrid(
  point,
  triangleSize = 1,
  rotationZ = Math.PI / 6,
) {
  const cos = Math.cos(rotationZ)
  const sin = Math.sin(rotationZ)
  const x = point.x * cos + point.y * sin
  const y = -point.x * sin + point.y * cos
  const rowHeight = (triangleSize * SQRT3) / 2
  const centerRow = Math.round(y / rowHeight)

  let nearest = null
  let nearestDistance = Infinity

  const consider = (gridX, gridY) => {
    const distance = (gridX - x) ** 2 + (gridY - y) ** 2
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = { x: gridX, y: gridY }
    }
  }

  const pointAt = (column, row) => ({
    x: (column + row / 2) * triangleSize,
    y: row * rowHeight,
  })

  for (let row = centerRow - 2; row <= centerRow + 2; row += 1) {
    const centerColumn = Math.round(x / triangleSize - row / 2)

    for (
      let column = centerColumn - 2;
      column <= centerColumn + 2;
      column += 1
    ) {
      const current = pointAt(column, row)
      consider(current.x, current.y)

      // 세 방향 이웃과의 중점 (중복 없이 한쪽으로만)
      // 1) 가로: (col,row) → (col+1,row)
      const right = pointAt(column + 1, row)
      consider((current.x + right.x) / 2, (current.y + right.y) / 2)

      // 2) +60°(= 회전 후 화면 세로): (col,row) → (col,row+1)
      const upRight = pointAt(column, row + 1)
      consider((current.x + upRight.x) / 2, (current.y + upRight.y) / 2)

      // 3) -60°: (col,row) → (col-1,row+1)
      const upLeft = pointAt(column - 1, row + 1)
      consider((current.x + upLeft.x) / 2, (current.y + upLeft.y) / 2)
    }
  }

  return {
    x: nearest.x * cos - nearest.y * sin,
    y: nearest.x * sin + nearest.y * cos,
  }
}

/**
 * 정삼각형 격자(스핑크스 퍼즐용)를 LineSegments로 생성합니다.
 * 수평선 + ±60° 대각선 세 방향으로 타일링합니다.
 */
export function createTriangularGrid({
  width,
  height,
  triangleSize = 1,
  color = 0xb8b0a4,
  dashSize = 0.08,
  gapSize = 0.08,
  // 왼쪽(반시계) 30°
  rotationZ = Math.PI / 6,
}) {
  const triangleHeight = (triangleSize * SQRT3) / 2
  // 회전 후에도 화면을 덮도록 생성 범위를 대각선 기준으로 넉넉히 잡음
  const cover = Math.hypot(width, height) / 2 + triangleSize * 2
  const halfWidth = cover
  const halfHeight = cover

  const points = []

  const addSegment = (x1, y1, x2, y2) => {
    points.push(x1, y1, 0, x2, y2, 0)
  }

  // 1) 수평선
  const rowStart = Math.floor(-halfHeight / triangleHeight)
  const rowEnd = Math.ceil(halfHeight / triangleHeight)
  for (let row = rowStart; row <= rowEnd; row += 1) {
    const y = row * triangleHeight
    addSegment(-halfWidth, y, halfWidth, y)
  }

  // 2) +60° 대각선 (기울기 = √3)
  const diagCount = Math.ceil((halfWidth * 2 + halfHeight * 2) / triangleSize) + 2
  for (let i = -diagCount; i <= diagCount; i += 1) {
    const intercept = i * triangleSize
    const yAtLeft = SQRT3 * (-halfWidth - intercept)
    const yAtRight = SQRT3 * (halfWidth - intercept)
    addSegment(-halfWidth, yAtLeft, halfWidth, yAtRight)
  }

  // 3) -60° 대각선 (기울기 = -√3)
  for (let i = -diagCount; i <= diagCount; i += 1) {
    const intercept = i * triangleSize
    const yAtLeft = -SQRT3 * (-halfWidth - intercept)
    const yAtRight = -SQRT3 * (halfWidth - intercept)
    addSegment(-halfWidth, yAtLeft, halfWidth, yAtRight)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))

  const material = new THREE.LineDashedMaterial({
    color,
    dashSize,
    gapSize,
  })
  const grid = new THREE.LineSegments(geometry, material)
  grid.computeLineDistances()
  grid.rotation.z = rotationZ
  grid.name = 'triangular-grid'

  return grid
}
