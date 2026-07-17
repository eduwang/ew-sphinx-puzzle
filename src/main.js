import { PuzzleScene } from './scene.js'
import { setupGui } from './gui.js'
import { setupCaptureUi } from './captureUi.js'
import { setupInfoPanel } from './infoPanel.js'

const puzzleScene = new PuzzleScene()

setupGui({
  initialGridVisible: true,
  initialNumbersVisible: true,
  initialSnapEnabled: true,
  initialPieceSnapEnabled: true,
  initialCollisionEnabled: true,
  onGridVisibilityChange: (visible) => {
    puzzleScene.setGridVisible(visible)
  },
  onNumbersVisibilityChange: (visible) => {
    puzzleScene.setNumbersVisible(visible)
  },
  onSnapChange: (enabled) => {
    puzzleScene.setSnapEnabled(enabled)
  },
  onPieceSnapChange: (enabled) => {
    puzzleScene.setPieceSnapEnabled(enabled)
  },
  onCollisionChange: (enabled) => {
    puzzleScene.setCollisionEnabled(enabled)
  },
  onReset: () => {
    puzzleScene.reset()
  },
  onAddPuzzle: () => {
    puzzleScene.beginPlacePuzzle()
  },
})

setupCaptureUi(puzzleScene)
setupInfoPanel()
