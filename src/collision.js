/**
 * 볼록 다각형 충돌 검사 (SAT).
 * 변끼리만 맞닿는 경우는 허용하고, 면이 겹치면 true를 반환합니다.
 */

export function getPieceWorldPolygon(piece) {
  const verts = piece.userData.localVertices
  if (!verts?.length) return null

  const cos = Math.cos(piece.rotation.z)
  const sin = Math.sin(piece.rotation.z)
  const sx = piece.scale.x || 1
  const sy = piece.scale.y || 1

  return verts.map((v) => {
    const lx = v.x * sx
    const ly = v.y * sy
    return {
      x: piece.position.x + lx * cos - ly * sin,
      y: piece.position.y + lx * sin + ly * cos,
    }
  })
}

function projectPolygon(polygon, axisX, axisY) {
  let min = Infinity
  let max = -Infinity
  for (const p of polygon) {
    const proj = p.x * axisX + p.y * axisY
    if (proj < min) min = proj
    if (proj > max) max = proj
  }
  return { min, max }
}

function axesFromPolygon(polygon, axes) {
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len = Math.hypot(ex, ey)
    if (len < 1e-10) continue
    // 법선
    axes.push({ x: -ey / len, y: ex / len })
  }
}

function polygonsOverlap(polyA, polyB, eps = 1e-3) {
  const axes = []
  axesFromPolygon(polyA, axes)
  axesFromPolygon(polyB, axes)

  for (const axis of axes) {
    const a = projectPolygon(polyA, axis.x, axis.y)
    const b = projectPolygon(polyB, axis.x, axis.y)
    const overlap = Math.min(a.max, b.max) - Math.max(a.min, b.min)
    // 겹침이 아주 작으면(맞닿음) 충돌로 보지 않음
    if (overlap <= eps) return false
  }
  return true
}

function aabbOverlap(polyA, polyB, pad = 0) {
  let minAx = Infinity
  let maxAx = -Infinity
  let minAy = Infinity
  let maxAy = -Infinity
  for (const p of polyA) {
    if (p.x < minAx) minAx = p.x
    if (p.x > maxAx) maxAx = p.x
    if (p.y < minAy) minAy = p.y
    if (p.y > maxAy) maxAy = p.y
  }

  let minBx = Infinity
  let maxBx = -Infinity
  let minBy = Infinity
  let maxBy = -Infinity
  for (const p of polyB) {
    if (p.x < minBx) minBx = p.x
    if (p.x > maxBx) maxBx = p.x
    if (p.y < minBy) minBy = p.y
    if (p.y > maxBy) maxBy = p.y
  }

  return !(
    maxAx + pad < minBx - pad ||
    maxBx + pad < minAx - pad ||
    maxAy + pad < minBy - pad ||
    maxBy + pad < minAy - pad
  )
}

/**
 * piece가 others와 면적으로 겹치면 true.
 * 변만 맞닿는 경우는 false.
 */
export function pieceOverlapsOthers(piece, others, eps = 1e-3) {
  const polyA = getPieceWorldPolygon(piece)
  if (!polyA) return false

  for (const other of others) {
    if (other === piece) continue
    const polyB = getPieceWorldPolygon(other)
    if (!polyB) continue
    if (!aabbOverlap(polyA, polyB, eps)) continue
    if (polygonsOverlap(polyA, polyB, eps)) return true
  }
  return false
}
