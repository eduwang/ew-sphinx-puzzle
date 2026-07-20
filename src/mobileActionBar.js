const MOBILE_QUERY = '(max-width: 768px)'

function createActionBar({ enableDelete }) {
  const bar = document.createElement('div')
  bar.className = 'mobile-action-bar'
  bar.setAttribute('role', 'toolbar')
  bar.setAttribute('aria-label', '도형 조작')
  bar.innerHTML = `
    <button type="button" class="mobile-action-bar__btn" data-action="rotate-ccw">
      <span class="mobile-action-bar__icon" aria-hidden="true">↺</span>
      <span>반시계</span>
    </button>
    <button type="button" class="mobile-action-bar__btn" data-action="rotate-cw">
      <span class="mobile-action-bar__icon" aria-hidden="true">↻</span>
      <span>시계</span>
    </button>
    <button type="button" class="mobile-action-bar__btn" data-action="flip">
      <span class="mobile-action-bar__icon" aria-hidden="true">⇄</span>
      <span>뒤집기</span>
    </button>
    ${
      enableDelete
        ? `<button type="button" class="mobile-action-bar__btn mobile-action-bar__btn--danger" data-action="delete">
            <span class="mobile-action-bar__icon" aria-hidden="true">×</span>
            <span>삭제</span>
          </button>`
        : ''
    }
  `
  document.body.appendChild(bar)
  return bar
}

/**
 * 모바일에서 도형 선택 시 하단 액션 바(반시계/시계/뒤집기[/삭제])를 표시합니다.
 */
export function setupMobileActionBar({
  enableDelete = false,
  onRotateClockwise,
  onRotateCounterClockwise,
  onFlip,
  onDelete,
}) {
  const bar = createActionBar({ enableDelete })
  const media = window.matchMedia(MOBILE_QUERY)
  let selected = false

  const syncVisibility = () => {
    const show = media.matches && selected
    bar.classList.toggle('is-visible', show)
    document.body.classList.toggle('mobile-action-bar-open', show)
  }

  const setSelected = (piece) => {
    selected = Boolean(piece)
    syncVisibility()
  }

  bar.addEventListener('pointerdown', (event) => {
    // 캔버스 드래그/선택 해제와 겹치지 않게 차단
    event.stopPropagation()
  })

  bar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]')
    if (!button) return

    const action = button.dataset.action
    if (action === 'rotate-cw') onRotateClockwise?.()
    if (action === 'rotate-ccw') onRotateCounterClockwise?.()
    if (action === 'flip') onFlip?.()
    if (action === 'delete') onDelete?.()
  })

  media.addEventListener('change', syncVisibility)
  syncVisibility()

  return {
    setSelected,
    dispose() {
      media.removeEventListener('change', syncVisibility)
      bar.remove()
      document.body.classList.remove('mobile-action-bar-open')
    },
  }
}
