import * as THREE from 'three'
import {
  flipPiece,
  getPiecePivotWorld,
  rotatePiece,
  setPieceSelected,
} from './trianglePiece.js'
import { snapToTriangularGrid } from './triangularGrid.js'
import { pieceOverlapsOthers } from './collision.js'
import { getPieceSnapOffset } from './pieceSnap.js'

/**
 * 퍼즐 조각 클릭/드래그/키보드 조작을 연결합니다.
 */
export function setupPieceInteraction({
  camera,
  domElement,
  getPieces,
  triangleSize = 1,
  gridRotationZ = Math.PI / 6,
  initialSnapEnabled = false,
  initialPieceSnapEnabled = true,
  initialCollisionEnabled = true,
  initialDeleteEnabled = false,
  onEmptyPointerDown = null,
  getIsCameraPanning = () => false,
  getIsPlacingPuzzle = () => false,
  getIsCapturingSet = () => false,
  onPlacePuzzleClick = null,
  onCaptureSetClick = null,
  onDeletePiece = null,
  onSelectionChange = null,
}) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const planeHit = new THREE.Vector3()
  const dragOffset = new THREE.Vector3()

  let selectedPiece = null
  let dragPiece = null
  let snapEnabled = initialSnapEnabled
  let pieceSnapEnabled = initialPieceSnapEnabled
  let collisionEnabled = initialCollisionEnabled
  let deleteEnabled = initialDeleteEnabled
  let lastValidX = 0
  let lastValidY = 0

  const getGridSnapOffset = (piece) => {
    const pivot = getPiecePivotWorld(piece)
    if (!pivot) return null

    const snapped = snapToTriangularGrid(
      pivot,
      triangleSize,
      gridRotationZ,
    )
    return {
      x: snapped.x - pivot.x,
      y: snapped.y - pivot.y,
    }
  }

  const applyOffset = (piece, offset) => {
    if (!offset) return
    piece.position.x += offset.x
    piece.position.y += offset.y
  }

  const snapPieceToGrid = (piece) => {
    applyOffset(piece, getGridSnapOffset(piece))
  }

  const applyDragSnap = (piece) => {
    const candidates = []

    if (snapEnabled) {
      const offset = getGridSnapOffset(piece)
      if (offset) candidates.push(offset)
    }

    if (pieceSnapEnabled) {
      const offset = getPieceSnapOffset(
        piece,
        getPieces(),
        triangleSize * 0.24,
      )
      if (offset) candidates.push(offset)
    }

    let nearest = null
    let nearestDistanceSquared = Infinity
    for (const offset of candidates) {
      const distanceSquared = offset.x ** 2 + offset.y ** 2
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared
        nearest = offset
      }
    }

    applyOffset(piece, nearest)
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
    onSelectionChange?.(piece)
  }

  const rotateSelected = () => {
    if (!selectedPiece) return false
    rotatePiece(selectedPiece)
    return true
  }

  const flipSelected = () => {
    if (!selectedPiece) return false
    flipPiece(selectedPiece)
    if (snapEnabled) {
      snapPieceToGrid(selectedPiece)
    }
    return true
  }

  const deleteSelected = () => {
    if (!deleteEnabled || !selectedPiece) return false
    const piece = selectedPiece
    selectPiece(null)
    dragPiece = null
    onDeletePiece?.(piece)
    return true
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

    const rawX = hit.x + dragOffset.x
    const rawY = hit.y + dragOffset.y
    dragPiece.position.x = rawX
    dragPiece.position.y = rawY

    if (snapEnabled || pieceSnapEnabled) {
      applyDragSnap(dragPiece)
    }

    if (
      collisionEnabled &&
      pieceOverlapsOthers(dragPiece, getPieces())
    ) {
      // 스냅 결과만 충돌한다면 스냅 전 드래그 위치는 허용합니다.
      dragPiece.position.x = rawX
      dragPiece.position.y = rawY

      if (pieceOverlapsOthers(dragPiece, getPieces())) {
        dragPiece.position.x = lastValidX
        dragPiece.position.y = lastValidY
        return
      }
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
      rotateSelected()
      event.preventDefault()
    } else if (key === 'f') {
      flipSelected()
      event.preventDefault()
    } else if (key === 'x') {
      if (deleteSelected()) {
        event.preventDefault()
      }
    }
  }

  domElement.addEventListener('pointerdown', onPointerDown)
  domElement.addEventListener('pointermove', onPointerMove)
  domElement.addEventListener('pointerup', onPointerUp)
  domElement.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('keydown', onKeyDown)

  return {
    isDraggingPiece: () => Boolean(dragPiece),
    getSelectedPiece: () => selectedPiece,
    rotateSelected,
    flipSelected,
    deleteSelected,
    clearSelection() {
      if (dragPiece) {
        dragPiece = null
      }
      selectPiece(null)
    },
    setSnapEnabled(enabled) {
      snapEnabled = enabled
      if (enabled) {
        for (const piece of getPieces()) {
          snapPieceToGrid(piece)
        }
      }
    },
    setPieceSnapEnabled(enabled) {
      pieceSnapEnabled = enabled
    },
    setCollisionEnabled(enabled) {
      collisionEnabled = enabled
    },
    setDeleteEnabled(enabled) {
      deleteEnabled = enabled
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
