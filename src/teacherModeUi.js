import Swal from 'sweetalert2'
import { readLayoutJsonFile } from './layoutExport.js'
import triangle13Preset from './preset/triangle_13.json'
import rectangle5Preset from './preset/rectangle_5.json'
import allPossible27Preset from './preset/all_possible_27.json'
import unitAreaImage from './assets/unit_area.png'
import { buildCandidates30Layout } from './preset/candidates30.js'

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
      <button type="button" class="teacher-mode-panel__preset teacher-mode-panel__preset--full" data-action="show-unit-area">
        볼록한 다각형 후보군 보기
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

function createUnitAreaViewer() {
  const viewer = document.createElement('div')
  viewer.className = 'unit-area-viewer'
  viewer.setAttribute('role', 'dialog')
  viewer.setAttribute('aria-modal', 'true')
  viewer.setAttribute('aria-labelledby', 'unit-area-viewer-title')
  viewer.innerHTML = `
    <div class="unit-area-viewer__backdrop" data-close="true"></div>
    <div class="unit-area-viewer__dialog">
      <header class="unit-area-viewer__header">
        <h2 id="unit-area-viewer-title">볼록한 다각형 후보군</h2>
        <button type="button" class="unit-area-viewer__close" aria-label="닫기" data-close="true">×</button>
      </header>
      <div class="unit-area-viewer__body">
        <img
          class="unit-area-viewer__image"
          src="${unitAreaImage}"
          alt="볼록한 다각형 후보군 도해"
        />
      </div>
    </div>
  `
  document.body.appendChild(viewer)
  return viewer
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
  const viewer = createUnitAreaViewer()
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

  const setViewerOpen = (nextOpen) => {
    viewer.classList.toggle('is-open', nextOpen)
    document.body.classList.toggle('unit-area-viewer-open', nextOpen)
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
    const actionButton = event.target.closest('[data-action]')
    if (actionButton?.dataset.action === 'show-unit-area') {
      setViewerOpen(true)
      return
    }
    if (actionButton?.dataset.action === 'show-candidates-30') {
      await loadLayout(
        puzzleScene,
        buildCandidates30Layout(),
        '볼록한 다각형 후보군 30개를 격자에 불러왔습니다.',
      )
      return
    }

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

  viewer.addEventListener('click', (event) => {
    if (event.target.closest('[data-close="true"]')) {
      setViewerOpen(false)
    }
  })

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && viewer.classList.contains('is-open')) {
      setViewerOpen(false)
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
