import * as THREE from 'three'
import { createTriangularGrid, snapToTriangularGrid } from './triangularGrid.js'
import {
  setPieceNumbersVisible,
  syncLabelOrientation,
} from './trianglePiece.js'
import { createPuzzleSet } from './puzzleSet.js'
import { setupPieceInteraction } from './interaction.js'
import { setupCameraControls } from './cameraControls.js'
import { setupMobileActionBar } from './mobileActionBar.js'

const TRIANGLE_SIZE = 1
const BACKGROUND_COLOR = 0xf4f1ea
const GRID_ROTATION_Z = Math.PI / 6
const BASE_FRUSTUM_HEIGHT = 16

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          material.map?.dispose()
          material.dispose()
        })
      } else {
        child.material.map?.dispose()
        child.material.dispose()
      }
    }
  })
}

export class PuzzleScene {
  constructor({ enableDelete = false } = {}) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUND_COLOR)

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    this.camera.position.set(0, 1, 10)
    this.camera.lookAt(0, 1, 0)
    this.camera.zoom = 1.4

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    document.body.appendChild(this.renderer.domElement)

    this.grid = null
    this.pieces = []
    this.nextSetId = 1
    this.showNumbers = true
    this.placingPuzzle = false
    this.capturingSet = false
    this.onCaptureSetSelected = null
    this.baseFrustumHeight = BASE_FRUSTUM_HEIGHT
    this.baseFrustumWidth = BASE_FRUSTUM_HEIGHT
    this.view = { width: 0, height: 0 }
    this.gridRefreshTimer = null
    this.onPiecesChange = null

    this.addPuzzleSet({ x: 0, y: 1 })

    this.handleResize = this.handleResize.bind(this)
    window.addEventListener('resize', this.handleResize)

    this.cameraControls = setupCameraControls({
      camera: this.camera,
      domElement: this.renderer.domElement,
      getIsPieceDragging: () => this.interaction?.isDraggingPiece() ?? false,
      onViewChange: () => this.scheduleGridRefresh(),
    })

    this.interaction = setupPieceInteraction({
      camera: this.camera,
      domElement: this.renderer.domElement,
      getPieces: () => this.pieces,
      triangleSize: TRIANGLE_SIZE,
      gridRotationZ: GRID_ROTATION_Z,
      initialSnapEnabled: false,
      initialPieceSnapEnabled: true,
      initialCollisionEnabled: true,
      initialDeleteEnabled: enableDelete,
      getIsCameraPanning: () => this.cameraControls.isPanning(),
      getIsPlacingPuzzle: () => this.placingPuzzle,
      getIsCapturingSet: () => this.capturingSet,
      onPlacePuzzleClick: (point) => this.finishPlacePuzzle(point),
      onCaptureSetClick: (piece) => this.finishCaptureSet(piece),
      onDeletePiece: (piece) => this.removePieceObject(piece),
      onSelectionChange: (piece) => {
        this.mobileActionBar?.setSelected(piece)
      },
      onEmptyPointerDown: (event) => {
        this.cameraControls.startPanFromEmptySpace(event)
      },
    })

    this.mobileActionBar = setupMobileActionBar({
      enableDelete,
      onRotate: () => this.interaction.rotateSelected(),
      onFlip: () => this.interaction.flipSelected(),
      onDelete: () => this.interaction.deleteSelected(),
    })

    this.handleResize()
    this.animate()
  }

  addPuzzleSet(pivotWorld) {
    const setId = this.nextSetId
    this.nextSetId += 1

    const pieces = createPuzzleSet({
      size: TRIANGLE_SIZE,
      pivotWorld,
      gridRotationZ: GRID_ROTATION_Z,
      showNumber: this.showNumbers,
      setId,
    })

    for (const piece of pieces) {
      this.scene.add(piece)
      this.pieces.push(piece)
    }

    this.notifyPiecesChange()
    return pieces
  }

  getPiecesBySetId(setId, numbers = null) {
    return this.pieces.filter((piece) => {
      if (piece.userData.setId !== setId) return false
      if (!numbers) return true
      return numbers.includes(piece.userData.pieceNumber)
    })
  }

  getSetIds() {
    const ids = new Set()
    for (const piece of this.pieces) {
      if (piece.userData.setId != null) ids.add(piece.userData.setId)
    }
    return [...ids].sort((a, b) => a - b)
  }

  notifyPiecesChange() {
    this.onPiecesChange?.()
  }

  removePiece(setId, pieceNumber) {
    const index = this.pieces.findIndex(
      (piece) =>
        piece.userData.setId === setId &&
        piece.userData.pieceNumber === pieceNumber,
    )
    if (index < 0) return false

    const [piece] = this.pieces.splice(index, 1)
    this.interaction?.clearSelection()
    this.scene.remove(piece)
    disposeObject(piece)
    this.notifyPiecesChange()
    return true
  }

  removePieceObject(piece) {
    if (!piece) return false
    const index = this.pieces.indexOf(piece)
    if (index < 0) return false

    this.pieces.splice(index, 1)
    this.interaction?.clearSelection()
    this.scene.remove(piece)
    disposeObject(piece)
    this.notifyPiecesChange()
    return true
  }

  exportLayout() {
    const pieces = this.pieces
      .map((piece) => ({
        setId: piece.userData.setId,
        pieceNumber: piece.userData.pieceNumber,
        position: {
          x: piece.position.x,
          y: piece.position.y,
          z: piece.position.z,
        },
        rotationZ: piece.rotation.z,
        scaleX: piece.scale.x,
        flipped: piece.scale.x < 0,
      }))
      .sort((a, b) => {
        if (a.setId !== b.setId) return a.setId - b.setId
        return a.pieceNumber - b.pieceNumber
      })

    return {
      version: 1,
      format: 'ew-sphinx-puzzle-layout',
      exportedAt: new Date().toISOString(),
      triangleSize: TRIANGLE_SIZE,
      gridRotationZ: GRID_ROTATION_Z,
      camera: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        zoom: this.camera.zoom,
      },
      pieces,
    }
  }

  importLayout(layout) {
    if (!layout || !Array.isArray(layout.pieces)) {
      throw new Error('올바른 퍼즐 배치 JSON이 아닙니다.')
    }

    this.clearPieces()

    const entriesBySet = new Map()
    for (const entry of layout.pieces) {
      const setId = Number(entry.setId)
      const pieceNumber = Number(entry.pieceNumber)

      if (!Number.isFinite(setId) || !Number.isFinite(pieceNumber)) continue
      if (!entriesBySet.has(setId)) {
        entriesBySet.set(setId, [])
      }
      entriesBySet.get(setId).push(entry)
    }

    let maxSetId = 0
    for (const [setId, entries] of entriesBySet) {
      maxSetId = Math.max(maxSetId, setId)

      const entriesByPieceNumber = new Map(
        entries.map((entry) => [Number(entry.pieceNumber), entry]),
      )
      const pieces = createPuzzleSet({
        size: TRIANGLE_SIZE,
        pivotWorld: { x: 0, y: 1 },
        gridRotationZ: GRID_ROTATION_Z,
        showNumber: this.showNumbers,
        setId,
      })

      for (const piece of pieces) {
        const entry = entriesByPieceNumber.get(piece.userData.pieceNumber)
        if (!entry) {
          disposeObject(piece)
          continue
        }

        const position = entry.position ?? {}
        piece.position.set(
          Number(position.x) || 0,
          Number(position.y) || 0,
          Number(position.z) || piece.position.z,
        )
        piece.rotation.z = Number(entry.rotationZ) || 0
        piece.scale.x =
          Number(entry.scaleX) || (entry.flipped ? -1 : piece.scale.x)
        syncLabelOrientation(piece)

        this.scene.add(piece)
        this.pieces.push(piece)
      }
    }

    this.nextSetId = Math.max(maxSetId + 1, 1)

    if (layout.camera) {
      this.camera.position.x = Number(layout.camera.x) || 0
      this.camera.position.y = Number(layout.camera.y) || 1
      this.camera.zoom = Number(layout.camera.zoom) || 1.4
      this.camera.updateProjectionMatrix()
      this.refreshVisibleGrid()
    }

    this.interaction?.clearSelection()
    this.notifyPiecesChange()
  }

  clearPieces() {
    for (const piece of this.pieces) {
      this.scene.remove(piece)
      disposeObject(piece)
    }
    this.pieces = []
    this.interaction?.clearSelection()
    this.notifyPiecesChange()
  }

  reset() {
    window.location.reload()
  }

  beginPlacePuzzle() {
    this.cancelCaptureSet()
    this.placingPuzzle = true
    document.body.classList.add('placing-puzzle')
  }

  cancelPlacePuzzle() {
    this.placingPuzzle = false
    document.body.classList.remove('placing-puzzle')
  }

  finishPlacePuzzle(point) {
    if (!this.placingPuzzle) return

    const snapped = snapToTriangularGrid(
      point,
      TRIANGLE_SIZE,
      GRID_ROTATION_Z,
    )

    this.addPuzzleSet(snapped)
    this.cancelPlacePuzzle()
  }

  beginCaptureSet() {
    this.cancelPlacePuzzle()
    this.capturingSet = true
    document.body.classList.add('capturing-set')
  }

  cancelCaptureSet() {
    this.capturingSet = false
    document.body.classList.remove('capturing-set')
  }

  finishCaptureSet(piece) {
    if (!this.capturingSet) return
    const setId = piece?.userData?.setId
    if (setId == null) return
    this.onCaptureSetSelected?.(setId)
  }

  handleResize() {
    const width = window.innerWidth
    const height = window.innerHeight

    this.view.width = width
    this.view.height = height

    const aspect = width / height
    this.baseFrustumHeight = BASE_FRUSTUM_HEIGHT
    this.baseFrustumWidth = this.baseFrustumHeight * aspect

    this.camera.left = -this.baseFrustumWidth / 2
    this.camera.right = this.baseFrustumWidth / 2
    this.camera.top = this.baseFrustumHeight / 2
    this.camera.bottom = -this.baseFrustumHeight / 2
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
    this.refreshVisibleGrid()
  }

  scheduleGridRefresh() {
    if (this.gridRefreshTimer) return
    this.gridRefreshTimer = window.setTimeout(() => {
      this.gridRefreshTimer = null
      this.refreshVisibleGrid()
    }, 80)
  }

  refreshVisibleGrid() {
    const visibleWidth = this.baseFrustumWidth / this.camera.zoom
    const visibleHeight = this.baseFrustumHeight / this.camera.zoom
    const panReach =
      Math.hypot(this.camera.position.x, this.camera.position.y) * 2 + 8

    this.rebuildGrid(visibleWidth + panReach, visibleHeight + panReach)
  }

  rebuildGrid(worldWidth, worldHeight) {
    const wasVisible = this.grid?.visible ?? true

    if (this.grid) {
      this.scene.remove(this.grid)
      this.grid.geometry.dispose()
      this.grid.material.dispose()
    }

    this.grid = createTriangularGrid({
      width: worldWidth,
      height: worldHeight,
      triangleSize: TRIANGLE_SIZE,
    })
    this.grid.visible = wasVisible

    this.scene.add(this.grid)
  }

  setGridVisible(visible) {
    if (this.grid) {
      this.grid.visible = visible
    }
  }

  setNumbersVisible(visible) {
    this.showNumbers = visible
    setPieceNumbersVisible(this.pieces, visible)
  }

  setSnapEnabled(enabled) {
    this.interaction.setSnapEnabled(enabled)
  }

  setPieceSnapEnabled(enabled) {
    this.interaction.setPieceSnapEnabled(enabled)
  }

  setCollisionEnabled(enabled) {
    this.interaction.setCollisionEnabled(enabled)
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    this.renderer.render(this.scene, this.camera)
  }
}
