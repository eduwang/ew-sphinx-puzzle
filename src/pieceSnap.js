import { getPieceWorldPolygon } from './collision.js'

function getSnapPoints(piece) {
  const vertices = getPieceWorldPolygon(piece)
  if (!vertices?.length) return []

  const points = [...vertices]

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index]
    const next = vertices[(index + 1) % vertices.length]
    points.push({
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2,
    })
  }

  return points
}

/**
 * 움직이는 조각의 모든 꼭짓점·변 중점을 다른 조각의 같은 점들에
 * 맞추기 위한 가장 짧은 이동량을 반환합니다.
 */
export function getPieceSnapOffset(
  piece,
  others,
  maxDistance = 0.24,
) {
  const sourcePoints = getSnapPoints(piece)
  if (!sourcePoints.length) return null

  const maxDistanceSquared = maxDistance ** 2
  let nearest = null
  let nearestDistanceSquared = maxDistanceSquared

  for (const other of others) {
    if (other === piece) continue

    const targetPoints = getSnapPoints(other)
    for (const source of sourcePoints) {
      for (const target of targetPoints) {
        const dx = target.x - source.x
        const dy = target.y - source.y
        const distanceSquared = dx ** 2 + dy ** 2

        if (distanceSquared < nearestDistanceSquared) {
          nearestDistanceSquared = distanceSquared
          nearest = { x: dx, y: dy }
        }
      }
    }
  }

  return nearest
}
