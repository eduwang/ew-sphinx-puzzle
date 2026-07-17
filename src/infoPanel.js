const INFO_STORAGE_KEY = 'sphinx-puzzle-info-dismissed-v2'

function createInfoButton() {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'info-button'
  button.title = '퍼즐 설명'
  button.setAttribute('aria-label', '퍼즐 설명 열기')
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM10.7 10.5h2.6v7.2h-2.6v-7.2z"/>
    </svg>
  `
  document.body.appendChild(button)
  return button
}

function createInfoPanel() {
  const panel = document.createElement('aside')
  panel.className = 'info-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-labelledby', 'info-panel-title')
  panel.innerHTML = `
    <div class="info-panel__card">
      <header class="info-panel__header">
        <h2 id="info-panel-title">스핑크스 퍼즐이란?</h2>
        <button type="button" class="info-panel__close" aria-label="설명 닫기">×</button>
      </header>
      <div class="info-panel__body">
        <p>
          스핑크스 퍼즐은 <strong>7개의 도형</strong>을 이용해
          여러 가지 모양을 만들어 보는 수학 놀이입니다.
          초등 도형 학습에서 자주 다루는 소재예요.
        </p>
        <p>
          지금 화면에 보이는 1~7번 도형은 삼각형 격자 위에서
          맞물리도록 만들어진 한 세트입니다.
          합치면 큰 직사각형이 되지요.
        </p>
        <ul>
          <li><strong>이동</strong> — 도형을 드래그해서 옮기기</li>
          <li><strong>회전</strong> — 도형을 고른 뒤 <kbd>R</kbd> (시계 방향 30°)</li>
          <li><strong>뒤집기</strong> — 도형을 고른 뒤 <kbd>F</kbd></li>
          <li><strong>카메라</strong> — 휠로 확대/축소, 빈 곳 드래그로 이동</li>
        </ul>
        <p>
          설정에서 <strong>격자 스냅</strong>을 켜면 도형 기준점이
          삼각형 격자의 교점·중점에 붙고,
          <strong>도형 스냅</strong>을 켜면 다른 조각의
          꼭짓점·변 중점에 맞춰집니다.
          겹침 방지도 함께 쓸 수 있어요.
        </p>
        <p>
          새 퍼즐을 추가하거나, 카메라 버튼으로
          만든 모양을 이미지로 저장할 수도 있습니다.
        </p>
        <p class="info-panel__tip">
          도형을 자유롭게 돌려 보면서 탐구해 보세요!
        </p>
      </div>
    </div>
  `
  document.body.appendChild(panel)
  return panel
}

/**
 * 우측 하단 i 버튼 + 설명 패널 (i 쪽으로 접힘/펼침)
 */
export function setupInfoPanel() {
  const button = createInfoButton()
  const panel = createInfoPanel()
  const closeButton = panel.querySelector('.info-panel__close')

  let open = false
  let animating = false
  let animationTimer = null

  const finishAnimation = () => {
    if (animationTimer) {
      clearTimeout(animationTimer)
      animationTimer = null
    }
    animating = false
    if (!open) {
      panel.classList.remove('is-open', 'is-closing')
    }
  }

  const markInfoDismissed = () => {
    try {
      sessionStorage.setItem(INFO_STORAGE_KEY, '1')
    } catch {
      // storage unavailable
    }
  }

  const isInfoDismissed = () => {
    try {
      return sessionStorage.getItem(INFO_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  }

  const setOpen = (nextOpen, { force = false } = {}) => {
    if (!force && (animating || open === nextOpen)) return
    if (force && open === nextOpen) return

    if (animationTimer) {
      clearTimeout(animationTimer)
      animationTimer = null
    }

    open = nextOpen
    animating = true

    button.classList.toggle('is-active', open)
    button.setAttribute('aria-expanded', open ? 'true' : 'false')

    if (open) {
      panel.classList.remove('is-closing')
      panel.classList.add('is-open')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.classList.add('is-visible')
        })
      })
    } else {
      panel.classList.remove('is-visible')
      panel.classList.add('is-closing')
      markInfoDismissed()
    }

    animationTimer = setTimeout(finishAnimation, 420)
  }

  panel.addEventListener('transitionend', (event) => {
    if (event.target !== panel || event.propertyName !== 'transform') return
    finishAnimation()
  })

  button.addEventListener('click', () => {
    setOpen(!open)
  })

  closeButton.addEventListener('click', () => {
    setOpen(false)
  })

  // 이번 탭에서 아직 닫지 않았다면, 진입 직후 자동으로 연다
  if (!isInfoDismissed()) {
    setTimeout(() => setOpen(true, { force: true }), 200)
  }

  return { button, panel, open: () => setOpen(true), close: () => setOpen(false) }
}
