import Swal from 'sweetalert2'
import {
  downloadLayoutJson,
  readLayoutJsonFile,
} from './layoutExport.js'

function createBanner() {
  const banner = document.createElement('div')
  banner.className = 'dev-mode-banner'
  banner.textContent = '개발자 모드'
  document.body.appendChild(banner)
  return banner
}

function createToolsButton() {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dev-tools-button'
  button.title = '개발자 도구'
  button.setAttribute('aria-label', '개발자 도구 열기')
  button.setAttribute('aria-expanded', 'false')
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"
      />
    </svg>
  `
  document.body.appendChild(button)
  return button
}

function createPanel() {
  const panel = document.createElement('aside')
  panel.className = 'dev-mode-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-labelledby', 'dev-mode-title')
  panel.innerHTML = `
    <div class="dev-mode-panel__card">
      <header class="dev-mode-panel__header">
        <h2 id="dev-mode-title">개발자 도구</h2>
        <button type="button" class="dev-mode-panel__close" aria-label="개발자 도구 닫기">×</button>
      </header>
      <p class="dev-mode-panel__hint">
        도형을 선택한 뒤 <kbd>X</kbd>를 누르면 개별 삭제됩니다.
        배치 정보는 JSON으로 저장할 수 있습니다.
      </p>
      <button type="button" class="dev-mode-panel__download">
        배치 JSON 다운로드
      </button>
      <button type="button" class="dev-mode-panel__upload">
        배치 JSON 업로드
      </button>
      <input
        type="file"
        class="dev-mode-panel__file"
        accept="application/json,.json"
        hidden
      />
    </div>
  `
  document.body.appendChild(panel)
  return panel
}

/**
 * 개발자 모드: i 버튼 위 토글 버튼 + JSON 다운로드/업로드 패널
 * (개별 삭제는 클릭 후 X 키)
 */
export function setupDevModeUi(puzzleScene) {
  document.body.classList.add('is-dev-mode')

  const banner = createBanner()
  const button = createToolsButton()
  const panel = createPanel()
  const closeButton = panel.querySelector('.dev-mode-panel__close')
  const downloadButton = panel.querySelector('.dev-mode-panel__download')
  const uploadButton = panel.querySelector('.dev-mode-panel__upload')
  const fileInput = panel.querySelector('.dev-mode-panel__file')

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

  const setOpen = (nextOpen) => {
    if (animating || open === nextOpen) return

    if (animationTimer) {
      clearTimeout(animationTimer)
      animationTimer = null
    }

    open = nextOpen
    animating = true

    button.classList.toggle('is-active', open)
    button.setAttribute('aria-expanded', open ? 'true' : 'false')
    document.body.classList.toggle('dev-tools-open', open)

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

  downloadButton.addEventListener('click', () => {
    const layout = puzzleScene.exportLayout()
    downloadLayoutJson(layout)
  })

  uploadButton.addEventListener('click', () => {
    fileInput.value = ''
    fileInput.click()
  })

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return

    try {
      const layout = await readLayoutJsonFile(file)
      puzzleScene.importLayout(layout)
      await Swal.fire({
        title: '업로드 완료',
        text: '현재 화면을 비우고 JSON 배치를 불러왔습니다.',
        icon: 'success',
        confirmButtonText: '확인',
        timer: 1800,
        timerProgressBar: true,
      })
    } catch {
      await Swal.fire({
        title: '업로드 실패',
        text: '퍼즐 배치 JSON 파일인지 확인해 주세요.',
        icon: 'error',
        confirmButtonText: '확인',
      })
    }
  })

  return {
    banner,
    button,
    panel,
    open: () => setOpen(true),
    close: () => setOpen(false),
  }
}
