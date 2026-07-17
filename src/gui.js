import GUI from 'lil-gui'
import Swal from 'sweetalert2'

const MOBILE_QUERY = '(max-width: 768px)'

function createMenuToggle() {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'menu-toggle'
  button.title = '메뉴'
  button.setAttribute('aria-label', '메뉴 열기/닫기')
  button.innerHTML = `
    <span class="menu-toggle__bars" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
  `
  document.body.appendChild(button)
  return button
}

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches
}

export function setupGui({
  onGridVisibilityChange,
  onNumbersVisibilityChange,
  onSnapChange,
  onCollisionChange,
  onReset,
  onAddPuzzle,
  initialGridVisible = true,
  initialNumbersVisible = true,
  initialSnapEnabled = true,
  initialCollisionEnabled = true,
}) {
  const settingsGui = new GUI({ title: '설정' })
  settingsGui.domElement.classList.add('settings-panel')

  const settings = {
    showGrid: initialGridVisible,
    showNumbers: initialNumbersVisible,
    snapToGrid: initialSnapEnabled,
    preventOverlap: initialCollisionEnabled,
  }

  settingsGui
    .add(settings, 'showGrid')
    .name('삼각형 격자')
    .onChange(onGridVisibilityChange)

  settingsGui
    .add(settings, 'showNumbers')
    .name('도형 번호')
    .onChange(onNumbersVisibilityChange)

  settingsGui
    .add(settings, 'snapToGrid')
    .name('격자 스냅')
    .onChange(onSnapChange)

  settingsGui
    .add(settings, 'preventOverlap')
    .name('겹침 방지')
    .onChange(onCollisionChange)

  settingsGui.close()

  const controlsGui = new GUI({ title: '조작법' })
  controlsGui.domElement.classList.add('controls-panel')

  const controls = {
    move: '클릭 후 드래그',
    rotate: '클릭 후 R',
    flip: '클릭 후 F',
    pan: '빈 곳/중·우클릭 드래그',
    zoom: '마우스 휠',
  }

  controlsGui.add(controls, 'move').name('도형 이동').disable()
  controlsGui.add(controls, 'rotate').name('시계 방향 30° 회전').disable()
  controlsGui.add(controls, 'flip').name('뒤집기').disable()
  controlsGui.add(controls, 'pan').name('카메라 이동').disable()
  controlsGui.add(controls, 'zoom').name('카메라 확대/축소').disable()

  const credit = document.createElement('div')
  credit.className = 'controls-credit'
  credit.innerHTML =
    '만든이: <a href="https://hyowonwang.netlify.app/" target="_blank" rel="noopener noreferrer">Hyowon Wang</a>'
  controlsGui.$children.appendChild(credit)

  controlsGui.open()

  const actionsGui = new GUI({ title: '퍼즐' })
  actionsGui.domElement.classList.add('actions-panel')

  const actions = {
    reset() {
      onReset?.()
    },
    async addPuzzle() {
      await Swal.fire({
        title: '퍼즐이 생성될 위치를 클릭하세요',
        text: '격자 교점을 클릭하면 1~7번 도형 세트가 생성됩니다.',
        icon: 'info',
        confirmButtonText: '확인',
        timer: 3000,
        timerProgressBar: true,
      })
      onAddPuzzle?.()
    },
  }

  actionsGui.add(actions, 'reset').name('초기화')
  actionsGui.add(actions, 'addPuzzle').name('새 퍼즐 추가하기')

  const menuToggle = createMenuToggle()
  const media = window.matchMedia(MOBILE_QUERY)

  const setMenuOpen = (open) => {
    document.body.classList.toggle('mobile-menu-open', open)
    menuToggle.classList.toggle('is-open', open)
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  }

  const syncMobileLayout = () => {
    if (isMobile()) {
      document.body.classList.add('is-mobile')
      setMenuOpen(false)
      settingsGui.close()
      controlsGui.close()
      actionsGui.close()
    } else {
      document.body.classList.remove('is-mobile')
      setMenuOpen(false)
      controlsGui.open()
      settingsGui.close()
    }
  }

  menuToggle.addEventListener('click', () => {
    if (!isMobile()) return
    setMenuOpen(!document.body.classList.contains('mobile-menu-open'))
  })

  media.addEventListener('change', syncMobileLayout)
  syncMobileLayout()

  return {
    settingsGui,
    controlsGui,
    actionsGui,
    menuToggle,
  }
}
