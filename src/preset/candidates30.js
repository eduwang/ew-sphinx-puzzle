import {
  createIsoscelesPiece,
  createTrianglePiece,
  syncLabelOrientation,
} from '../trianglePiece.js'

const SQRT3 = Math.sqrt(3)
const H = SQRT3 / 2
const GRID_ROTATION_Z = Math.PI / 6

function toWorld(x, y) {
  const c = Math.cos(GRID_ROTATION_Z)
  const s = Math.sin(GRID_ROTATION_Z)
  return { x: x * c - y * s, y: x * s + y * c }
}

function toWorldAngle(angle) {
  return angle + GRID_ROTATION_Z
}

function entry(setId, pieceNumber, x, y, rotationZ, flipped = false) {
  const world = toWorld(x, y)
  return {
    setId,
    pieceNumber,
    position: { x: world.x, y: world.y, z: 0.06 },
    rotationZ: toWorldAngle(rotationZ),
    scaleX: flipped ? -1 : 1,
    flipped,
  }
}

function up2(setId, col, row) {
  return entry(setId, 2, col + 0.5, row * H + H / 3, 0)
}

function down2(setId, col, row) {
  return entry(setId, 2, col + 0.5, row * H + (2 * H) / 3, Math.PI)
}

/** tipDir: 'right' | 'left' — 수직 base(길이 √3) */
function vertical1(setId, baseX, cy, tipDir) {
  if (tipDir === 'right') {
    return entry(setId, 1, baseX + 1 / 6, cy, -Math.PI / 2)
  }
  return entry(setId, 1, baseX - 1 / 6, cy, Math.PI / 2)
}

function offsetAll(pieces, dx, dy) {
  return pieces.map((p) => {
    const invC = Math.cos(-GRID_ROTATION_Z)
    const invS = Math.sin(-GRID_ROTATION_Z)
    const lx = p.position.x * invC - p.position.y * invS
    const ly = p.position.x * invS + p.position.y * invC
    return entry(
      p.setId,
      p.pieceNumber,
      lx + dx,
      ly + dy,
      p.rotationZ - GRID_ROTATION_Z,
      p.flipped,
    )
  })
}

/** (1) 한 줄 평행사변형 — △▽ 교차 8쌍(2번×16), 높이 1칸·밑변 8 */
function shape1(setId) {
  const pieces = []
  for (let i = 0; i < 8; i += 1) {
    // 아래 변에 붙는 △, 그 오른쪽 위에 맞닿는 ▽
    pieces.push(up2(setId, i, 0))
    pieces.push(down2(setId, i + 0.5, 0))
  }
  return pieces
}

/** (2) 4×2 평행사변형 — 마름모 4×2 = 2번×16 */
function shape2(setId) {
  const pieces = []
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 4; i += 1) {
      const col = i + row * 0.5
      pieces.push(up2(setId, col, row))
      pieces.push(down2(setId, col + 0.5, row))
    }
  }
  return pieces
}

/** (3) 등변사다리꼴 — 아랫변 6, 윗변 2, 높이 2 = 2번×16 */
function shape3(setId) {
  const pieces = []
  // 아래 띠 (길이 6)
  for (let i = 0; i < 6; i += 1) {
    pieces.push(up2(setId, i, 0))
    pieces.push(down2(setId, i + 0.5, 0))
  }
  // 위 띠 (길이 2, 중앙)
  for (let i = 2; i < 4; i += 1) {
    pieces.push(up2(setId, i, 1))
    pieces.push(down2(setId, i + 0.5, 1))
  }
  return pieces
}

/** (4) 육각형 — 상·하변 2, 가운데 가장 넓게 4 = 2번×16 */
function shape4(setId) {
  const pieces = []
  // 아래 (길이 2)
  for (let i = 1; i < 3; i += 1) {
    pieces.push(up2(setId, i, 0))
    pieces.push(down2(setId, i + 0.5, 0))
  }
  // 가운데 (길이 4)
  for (let i = 0; i < 4; i += 1) {
    pieces.push(up2(setId, i, 1))
    pieces.push(down2(setId, i + 0.5, 1))
  }
  // 위 (길이 2)
  for (let i = 1; i < 3; i += 1) {
    pieces.push(up2(setId, i, 2))
    pieces.push(down2(setId, i + 0.5, 2))
  }
  return pieces
}

/** (5) 큰 정삼각형 변 4 — 2번×16 */
function shape5(setId) {
  const pieces = []
  const n = 4
  // row 0 = 밑변, row n-1 = 꼭짓점
  for (let row = 0; row < n; row += 1) {
    const ups = n - row
    const baseCol = row * 0.5
    for (let i = 0; i < ups; i += 1) {
      pieces.push(up2(setId, baseCol + i, row))
    }
    for (let i = 0; i < ups - 1; i += 1) {
      pieces.push(down2(setId, baseCol + 0.5 + i, row))
    }
  }
  return pieces
}

/**
 * 수직 양끝 1번 + 내부 2번 14개 (직사각형 계열 공통 뼈대)
 * shear: 위행 밀림, notch: 위쪽 모서리 변형 인덱스
 */
