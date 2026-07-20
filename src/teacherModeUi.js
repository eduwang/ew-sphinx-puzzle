import Swal from 'sweetalert2'
import { readLayoutJsonFile } from './layoutExport.js'
import triangle13Preset from './preset/triangle_13.json'
import rectangle5Preset from './preset/rectangle_5.json'
import allPossible27Preset from './preset/all_possible_27.json'

function createToolsButton() {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'teacher-tools-button'
  button.title = '교사 도구'
  button.setAttribute('aria-label', '교사 도구 열기')
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
  panel.className = 'teacher-mode-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-labelledby', 'teacher-mode-title')
  panel.innerHTML = `
    <div class="teacher-mode-panel__card">
      <header class="teacher-mode-panel__header">
        <h2 id="teacher-mode-title">교사 도구</h2>
        <button type="button" class="teacher-mode-panel__close" aria-label="교사 도구 닫기">×</button>
      </header>
      <p class="teacher-mode-panel__hint">
        예시 배치를 불러오거나, JSON 파일로 배치를 불러올 수 있습니다.
      </p>
      <div class="teacher-mode-panel__presets">
        <button type="button" class="teacher-mode-panel__preset" data-preset="triangle">
          삼각형
        </button>
        <button type="button" class="teacher-mode-panel__preset" data-preset="rectangle">
          직사각형
        </button>
      </div>
      <button type="button" class="teacher-mode-panel__preset teacher-mode-panel__preset--full" data-preset="convex">
        볼록한 다각형
      </button>
      <button type="button" class="teacher-mode-panel__upload">
        배치 JSON 업로드
      </button>
      <input
        type="file"
        class="teacher-mode-panel__file"
        accept="application/json,.json"
        hidden
      />
    </div>
  `
  document.body.appendChild(panel)
  return panel
}

async function loadLayout(puzzleScene, layout, successText) {
  try {
    puzzleScene.importLayout(layout)
    await Swal.fire({
      title: '불러오기 완료',
      text: successText,
      icon: 'success',
      confirmButtonText: '확인',
      timer: 1800,
      timerProgressBar: true,
    })
  } catch {
    await Swal.fire({
      title: '불러오기 실패',
      text: '퍼즐 배치 JSON인지 확인해 주세요.',
      icon: 'error',
      confirmButtonText: '확인',
    })
  }
}

/**
 * 교사 모드: i 버튼 위 토글 버튼 + 프리셋/JSON 업로드 패널
 */
export function setupTeacherModeUi(puzzleScene) {
  document.body.classList.add('is-teacher-mode')

  const button = createToolsButton()
  const panel = createPanel()
  const closeButton = panel.querySelector('.teacher-mode-panel__close')
  const uploadButton = panel.querySelector('.teacher-mode-panel__upload')
  const fileInput = panel.querySelector('.teacher-mode-panel__file')

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
    document.body.classList.toggle('teacher-tools-open', open)

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

  panel.addEventListener('click', async (event) => {
    const presetButton = event.target.closest('[data-preset]')
    if (!presetButton) return

    const preset = presetButton.dataset.preset
    if (preset === 'triangle') {
      await loadLayout(
        puzzleScene,
        triangle13Preset,
        '삼각형 예시 배치를 불러왔습니다.',
      )
    } else if (preset === 'rectangle') {
      await loadLayout(
        puzzleScene,
        rectangle5Preset,
        '직사각형 예시 배치를 불러왔습니다.',
      )
    } else if (preset === 'convex') {
      await loadLayout(
        puzzleScene,
        allPossible27Preset,
        '볼록한 다각형 예시 배치를 불러왔습니다.',
      )
    }
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
      await loadLayout(
        puzzleScene,
        layout,
        '현재 화면을 비우고 JSON 배치를 불러왔습니다.',
      )
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
    button,
    panel,
    open: () => setOpen(true),
    close: () => setOpen(false),
  }
}
