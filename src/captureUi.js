import Swal from 'sweetalert2'
import { capturePiecesToPng } from './capture.js'

function createCameraButton() {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'capture-button'
  button.title = '퍼즐 캡처'
  button.setAttribute('aria-label', '퍼즐 캡처')
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M9 3h6l1.2 2H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.8L9 3zm3 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-2.2a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6z"/>
    </svg>
  `
  document.body.appendChild(button)
  return button
}

async function askCaptureScope() {
  const result = await Swal.fire({
    title: '저장할 도형 선택',
    html: `
      <div class="capture-scope">
        <label class="capture-scope__option">
          <input type="radio" name="capture-mode" value="all" checked />
          <span>도형 전부 (1~7)</span>
        </label>
        <label class="capture-scope__option">
          <input type="radio" name="capture-mode" value="partial" />
          <span>일부만 저장</span>
        </label>
        <div class="capture-scope__numbers" id="capture-numbers">
          ${[1, 2, 3, 4, 5, 6, 7]
            .map(
              (n) => `
            <label>
              <input type="checkbox" value="${n}" checked />
              <span>${n}</span>
            </label>
          `,
            )
            .join('')}
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '저장',
    cancelButtonText: '취소',
    focusConfirm: false,
    didOpen: () => {
      const numbers = document.getElementById('capture-numbers')
      const sync = () => {
        const mode = document.querySelector(
          'input[name="capture-mode"]:checked',
        )?.value
        numbers.style.opacity = mode === 'partial' ? '1' : '0.45'
        numbers.style.pointerEvents = mode === 'partial' ? 'auto' : 'none'
      }
      document
        .querySelectorAll('input[name="capture-mode"]')
        .forEach((input) => input.addEventListener('change', sync))
      sync()
    },
    preConfirm: () => {
      const mode = document.querySelector(
        'input[name="capture-mode"]:checked',
      )?.value
      if (mode === 'all') {
        return [1, 2, 3, 4, 5, 6, 7]
      }

      const selected = [
        ...document.querySelectorAll('#capture-numbers input:checked'),
      ].map((input) => Number(input.value))

      if (!selected.length) {
        Swal.showValidationMessage('저장할 번호를 하나 이상 선택하세요.')
        return false
      }
      return selected
    },
  })

  return result.isConfirmed ? result.value : null
}

/**
 * 우측 하단 카메라 버튼과 캡처 흐름을 연결합니다.
 */
export function setupCaptureUi(puzzleScene) {
  const button = createCameraButton()

  button.addEventListener('click', async () => {
    if (puzzleScene.capturingSet || puzzleScene.placingPuzzle) return

    await Swal.fire({
      title: '저장하고 싶은 퍼즐 세트를 클릭하세요',
      text: '세트에 속한 도형 중 하나를 클릭하면 됩니다.',
      icon: 'info',
      confirmButtonText: '확인',
      timer: 3000,
      timerProgressBar: true,
    })

    puzzleScene.beginCaptureSet()
  })

  puzzleScene.onCaptureSetSelected = async (setId) => {
    puzzleScene.cancelCaptureSet()

    const numbers = await askCaptureScope()
    if (!numbers) return

    const pieces = puzzleScene.getPiecesBySetId(setId, numbers)
    if (!pieces.length) {
      await Swal.fire({
        icon: 'warning',
        title: '저장할 도형이 없습니다',
        timer: 2000,
        showConfirmButton: true,
        confirmButtonText: '확인',
      })
      return
    }

    const ok = await capturePiecesToPng({
      renderer: puzzleScene.renderer,
      scene: puzzleScene.scene,
      pieces,
      filename: `sphinx-puzzle-set${setId}.png`,
    })

    if (ok) {
      await Swal.fire({
        icon: 'success',
        title: '이미지를 저장했습니다',
        timer: 1500,
        showConfirmButton: false,
      })
    } else {
      await Swal.fire({
        icon: 'error',
        title: '저장에 실패했습니다',
        confirmButtonText: '확인',
      })
    }
  }

  return button
}
