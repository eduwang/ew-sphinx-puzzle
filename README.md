# 스핑크스 퍼즐 (Sphinx Puzzle)

초등 도형 학습용 **스핑크스 퍼즐**을 Three.js로 구현한 웹 앱입니다.  
7개의 조각을 삼각형 격자 위에서 이동·회전·뒤집기하며 다양한 모양을 만들어 볼 수 있습니다.

## 주요 기능

- **7조각 퍼즐 세트** — 합치면 큰 직사각형이 되는 기본 배치
- **도형 조작** — 드래그로 이동, `R` 시계 방향 30° 회전, `F` 뒤집기
- **삼각형 격자** — 점선 격자, 교점·중점 스냅 (설정에서 on/off)
- **도형 스냅** — 다른 조각의 모든 꼭짓점·변 중점에 맞추기
- **겹침 방지** — 드래그 시 충돌 판정 (설정에서 on/off)
- **카메라** — 빈 공간 드래그로 이동, 휠로 확대/축소
- **퍼즐 세트** — 초기화, 새 세트 추가
- **캡처** — 선택한 세트의 도형을 PNG로 저장
- **설명 패널** — 첫 진입 시 안내, `i` 버튼으로 다시 열기
- **모바일** — 작은 화면에서 GUI를 햄버거 메뉴로 접기

## 기술 스택

| 구분 | 사용 |
|------|------|
| 빌드 | [Vite](https://vitejs.dev/) |
| 렌더링 | [Three.js](https://threejs.org/) |
| GUI | [lil-gui](https://lil-gui.georgealways.com/) |
| 다이얼로그 | [SweetAlert2](https://sweetalert2.github.io/) |
| 배포 | Netlify |

HTML / CSS / Vanilla JS를 분리했고, JS·CSS는 `src/`에 둡니다.

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 표시되는 로컬 주소로 접속합니다.

### 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |

## 조작법

| 조작 | 방법 |
|------|------|
| 이동 | 도형을 클릭한 뒤 드래그 |
| 회전 | 도형을 고른 뒤 `R` (시계 방향 30°) |
| 뒤집기 | 도형을 고른 뒤 `F` |
| 카메라 이동 | 빈 공간 / 가운데·오른쪽 클릭 드래그 |
| 확대·축소 | 마우스 휠 (커서 기준) |
| PNG 저장 | 우측 하단 카메라 버튼 → 세트 선택 → 저장할 도형 선택 |

설정 패널에서 격자, 숫자, 격자 스냅, 도형 스냅, 겹침 방지를
각각 켜고 끌 수 있습니다.

## 프로젝트 구조

```
├── index.html
├── package.json
└── src/
    ├── main.js            # 진입점
    ├── style.css          # 전역·UI 스타일
    ├── scene.js           # Three.js 씬·퍼즐 세트 관리
    ├── triangularGrid.js  # 삼각형 격자·스냅
    ├── trianglePiece.js   # 1~7번 도형 생성·회전·뒤집기
    ├── puzzleSet.js       # 퍼즐 세트 팩토리
    ├── interaction.js     # 클릭·드래그·키 입력
    ├── cameraControls.js  # 팬·줌
    ├── collision.js       # 도형 겹침 판정
    ├── pieceSnap.js       # 꼭짓점·변 중점 기반 도형 스냅
    ├── gui.js             # lil-gui (설정·조작법·퍼즐)
    ├── capture.js         # PNG 캡처
    ├── captureUi.js       # 카메라 버튼·저장 흐름
    └── infoPanel.js       # 설명 패널
```

## 배포 (Netlify)

`netlify.toml`에 빌드 설정이 들어 있습니다.

1. 저장소를 Netlify에 연결합니다.
2. 빌드 명령·배포 폴더는 자동으로 인식됩니다 (`npm run build` → `dist`).
3. 배포 후 사이트로 접속합니다.

## 만든이

[Hyowon Wang](https://hyowonwang.netlify.app/)
