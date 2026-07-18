/**
 * 모바일 브라우저 기본 제스처(핀치 줌, iOS gesture)가
 * 퍼즐 조작과 겹치지 않도록 차단합니다.
 */
export function setupMobileTouchGuards(canvas) {
  const preventMultiTouchZoom = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault()
    }
  }

  const preventGesture = (event) => {
    event.preventDefault()
  }

  document.addEventListener('touchmove', preventMultiTouchZoom, {
    passive: false,
  })
  document.addEventListener('gesturestart', preventGesture, { passive: false })
  document.addEventListener('gesturechange', preventGesture, { passive: false })
  document.addEventListener('gestureend', preventGesture, { passive: false })

  if (canvas) {
    canvas.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length > 1) {
          event.preventDefault()
        }
      },
      { passive: false },
    )
  }

  return () => {
    document.removeEventListener('touchmove', preventMultiTouchZoom)
    document.removeEventListener('gesturestart', preventGesture)
    document.removeEventListener('gesturechange', preventGesture)
    document.removeEventListener('gestureend', preventGesture)
  }
}