function verticalEndsFamily(setId, { shear = 0, notch = 0 } = {}) {
  const pieces = []
  const rightX = 4 + shear
  pieces.push(vertical1(setId, 0, H, 'right'))
  pieces.push(vertical1(setId, rightX, H, 'left'))

  // 기본 14개 채우기
  const twos = []
  for (let i = 0; i < 4; i += 1) {
    twos.push(down2(setId, i, 0))
    twos.push(up2(setId, i + shear * 0.5, 1))
  }
  for (let i = 0; i < 3; i += 1) {
    let topCol = i + 0.5
    if (notch === 1 && i === 0) topCol += 0.5
    if (notch === 2 && i === 2) topCol -= 0.5
    if (notch === 3 && i === 1) topCol += shear * 0.5
    twos.push(up2(setId, topCol, 0))
    twos.push(down2(setId, i + 0.5 + shear * 0.5, 1))
  }
  pieces.push(...twos.slice(0, 14))
  return pieces
}

/** (17)~(29): 1번 4 + 2번 12 */
function fourOnesFamily(setId, variant) {
  const pieces = []
  const w = 3.5 + (variant % 4) * 0.5
  const mid = H
  // 좌우에 짧은 수직 1번 2개씩
  pieces.push(vertical1(setId, 0, mid * 0.55, 'right'))
  pieces.push(vertical1(setId, 0, mid * 1.45, 'right'))
  pieces.push(vertical1(setId, w, mid * 0.55, 'left'))
  pieces.push(vertical1(setId, w, mid * 1.45, 'left'))

  const twos = []
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 3; i += 1) {
      const col = i + 0.35 + (variant % 3) * 0.1 + row * ((variant % 2) * 0.25)
      twos.push(up2(setId, col, row), down2(setId, col, row))
    }
  }
  pieces.push(...twos.slice(0, 12))
  return pieces
}

/** (30): 1번 6 + 2번 10 */
function shape30(setId) {
  const pieces = []
  pieces.push(vertical1(setId, 0, H * 0.5, 'right'))
  pieces.push(vertical1(setId, 0, H * 1.5, 'right'))
  pieces.push(vertical1(setId, 0, H * 2.5, 'right'))
  pieces.push(vertical1(setId, 3.2, H * 0.7, 'left'))
  pieces.push(vertical1(setId, 3.8, H * 1.6, 'left'))
  pieces.push(vertical1(setId, 2.8, H * 2.4, 'left'))

  const twos = []
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < 3; i += 1) {
      twos.push(up2(setId, i + 0.4, row))
      twos.push(down2(setId, i + 0.4, row))
    }
  }
  pieces.push(...twos.slice(0, 10))
  return pieces
}

const ANCHORS = [
  [0, 0], [11, 0], [22, 0], [33, 0], [44, 0],
  [0, -9], [11, -9], [22, -9], [33, -9], [44, -9],
  [0, -18], [11, -18], [22, -18], [33, -18], [44, -18], [55, -18],
  [0, -27], [10, -27], [20, -27], [30, -27], [40, -27], [50, -27], [60, -27],
  [0, -36], [10, -36], [20, -36], [30, -36], [40, -36], [50, -36], [60, -36],
]

function buildShape(index) {
  const id = index + 1
  if (id === 1) return shape1(id)
  if (id === 2) return shape2(id)
  if (id === 3) return shape3(id)
  if (id === 4) return shape4(id)
  if (id === 5) return shape5(id)

  // (6)~(16): 1×2 + 2×14
  if (id >= 6 && id <= 16) {
    const v = id - 6
    const shear = (v % 4) * 0.5
    const notch = v % 4
    return verticalEndsFamily(id, { shear, notch })
  }

  // (17)~(29): 1×4 + 2×12
  if (id >= 17 && id <= 29) {
    return fourOnesFamily(id, id - 17)
  }

  return shape30(id)
}

function assertCounts(pieces, setId) {
  const ones = pieces.filter((p) => p.pieceNumber === 1).length
  const twos = pieces.filter((p) => p.pieceNumber === 2).length
  const total = ones + twos
  if (total !== 16) {
    console.warn(`[candidates30] set ${setId}: total ${total} (1:${ones}, 2:${twos})`)
  }
}

/**
 * 넓이 16 볼록 후보군 30개 레이아웃
 */
export function buildCandidates30Layout() {
  const pieces = []
  for (let i = 0; i < 30; i += 1) {
    const [ax, ay] = ANCHORS[i]
    const shapePieces = buildShape(i)
    assertCounts(shapePieces, i + 1)
    pieces.push(...offsetAll(shapePieces, ax, ay))
  }

  const focus = toWorld(30, -16)
  return {
    version: 1,
    format: 'ew-sphinx-puzzle-layout',
    exportedAt: new Date().toISOString(),
    triangleSize: 1,
    gridRotationZ: GRID_ROTATION_Z,
    pieceOnly: true,
    camera: { x: focus.x, y: focus.y, zoom: 0.2 },
    pieces,
  }
}

export function createPieceFromEntry(entry, { showNumber = true } = {}) {
  const pieceNumber = Number(entry.pieceNumber)
  const piece =
    pieceNumber === 1
      ? createIsoscelesPiece({
          showNumber,
          initialRotationZ: 0,
          position: { x: 0, y: 0 },
        })
      : createTrianglePiece({
          showNumber,
          initialRotationZ: 0,
          position: { x: 0, y: 0 },
        })

  piece.userData.setId = Number(entry.setId)
  piece.userData.pieceNumber = pieceNumber

  const position = entry.position ?? {}
  piece.position.set(
    Number(position.x) || 0,
    Number(position.y) || 0,
    Number(position.z) || piece.position.z,
  )
  piece.rotation.z = Number(entry.rotationZ) || 0
  piece.scale.x = Number(entry.scaleX) || (entry.flipped ? -1 : 1)
  syncLabelOrientation(piece)
  return piece
}
