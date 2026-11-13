# 교회개척 타이쿤

모바일 터치로 즐기는 교회개척 경영 시뮬레이션. 2.5D 아이소메트릭 지도에서 건물을 짓고, 방문자의 필요(말씀·교제·돌봄·편의)를 채워 성도를 늘립니다.

## 실행
- **가로 화면 전용**입니다. 세로로 들면 회전 안내 화면이 뜨고 게임이 멈추며, 가로로 돌리면 이어집니다. 지원하는 브라우저(안드로이드 크롬 전체화면 등)에서는 화면 방향을 가로로 잠급니다.
- `index.html`을 브라우저로 열거나, 저장소 폴더에서 `python3 -m http.server 8000` 후 접속

## 검증
- `node tests/smoke.js` — 스크립트 목록·전역 이름 중복 검사, 가로/세로 동작, 콘솔 오류, 난수 고정 시뮬레이션 결정성을 확인합니다.
- 검증 전용 도구로 Node.js와 Playwright가 필요합니다 (`npm i -g playwright && npx playwright install chromium`). 게임 자체에는 포함되지 않습니다.

## 지도와 규칙
- 맨 아래 도로 → 주차 구역(4줄, 주차장 전용) → 교회 부지. 울타리로 나뉘고, 주차 구역에서 부지로 들어오는 교회 입구에 문 열기 버튼이 있습니다.
- 방문자는 바닥 타일·길·계단·다리 위로만 걷습니다. 한 주는 240초(하루 약 34초), 주일이 끝날 때 정산합니다.
- 날씨(맑음·흐림·비·폭우·바람·눈·폭염)가 하루마다 바뀌고 계절을 따릅니다. 방문자 수·야외 시설·매장 판매·주일 출석에 영향을 줍니다.
- 그래픽 생성 프롬프트: `docs/art/gemini-prompts.md`

## 구조
- `index.html` — 마크업과 CSS/JS 로드만 담당
- `css/` — `theme.css`(색·기본 스타일), `hud.css`(상단바·지도 도구·상태바), `panel.css`(하단 패널·오버레이), `responsive.css`(가로 화면 등)
- `tests/` — 검증 스크립트 (게임에는 포함되지 않음)
- `docs/art/sheet-prompts.md` — 모든 이미지 시트 프롬프트와 디자인 콘셉트 (`python3 tools/build_prompts.py`로 만들고, 같은 스크립트가 모바일 복사 페이지 `docs/art/gemini-prompts.html`도 만듭니다)
- `assets/decor/`·`assets/bld/`·`assets/tex/` — 조경·꾸미기, 건물, 바닥 질감 그림 조각. `python3 tools/slice_sheet.py`로 `docs/art/sheets`의 모든 시트에서 잘라 만듭니다 (`js/sprite-data.js`도 함께 생성)
- `js/` — 빌드 도구 없이 클래식 `<script>`로 순서대로 로드하며, 전역 스코프를 공유합니다. `index.html`의 로드 순서를 바꾸지 마세요.
  - 데이터·상태: `config` → `buildings` → `state`
  - 게임 로직: `pathfinding`(바닥·길·계단·다리를 잇는 길찾기, 울타리·교회 문) → `visitors` → `sim` → `build` → `doors`(정면 문 하나) → `bldlv`(운영 방식·건물 레벨·티어) → `paths`(길·철골 계단·다리·연결 다리) → `floors`(바닥 타일) → `ministry`(난이도·목표·사역팀·부교역자·직분자·행사·고민 카드·노후) → `finance`(교회 문, 대출, 주일 정산 영수증) → `weather`(날씨·계절·화면 효과) → `save`
  - 렌더링: `render-core`(투영·도형) → `sprite-data`(자동 생성: 그림 조각 크기·자리) → `sprites`(그림 조각 불러오기·그리기, 없으면 벡터로) → `render-entities`(건물·방문자) → `render-scene`(장면 합성)
  - UI·진입점: `camera` → `hud` → `effects`(목표 축하·빠른 현황·고민 카드) → `panel` → `selcard`(지은 것을 누르면 뜨는 작은 카드) → `place`(지도 위에서 짓기·옮기기: ✓·✕·방향 화살표) → `input` → `audio`(배경 음악·효과음) → `main`(`init`은 마지막 파일에서 실행)

## 출처
- 건물·방문자·길 등 대부분의 그래픽과 시스템은 이 프로젝트의 코드로 새로 그렸습니다.
- 조경·꾸미기·건물·바닥 그림 조각(`assets/`)은 Google Gemini로 생성한 이미지(`docs/art/sheets/`)를 잘라 썼습니다. 생성 프롬프트는 `docs/art/gemini-prompts.md`에 있습니다.
- 배경 음악·효과음(`assets/audio/`)은 OpenGameArt.org의 CC0 음원입니다. 곡·효과음마다 만든 사람과 주소는 `docs/audio.md`에 있습니다.
- 폰트: Google Fonts (Gowun Batang, IBM Plex Sans KR)
- 참고 자료: Kenney 아이소메트릭 에셋(CC0), OpenGameArt(라이선스 확인 필요), OpenRCT2
