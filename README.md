# 교회개척 타이쿤

모바일 터치로 즐기는 교회개척 경영 시뮬레이션. 2.5D 아이소메트릭 지도에서 건물을 짓고, 방문자의 필요(말씀·교제·돌봄·편의)를 채워 성도를 늘립니다.

## 실행
- **가로 화면 전용**입니다. 세로로 들면 회전 안내 화면이 뜨고 게임이 멈추며, 가로로 돌리면 이어집니다. 지원하는 브라우저(안드로이드 크롬 전체화면 등)에서는 화면 방향을 가로로 잠급니다.
- `index.html`을 브라우저로 열거나, 저장소 폴더에서 `python3 -m http.server 8000` 후 접속

## 검증
- `node tests/smoke.js` — 스크립트 목록·전역 이름 중복 검사, 가로/세로 동작, 콘솔 오류, 난수 고정 시뮬레이션 결정성을 확인합니다.
- 검증 전용 도구로 Node.js와 Playwright가 필요합니다 (`npm i -g playwright && npx playwright install chromium`). 게임 자체에는 포함되지 않습니다.

## 구조
- `index.html` — 마크업과 CSS/JS 로드만 담당
- `css/` — `theme.css`(색·기본 스타일), `hud.css`(상단바·지도 도구·상태바), `panel.css`(하단 패널·오버레이), `responsive.css`(가로 화면 등)
- `tests/` — 검증 스크립트 (게임에는 포함되지 않음)
- `js/` — 빌드 도구 없이 클래식 `<script>`로 순서대로 로드하며, 전역 스코프를 공유합니다. `index.html`의 로드 순서를 바꾸지 마세요.
  - 데이터·상태: `config` → `buildings` → `state`
  - 게임 로직: `pathfinding`(땅·계단·다리를 잇는 길찾기) → `visitors` → `sim` → `build` → `modular`(역할별로 칸을 이어 짓는 건물, 층 쌓기) → `doors`(입구·출구) → `paths`(길·철골 계단·다리·연결 다리) → `floors`(바닥 타일) → `ministry`(난이도·목표·사역팀·부교역자·직분자·행사·고민 카드·부지·노후) → `save`
  - 렌더링: `render-core`(투영·도형) → `render-entities`(건물·방문자) → `render-scene`(장면 합성)
  - UI·진입점: `camera` → `hud` → `effects`(건축 수치 글씨·목표 축하·빠른 현황·고민 카드) → `panel` → `input` → `main`(`init`은 마지막 파일에서 실행)

## 출처
- 그래픽과 시스템은 이 프로젝트의 코드로 새로 그렸습니다. 외부 이미지·소리·소스는 사용하지 않습니다.
- 폰트: Google Fonts (Gowun Batang, IBM Plex Sans KR)
- 참고 자료: Kenney 아이소메트릭 에셋(CC0), OpenGameArt(라이선스 확인 필요), OpenRCT2
