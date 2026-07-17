import {
  createIsoscelesPiece,
  createPiece7,
  createRectanglePiece,
  createRightTrianglePiece,
  createTrapezoidPiece,
  createTrianglePiece,
} from './trianglePiece.js'

const SQRT3 = Math.sqrt(3)

/** 기본 세트에서 2번 도형 회전 기준점 = 1~7 합친 직사각형의 중심 */
export const DEFAULT_SET_PIVOT = { x: 0, y: 1 }

/** 기본 세트에서 7번 도형 중심 */
const PIECE7_CENTER = {
  x: (-SQRT3 + 0 + SQRT3 / 2 + 0) / 4,
  y: (2 + 2 + 1.5 + 1) / 4,
}

/**
 * 1~7번 도형 세트를 생성합니다.
 * @param {{ x: number, y: number }} pivotWorld - 2번 도형의 회전 기준점(세트 중심)
 */
export function createPuzzleSet({
  size = 1,
  pivotWorld = DEFAULT_SET_PIVOT,
  gridRotationZ = Math.PI / 6,
  showNumber = true,
  setId = 0,
} = {}) {
  const offsetX = pivotWorld.x - DEFAULT_SET_PIVOT.x
  const offsetY = pivotWorld.y - DEFAULT_SET_PIVOT.y

  const at = (x, y) => ({ x: x + offsetX, y: y + offsetY })

  const pieces = [
    createTrianglePiece({
      size,
      pieceNumber: 2,
      showNumber,
      initialRotationZ: -Math.PI / 2,
      position: at(SQRT3 / 6, 1 / 2),
    }),
    createIsoscelesPiece({
      size,
      pieceNumber: 1,
      showNumber,
      initialRotationZ: gridRotationZ - Math.PI / 6,
      position: at(SQRT3 / 2, 1 / 6),
    }),
    createRectanglePiece({
      size,
      pieceNumber: 3,
      showNumber,
      initialRotationZ: 0,
      position: at(-SQRT3 / 2, 1 / 2),
    }),
    createTrapezoidPiece({
      size,
      pieceNumber: 4,
      showNumber,
      initialRotationZ: -(7 * Math.PI) / 6,
      position: at((5 * SQRT3) / 8, 7 / 8),
    }),
    createRightTrianglePiece({
      size,
      pieceNumber: 5,
      showNumber,
      initialRotationZ: 0,
      position: at((-2 * SQRT3) / 3, 4 / 3),
    }),
    createRightTrianglePiece({
      size,
      pieceNumber: 6,
      color: 0x5bb8ff,
      showNumber,
      initialRotationZ: Math.PI,
      position: at((2 * SQRT3) / 3, 5 / 3),
    }),
    createPiece7({
      size,
      pieceNumber: 7,
      showNumber,
      position: at(PIECE7_CENTER.x, PIECE7_CENTER.y),
    }),
  ]

  for (const piece of pieces) {
    piece.userData.setId = setId
  }

  return pieces
}
