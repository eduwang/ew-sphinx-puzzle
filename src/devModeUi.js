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

function createPanel() {
  const panel = document.createElement('aside')
  panel.className = 'dev-mode-panel'
  panel.innerHTML = `
    <header class="dev-mode-panel__header">
      <h2>개발자 도구</h2>
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
  `
  document.body.appendChild(panel)
  return panel
}

/**
 * 개발자 모드 배너 + JSON 다운로드 UI
 * (개별 삭제는 클릭 후 X 키)
 */
export function setupDevModeUi(puzzleScene) {
  document.body.classList.add('is-dev-mode')

  const banner = createBanner()
  const panel = createPanel()
  const downloadButton = panel.querySelector('.dev-mode-panel__download')
  const uploadButton = panel.querySelector('.dev-mode-panel__upload')
  const fileInput = panel.querySelector('.dev-mode-panel__file')

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

  return { banner, panel }
}
