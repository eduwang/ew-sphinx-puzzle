import * as THREE from 'three'
import {
  flipPiece,
  getPiecePivotWorld,
  rotatePiece,
  setPieceSelected,
} from './trianglePiece.js'
import { snapToTriangularGrid } from './triangularGrid.js'
import { pieceOverlapsOthers } from './collision.js'

/**
 * 퍼즐 조각 클릭/드래그/키보드 조작을 연결합니다.
 */
export function setupPieceInteraction({
  camera,
  domElement,
  getPieces,
  triangleSize = 1,
  gridRotationZ = Math.PI / 6,
  initialSnapEnabled = true,
  initialCollisionEnabled = true,
  onEmptyPointerDown = null,
  getIsCameraPanning = () => false,
  getIsPlacingPuzzle = () => false,
  getIsCapturingSet = () => false,
  onPlacePuzzleClick = null,
  onCaptureSetClick = null,
}) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const planeHit = new THREE.Vector3()
  const dragOffset = new THREE.Vector3()

  let selectedPiece = null
  let dragPiece = null
  let snapEnabled = initialSnapEnabled
  let collisionEnabled = initialCollisionEnabled
  let lastValidX = 0
  let lastValidY = 0

  const snapPiece = (piece) => {
    const pivot = getPiecePivotWorld(piece)
    if (!pivot) return

    const snapped = snapToTriangularGrid(
      pivot,
      triangleSize,
      gridRotationZ,
    )
    piece.position.x += snapped.x - pivot.x
    piece.position.y += snapped.y - pivot.y
  }

  const setPointerFromEvent = (event) => {
    const rect = domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  const getPlanePoint = (event) => {
    setPointerFromEvent(event)
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(plane, planeHit)) return null
    return planeHit.clone()
  }

  const pickPiece = (event) => {
    setPointerFromEvent(event)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(getPieces(), false)
    return hits[0]?.object ?? null
  }

  const selectPiece = (piece) => {
    const pieces = getPieces()
    for (const p of pieces) {
      setPieceSelected(p, p === piece)
    }
    selectedPiece = piece
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    if (getIsCameraPanning()) return

    if (getIsPlacingPuzzle()) {
      const point = getPlanePoint(event)
      if (point) onPlacePuzzleClick?.(point)
      event.preventDefault()
      return
    }

    if (getIsCapturingSet()) {
      const piece = pickPiece(event)
      if (piece) onCaptureSetClick?.(piece)
      event.preventDefault()
      return
    }

    const piece = pickPiece(event)
    selectPiece(piece)

    if (!piece) {
      onEmptyPointerDown?.(event)
      return
    }

    const hit = getPlanePoint(event)
    dragPiece = piece
    lastValidX = piece.position.x
    lastValidY = piece.position.y
    dragOffset.copy(piece.position).sub(hit)
    domElement.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (
      !dragPiece ||
      getIsCameraPanning() ||
      getIsPlacingPuzzle() ||
      getIsCapturingSet()
    ) {
      return
    }

    const hit = getPlanePoint(event)
    if (!hit) return

    dragPiece.position.x = hit.x + dragOffset.x
    dragPiece.position.y = hit.y + dragOffset.y

    if (snapEnabled) {
      snapPiece(dragPiece)
    }

    if (
      collisionEnabled &&
      pieceOverlapsOthers(dragPiece, getPieces())
    ) {
      dragPiece.position.x = lastValidX
      dragPiece.position.y = lastValidY
      return
    }

    lastValidX = dragPiece.position.x
    lastValidY = dragPiece.position.y
  }

  const onPointerUp = (event) => {
    if (!dragPiece) return
    dragPiece = null
    if (domElement.hasPointerCapture(event.pointerId)) {
      domElement.releasePointerCapture(event.pointerId)
    }
  }

  const onKeyDown = (event) => {
    if (getIsPlacingPuzzle() || getIsCapturingSet()) return
    if (!selectedPiece || event.repeat) return

    const key = event.key.toLowerCase()
    if (key === 'r') {
      // 회전은 충돌 검사 없이 허용
      rotatePiece(selectedPiece)
      event.preventDefault()
    } else if (key === 'f') {
      // 뒤집기도 충돌 검사 없이 허용
      flipPiece(selectedPiece)
      if (snapEnabled) {
        snapPiece(selectedPiece)
      }
      event.preventDefault()
    }
  }

  domElement.addEventListener('pointerdown', onPointerDown)
  domElement.addEventListener('pointermove', onPointerMove)
  domElement.addEventListener('pointerup', onPointerUp)
  domElement.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('keydown', onKeyDown)

  return {
    isDraggingPiece: () => Boolean(dragPiece),
    setSnapEnabled(enabled) {
      snapEnabled = enabled
      if (enabled) {
        for (const piece of getPieces()) {
          snapPiece(piece)
        }
      }
    },
    setCollisionEnabled(enabled) {
      collisionEnabled = enabled
    },
    dispose() {
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerup', onPointerUp)
      domElement.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
    },
  }
}
