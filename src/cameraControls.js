import * as THREE from 'three'

/**
 * 직교 카메라 평행이동(팬) / 확대축소(줌)
 * - 빈 곳 좌클릭 드래그, 또는 중클릭/우클릭 드래그: 평행이동
 * - 휠: 커서 기준 확대/축소
 */
export function setupCameraControls({
  camera,
  domElement,
  getIsPieceDragging = () => false,
  onViewChange = () => {},
  minZoom = 0.35,
  maxZoom = 4,
  zoomSpeed = 0.0015,
}) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const planeHit = new THREE.Vector3()

  let panning = false
  let lastClientX = 0
  let lastClientY = 0

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

  const panByPixels = (dx, dy) => {
    const rect = domElement.getBoundingClientRect()
    const worldPerPixelX =
      (camera.right - camera.left) / (camera.zoom * rect.width)
    const worldPerPixelY =
      (camera.top - camera.bottom) / (camera.zoom * rect.height)

    camera.position.x -= dx * worldPerPixelX
    camera.position.y += dy * worldPerPixelY
    onViewChange()
  }

  const startPan = (event) => {
    panning = true
    lastClientX = event.clientX
    lastClientY = event.clientY
    domElement.setPointerCapture(event.pointerId)
  }

  const onPointerDown = (event) => {
    if (getIsPieceDragging()) return

    // 중클릭 / 우클릭: 항상 팬
    if (event.button === 1 || event.button === 2) {
      event.preventDefault()
      startPan(event)
    }
  }

  const onPointerMove = (event) => {
    if (!panning) return

    const dx = event.clientX - lastClientX
    const dy = event.clientY - lastClientY
    lastClientX = event.clientX
    lastClientY = event.clientY
    panByPixels(dx, dy)
  }

  const endPan = (event) => {
    if (!panning) return
    panning = false
    if (domElement.hasPointerCapture(event.pointerId)) {
      domElement.releasePointerCapture(event.pointerId)
    }
  }

  const onWheel = (event) => {
    event.preventDefault()

    const before = getPlanePoint(event)
    const factor = Math.exp(-event.deltaY * zoomSpeed)
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, minZoom, maxZoom)
    camera.updateProjectionMatrix()

    if (before) {
      const after = getPlanePoint(event)
      if (after) {
        camera.position.x += before.x - after.x
        camera.position.y += before.y - after.y
      }
    }

    onViewChange()
  }

  const onContextMenu = (event) => {
    event.preventDefault()
  }

  domElement.addEventListener('pointerdown', onPointerDown)
  domElement.addEventListener('pointermove', onPointerMove)
  domElement.addEventListener('pointerup', endPan)
  domElement.addEventListener('pointercancel', endPan)
  domElement.addEventListener('wheel', onWheel, { passive: false })
  domElement.addEventListener('contextmenu', onContextMenu)

  return {
    startPanFromEmptySpace(event) {
      if (event.button !== 0) return
      startPan(event)
    },
    isPanning: () => panning,
    dispose() {
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerup', endPan)
      domElement.removeEventListener('pointercancel', endPan)
      domElement.removeEventListener('wheel', onWheel)
      domElement.removeEventListener('contextmenu', onContextMenu)
    },
  }
}
