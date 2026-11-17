# 그래픽 생성 프롬프트 (Google Gemini)

> 시트 D 이후 모든 시트(아이콘·UI 틀·건물·사람 등)와 디자인 콘셉트는 `sheet-prompts.md`에 있다 (`tools/build_prompts.py`로 만든다). 이 문서는 원칙, 방향 처리, 시트 A~C 기록이다.

여러 요소를 한 장에 격자로 그려 받고, 저장소 스크립트로 칸마다 잘라 쓴다.

## 원칙
- **기존 게임을 지목하지 않는다.** 프롬프트에 특정 게임 이름(롤러코스터 타이쿤 등)을 쓰지 않고, "1990년대 후반 아이소메트릭 픽셀아트 경영 게임"처럼 화풍만 설명한다 (CLAUDE.md: 기존 게임 그래픽 복사 금지).
- **배경은 단색 마젠타(#FF00FF).** Gemini는 투명 배경을 만들지 못한다. 마젠타를 지워 투명하게 만든다. 그래서 바닥 그림자·땅 타일은 그리지 않게 한다 (그림자는 게임 코드가 그린다).
- **칸 사이 검은 선 2px.** 칸이 조금 어긋나도 선을 찾아 정확히 자를 수 있다.
- **방향이 있는 것(울타리·벤치·물길)은 모두 같은 방향으로.** 긴 쪽이 칸의 왼쪽 아래 → 오른쪽 위로 가게 그리고, 다른 방향은 게임에서 좌우 뒤집어 쓴다.
- **앞뒤가 다른 것은 앞모습·뒷모습 두 칸을 따로 받는다.** 아이소메트릭 화면에서 네 방향은 두 그림으로 만들 수 있다 (아래 "방향 처리" 참고).
- **크기 기준을 하나로.** 모든 요소가 같은 바닥 한 칸(가로:세로 = 2:1 마름모)에 서 있다고 알려 준다.
- 해상도 선택지가 있으면 **2K(2048×2048) 이상**을 고른다. 1024px이면 7×7 한 칸이 약 146px이라 작은 요소만 쓸 만하다.
- 격자가 클수록 요청한 순서를 덜 지킨다. 7×7은 시험용이고, 결과를 보고 6×6이나 5×5로 줄일지 정한다. 큰 건물은 4×4가 알맞다.

## 모든 시트 공통 규칙 (다음 시트부터)
- **맨 오른쪽 아래 칸(7행 7열)은 비워 둔다.** Gemini가 생성 이미지 표시(별 모양 워터마크)를 그 칸 오른쪽 아래에 넣기 때문이다. 그래서 한 시트에 요소는 최대 48개(7×7 기준)만 넣고, 프롬프트의 LAYOUT 맨 끝에 아래 문장을 붙인다. 목록(CONTENTS)에도 7행에는 6개만 적는다.

```
The bottom-right cell (row 7, column 7) must stay completely empty: only the flat magenta background, no object, no shadow, no text. Place objects only in the other 48 cells.
```

## 시트 A (시험) — 조경·꾸미기 1칸 요소 7×7

아래 영어 프롬프트를 그대로 붙여 넣는다.

```
Create a single square sprite sheet image for an isometric church-garden management game.

LAYOUT
- Exactly 7 columns x 7 rows of equal square cells (49 cells total).
- Cells are separated by straight 2-pixel pure black (#000000) grid lines, including a border around the whole sheet.
- The background of every cell is one flat solid magenta color (#FF00FF). No gradient, no texture, no ground tile, no floor, no cast shadow on the background.
- Each cell contains exactly ONE object, horizontally centered, with its base resting in the lower third of the cell. Keep at least 10% empty magenta margin on every side. Nothing may touch or cross a grid line.

STYLE
- Crisp late-1990s isometric pixel art, like a cheerful classic park and garden management simulation.
- True 2:1 dimetric isometric projection: every object stands on the same imaginary ground tile shaped like a diamond twice as wide as it is tall, viewed from the same camera angle (looking down from the south).
- Light comes from the upper left. Clean 1-pixel dark outlines, saturated but natural palette, light dithering, hard pixel edges, no blur, no anti-aliasing halo, no magenta tint on the objects.
- All objects share one consistent scale: a large tree is about 3 tiles tall, a street lamp about 2 tiles tall, a bench about half a tile tall.
- No text, no letters, no numbers, no logos, no people, no animals except where listed, no UI.
- Objects with a long side (fences, walls, benches, water channels, bridges) all run the same way: their long side goes from the lower-left to the upper-right of the cell.

CONTENTS (left to right, top to bottom)
Row 1: round leafy green deciduous tree; tall dark green fir tree; pink cherry blossom tree; red-orange autumn maple tree; bright yellow ginkgo tree; Korean red pine with a curved trunk; white birch tree.
Row 2: round clipped boxwood ball; cone-shaped topiary; pink azalea bush; blue hydrangea bush; small square raised bed of red and yellow tulips; patch of sunflowers; clump of tall pampas grass.
Row 3: terracotta pot with mixed flowers; long wooden flower box; hanging flower basket on a black iron post; grey stone urn planter with ivy; red rose bush; straight low green hedge segment; L-shaped low green hedge corner.
Row 4: white wooden picket fence segment; low grey fieldstone wall segment; black wrought-iron railing segment; bamboo fence segment; low red brick wall segment with a cap; rustic two-rail wooden fence segment; white picket fence segment with a small open gate.
Row 5: straight stone-edged water channel tile with blue water; L-shaped corner of the same water channel; small round lily pond with pink water lilies; stepping stones across shallow water; small arched grey stone footbridge; stone bird bath with a small bird; three-tier stone fountain with splashing water.
Row 6: classic black Victorian street lamp, lit; double-headed black street lamp, lit; short garden bollard light; traditional Korean granite stone lantern; wooden pole with warm string lights; paper lantern hanging on a wooden post; small ground spotlight shining upward.
Row 7: wooden park bench with a backrest; round picnic table with a striped parasol; green park trash bin; small wooden notice board with a little roof and blank paper sheets; metal bicycle rack; small bronze bell hanging in a wooden frame; white cross sculpture on a stone base.
```

### 결과를 보면 확인할 것
1. 칸이 정확히 7×7이고 검은 선이 곧은가
2. 요소가 칸 선을 넘거나 서로 겹치지 않는가
3. 모든 요소의 시점(2:1 마름모 바닥)과 크기 기준이 같은가
4. 배경이 순수 마젠타이고 요소 가장자리에 분홍 번짐이 없는가
5. 행·열 순서가 목록과 맞는가 (틀린 칸은 다음 시트에서 다시 받는다)

## 방향 처리 (앞모습·뒷모습 + 좌우 뒤집기)
게임의 정면 방향 4가지(화면 기준 ↘ ↙ ↖ ↗)는 그림 두 장과 좌우 뒤집기로 만든다.

| 정면 방향 | 쓰는 그림 |
|---|---|
| ↘ 오른쪽 아래 | 앞모습 그대로 |
| ↙ 왼쪽 아래 | 앞모습을 좌우 뒤집기 |
| ↖ 왼쪽 위 | 뒷모습 그대로 |
| ↗ 오른쪽 위 | 뒷모습을 좌우 뒤집기 |

앞뒤가 같은 것(울타리·물길·다리·아치·긴 탁자)은 그림 한 장이면 되고, 긴 쪽이 "/"인 그림과 좌우 뒤집은 "\" 두 가지로 쓴다. 한계: 뒤집으면 빛이 왼쪽 위에서 오른쪽 위로 바뀌어 보이지만 작은 그림이라 눈에 띄지 않는다.

## 시트 C — 앞·뒤 그림이 필요한 꾸미기 6×6
칸이 크다(2K에서 약 340px). 앞·뒤 12쌍(24칸)과 앞뒤가 같은 11칸, 맨 오른쪽 아래는 비움. 시트 A·B에서 칸 밖으로 잘렸던 물길·줄조명·조명·십자가도 여기서 다시 받는다. 아래 영어 프롬프트를 그대로 붙여 넣는다 (모바일에서는 `gemini-prompts.html`에서 복사 버튼).

```
Create a single square sprite sheet image for an isometric church-garden management game. It contains garden and park furniture that has a clearly different front and back.

LAYOUT
- Exactly 6 columns x 6 rows of equal square cells (36 cells total).
- Cells are separated by straight 2-pixel pure black (#000000) grid lines, including a border around the whole sheet.
- The background of every cell is one flat solid magenta color (#FF00FF). No gradient, no texture, no ground tile, no floor, no cast shadow, no glow, no halo, no light beam, no reflection on the background.
- Each cell contains exactly ONE object (or one view of an object), horizontally centered, with its base resting slightly below the middle of the cell. The whole object must fit inside the middle 70% of the cell width and the middle 75% of the cell height: keep at least 15% empty magenta margin on every side. Nothing may touch or cross a grid line. Long objects must be drawn short enough to fit completely, never cropped.
- The bottom-right cell (row 6, column 6) must stay completely empty: only the flat magenta background, no object, no shadow, no text. Place objects only in the other 35 cells.

STYLE
- Crisp late-1990s isometric pixel art, like a cheerful classic park and garden management simulation.
- True 2:1 dimetric isometric projection: every object stands on the same imaginary ground tile shaped like a diamond twice as wide as it is tall, viewed from the same camera angle (looking down from the south).
- Light comes from the upper left. Clean 1-pixel dark outlines, saturated but natural palette, light dithering, hard pixel edges, no blur, no anti-aliasing halo, no magenta tint on the objects.
- One consistent real-world scale for every object (one ground tile is about 1 meter square). Do NOT enlarge small objects to fill their cell: a bench is only about 1.5 tiles long and a vending machine only about 1.8 tiles tall.
- No text, no letters, no numbers, no logos, no people, no animals, no UI. Any sign, panel, screen or paper must be blank.
- No glow, no light rays, no sparkles anywhere, even on lamps and light bulbs.
- Every long object runs the same way: its long side goes from the lower-left to the upper-right of the cell.

PAIRS (cells 1 to 24, rows 1 to 4)
Each object takes TWO neighbouring cells, always in the same order: the LEFT cell shows the FRONT VIEW and the RIGHT cell shows the BACK VIEW of the same object. Draw it as one 3D model turned 180 degrees around its vertical axis: same shape, same size, same colors, same position in the cell, same camera. Only the side that faces the camera changes.
- FRONT VIEW: the front of the object (the side people use it from, for example the seat side of a bench) faces the lower-right, toward the camera.
- BACK VIEW: the object is turned around, so its plain back faces the lower-right, toward the camera, and the front is hidden.
The pairs are, left to right, top to bottom (front cell, back cell):
Row 1: wooden park bench with a backrest; two-seat wooden porch swing bench with a small gabled roof on four posts; small wooden notice board on two posts with a little roof and blank paper sheets.
Row 2: simple bus-stop shelter with a wooden roof, a back wall and a bench inside; wooden sun lounger with a cushion; small wooden free-library box on a post with a glass door and a few books.
Row 3: stone drinking-fountain pillar with a tap and a small basin; charcoal barbecue grill with a chimney hood on a brick base; drink vending machine with blank colored panels.
Row 4: outdoor wooden lectern with a slanted reading top on a stone base; small wooden coffee cart kiosk with a striped awning and a counter; small wooden flower-stall cart with a striped awning and buckets of flowers.

SINGLES (cells 25 to 35: row 5 all six cells, row 6 the first five cells)
Each cell holds one object that looks the same from both sides.
Row 5: straight stone-edged water channel of exactly one tile length with blue water, both ends flush and fully visible, running lower-left to upper-right; the same channel with three flat stepping stones across it; small arched grey stone footbridge; flat wooden plank footbridge with simple rails; two short wooden poles about two tiles apart joined by a sagging string of small round warm yellow light bulbs, fully inside the cell; small ground spotlight on a short stake, switched off, no beam.
Row 6: white cross sculpture on a stone base; wooden garden pergola arch with climbing pink roses; rectangular wooden picnic table with two attached benches; wooden garden gate between two stone posts; wooden trellis panel with a climbing green vine and small white flowers.
```

### 시트 C를 받으면 확인할 것
1. 6×6이고 검은 선이 곧은가, 맨 오른쪽 아래 칸이 비었는가
2. **앞·뒤 쌍이 같은 물건인가** (모양·크기·색·자리가 같고 보이는 면만 다른가). 다르면 그 쌍만 다시 받는다
3. 앞모습은 앞면이 오른쪽 아래를, 뒷모습은 뒷면이 오른쪽 아래를 향하는가
4. 긴 물건이 모두 "/" 방향이고 칸 밖으로 잘리지 않았는가
5. 불빛 번짐·그림자가 없는가

## 시트 D~H 사용 현황 (`sheets/sheet-D.png`~`sheet-H.png`, 칸 설정 `sheet-D.json`~`sheet-H.json`)
받은 이미지가 1024px(2K 아님)이라 줄이지 않고 원래 크기로 썼다. F·G는 요청한 격자와 달라(F 6×6, G는 주차장이 칸을 합침) 칸을 다시 매겼고, 아래쪽 배경이 바랜 분홍이라 칸마다 배경색을 따로 재서 지운다(`bgauto`).
- **D 질감 (사용)**: 잔디(바탕 전체), 도로, 주차 구역, 보도, 보도블록·벽돌·자갈·나무 바닥·디딤돌·꽃잔디 바닥. 받아 두었지만 아직 안 쓰는 것: 꽃 잔디, 판석, 물, 눈 (돌 테두리 칸은 줄이 아니라 사각 틀로 나와 버림)
- **E (사용)**: 기도실, 상담실, 수유실, 화장실, 성경공부방, 의료 봉사실, 유아방, 구제창고, 휴게실, 새벽기도실, 종
- **E (안 씀)**: 매점·카페·빵집·서점 (영어 간판 글씨), 안내실 (게시판처럼 그려짐), 쌍등 가로등·첨탑 (분홍 번짐), 자전거 거치대 (보라 테두리)
- **F (사용)**: 작은 예배실, 청년부실, 어린이부실, 공부방, 북카페, 주차 타워(앞면이 ↙, fl), 놀이터, 연못. **뺌(동양식)**: 경로 쉼터·소그룹실(한옥)·정자 → 시트 E3·E2에서 서양식으로 다시 받는다. **안 씀**: 찬양실 (MUSIC 글씨), 원래 소그룹실(뒷모습이 다른 건물), 소형 주차장·분수 광장 (맞는 정의 없음, 차를 코드가 그림)
- **G (사용)**: 예배당, 식당(앞면 ↙), 무료 급식소, 나눔장터, 야외 예배터. **뺌(동양식)**: 선교관·친교실(기와지붕) → 시트 E3에서 서양식으로 다시 받는다. **안 씀**: 주차장 (차를 코드가 그림), 남는 두 쌍
- **H (사용)**: 체육관, 대예배당(앞면 ↙), 교회 입구 아치 닫힘·열림. **안 씀**: 행사 천막, 표지석 (맞는 정의 없음)
- 2층 이상으로 올린 건물은 그림을 쌓을 수 없어 코드 그림으로 돌아간다.

## 시트 W3 사용 현황 (`sheets/sheet-W3.png`) — 예배당 앞·뒤 다시
- 2×1로 요청했지만 또 2×2로 와서 같은 건물 앞·뒤 두 쌍이 왔다. **사용**: 윗줄 한 쌍(앞 `chapel`, 뒤 `chapel_b`, 앞면 ↙ `fl`). 십자가까지 잘리지 않았고 앞·뒤가 서로 맞는다. 칸 범위(`box`)로 자른다.
- **안 씀**: 아랫줄 한 쌍 (뒷모습의 지붕이 이상하게 겹쳐 있음). 예배당은 W2의 흰 종탑 앞모습 대신 W3의 작은 종루 버전으로 통일했다.
- 이로써 예배당·대예배당 모두 고화질. 칸 수 줄이기 + 앞·뒤를 한 시트에서 받기가 효과적이었다.

## 시트 W2 사용 현황 (`sheets/sheet-W2.png`) — 예배당·대예배당 앞·뒤
- 격자를 못 지켜 위 3칸·아래 2칸으로 왔다 → 칸 범위(`box`)를 직접 줘서 자른다.
- **사용**: 예배당(`chapel`) 앞모습(흰 종탑·현관 좋음, 앞면 ↙ `fl`), 대예배당(`grand`·`grand_b`) 앞·뒤 (매우 좋음, 앞면 ↙).
- **문제**: 예배당 뒷모습 두 장 모두 종탑 끝이 칸 위쪽에서 잘렸다 (그림이 칸에 너무 크게 그려짐) → `chapel_b`는 아직 예전 그림. 다음은 시트 W3(2×1, 건물은 칸 높이 60% 이하).
- 워터마크는 오른쪽 아래 구석이라 건물과 겹치지 않았다.

## 시트 W1 사용 현황 (`sheets/sheet-W1.png`) — 고화질 시험
- 칸 수를 줄이면(2×2) 화질이 확실히 좋아진다: 한 칸 약 1000px, 건물이 약 850px로 그려져 지붕 줄·돌 기초·창틀이 선명하다. 예전 6×6 칸(약 170px)과 비교하면 게임 속 크기에서 흐림·분홍 테두리가 사라졌다.
- **사용**: 작은 예배실(`room`) 앞·뒤, 예배당(`chapel`) 앞모습. 문이 왼쪽 면에 있어 앞면 ↙(`fl`). 예배당 뒷모습(`chapel_b`)은 아직 예전 그림이다 → 2×2로 다시 받기.
- **문제**: 요청하지 않은 건물 9개가 오른쪽 아래 칸에, 작은 건물 하나가 첫 칸 구석에 끼어들었다 (`erase`로 지움, 토대에 희미한 자국이 남음). Gemini는 칸이 남으면 채우려 한다 → 다음 시트는 4칸을 모두 쓰는 구성이 좋다 (예: 예배당 앞·뒤 + 대예배당 앞·뒤).

## 시트 E4 사용 현황 (`sheets/sheet-E4.png`)
- 처음으로 2000px로 왔고, 격자(3×3)와 '간판 없음'을 지켰다. 빵집·서점 앞·뒤 사용 (앞면 ↘). 칸이 커서 절반 크기로 자른다 (`scale` 0.5).
- **안 씀**: 여분의 뒷모습 두 칸, 행사 천막·표지석 (요청하지 않았고 맞는 정의 없음).

## 시트 E3·E2 사용 현황 (`sheets/sheet-E3.png`·`sheet-E2.png`)
- **E3 (모두 사용)**: 경로 쉼터, 소그룹실, 선교관(앞면 ↙), 친교실 — 서양식으로 다시 받은 건물. 3행은 칸 너비가 달라 픽셀 범위(box)로 자른다. 이번에도 1024px.
- **E2 (일부만)**: 요청한 4×4가 아니라 6×6으로 왔고 영어 간판·불빛 번짐이 또 나왔다. 쓴 것: 매점(앞·뒤, 앞면 ↙), 카페(앞모습만 — 뒷모습이 다른 재질), 찬양실(앞·뒤, 앞면 ↙, 창에 악기), 흰 서양식 정자. **안 씀**: 빵집·서점(글자), 첨탑·쌍등 가로등(번짐), 안내실(알아볼 수 없음).

## 시트 C 사용 현황 (`sheets/decor-c.png`, 칸 설정 `sheets/decor-c.json`)
- **앞·뒤 12쌍 모두 사용**: 벤치, 그네 의자, 게시판, 버스 정류장(마젠타 유리는 투명 처리), 선베드, 작은 도서함, 식수대, 바비큐 그릴, 자판기, 야외 강대상, 커피 카트, 꽃 가판대
- **한 장짜리**: 아치 돌다리, 나무 다리, 줄조명, 정원 조명, 십자가(십자가 조형물), 장미 아치(꽃 아치), 피크닉 테이블, 정원 문, 덩굴 격자
- **쓰지 않음**: 물길 24·25 (칸 밖으로 잘림, 이번에도 실패 → 물길은 벡터 그림 유지)

## 시트 B 사용 현황 (`sheets/decor-b.png`, 칸 설정 `sheets/decor-b.json`)
같은 프롬프트로 다시 받은 두 번째 시트. 아래 27칸을 잘라 `assets/decor/`에 쓴다.
- **기존 요소 그림 교체(15)**: 나무 0, 벚나무 2, 단풍나무 3, 은행나무 4, 소나무 5, 둥근 회양목 7, 튤립 화단 11, 화분 14, 새 물그릇 33, 분수 34, 가로등 35, 정원등 37, 석등 38, 파라솔 테이블 43, 쓰레기통 44
- **새 요소(12)**: 전나무 1, 자작나무 6, 원뿔 회양목 8, 진달래 9, 수국 10, 해바라기 12, 억새 13, 걸이 화분 16, 돌 화분 17, 장미 18, 수련 물그릇 30, 초롱 등 40
- **쓰지 않음**: 방향이 있는 것(꽃상자 15, 생울타리 19·20, 울타리 21~27, 다리 32, 쌍등 가로등 36, 벤치 42, 게시판 45, 자전거 거치대 46, 종 47)은 네 방향 그림이 없어 벡터 그림을 유지. 물길 28·29·31은 칸 밖으로 잘림, 줄조명 39는 오른쪽 잘림, 조명 41은 빛줄기 번짐, 십자가 48은 워터마크 칸 → 다음 시트에서 다시 받는다

## 다음 시트
`sheet-prompts.md` 참고 (시트 D~N).

소모임 건물(시트 S1 운동 코트 7종, S2 취미 방 5종 앞·뒤, S3 음악 방 3종 앞·뒤)은 아직 받지 않았다. 받기 전까지 게임에서는 코드 그림(코트 바닥·선·기구, 간판 달린 실내 건물)으로 그린다.

## 문 없는 건물 (입구·출구 건물 도입 후)
입구·출구가 건물 1층 둘레에 붙는 작은 현관 건물이 되면서, 방문 건물 그림에서 문·계단·현관을 뺀다. 이미 쓰는 고화질 그림(W1 작은 예배실, W3 예배당, W2 대예배당)은 쓰는 한 쌍만 잘라 `edit-src/`에 두고 문만 지우는 수정 프롬프트(R1~R3)로 고친다. 나머지 예배 건물은 W4~W6에서 문 없이 새로 받는다. 프롬프트는 `sheet-prompts.md`.

## 인트로 화면 (`sheets/intro-bg.webp`·`sheets/intro-ui.webp`)
- 두 장 모두 Gemini로 생성해 받은 그림이다 (2000×1116, 오른쪽 아래에 Gemini의 작은 별 모양 표시가 있다). 생성 프롬프트 원문은 저장소에 받지 못해 적지 못했다 — 다시 만들 때 여기에 적을 것.
  - `intro-bg.webp`: 벚꽃 핀 시골 마을과 작은 교회, 길에서 인사하는 사람들 (손그림풍 아이소메트릭, 따뜻한 노을빛).
  - `intro-ui.webp`: 같은 배경 위에 'Church Tycoon' 로고와 'Tap to Start' 단추를 얹고, 위쪽을 마젠타(#FF00FF)로 덮은 그림.
- 쓰는 법: `python3 tools/intro_assets.py` → `assets/intro/intro_bg.webp`(표시가 들어가지 않게 1776×999로 자름)·`intro_logo.png`·`intro_btn.png`.
  로고·단추는 'UI 시트의 화소가 배경 그림과 마젠타를 섞은 색으로 설명되면 바탕'이라는 기준으로 떼어 내고, 가장자리의 분홍 물은 안쪽 색을 번지게 해 없앤다. 단추는 짙은 바깥선 안쪽만 쓴다(둘레의 빛은 CSS).

## 성도 아이콘 초상화 시트 (`assets/portraits/icons/members/`)
성도 화면 카드의 동그란 아이콘(화면에서 54~78px, 큰 화면 ×2 해상도 기준 약 128px)에 들어갈 얼굴들이다. 한 장에 6열 × 4행(24명)을 한 번에 받아 `docs/art/sheets/members.png`에 두고, 칸마다 잘라(`tools/slice_sheet.py`) 동그랗게 오려 쓴다.
- **칸 배치**: 윗 두 행 = 여성(12명), 아래 두 행 = 남성(12명). 열이 나이대(1열 10대 후반 → 6열 70대)라 `g`(성별)와 나이대로 골라 쓸 수 있다. 같은 열의 윗/아랫 행은 머리·옷 모양이 다르게.
- **받은 뒤**: 마젠타 배경을 투명하게 → 칸마다 정사각으로 잘라 `member_f1.png`~`member_f12.png`, `member_m1.png`~`member_m12.png`로 저장 → `portraitSvg`(people.js)를 이 그림으로 바꾼다.

### 프롬프트 (영어로 넣는다)
```
A character sheet of 24 small head-and-shoulders portrait icons of ordinary Korean church members, arranged in a perfect grid of 6 columns by 4 rows on a single image (landscape, 1536x1024 so each cell is a 256x256 square). Every portrait is centered in its own square cell, with a wide empty margin of at least 24 px between cells so the faces can be cut apart cleanly. The entire background of the image, including all gaps between portraits, is one flat solid pure magenta (#FF00FF) with no gradient, no shadow, no texture, no frame, no circle and no text.

Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling: clean confident outlines, soft cel shading, smooth gradients on skin, large expressive eyes, gentle smiles, slightly rounded cute proportions, warm natural colors. The same art style, line weight, lighting (soft light from the upper left) and face proportions in all 24 portraits, as if drawn by one artist. Each portrait shows only the head and shoulders, facing the viewer, face filling about 60% of the cell height, simple everyday clothes (cardigans, shirts, blouses, knit vests, hoodies, jackets). No hands, no props, no background scenery, no watermark, no logos, no letters.

Rows 1 and 2 (top two rows) are 12 different Korean women. Rows 3 and 4 (bottom two rows) are 12 different Korean men. Each column is an age group, the same for all four rows:
column 1: late teens (school student, fresh face),
column 2: twenties (college student or young worker),
column 3: thirties,
column 4: forties,
column 5: fifties to early sixties (some gray hair, light wrinkles; one or two with glasses),
column 6: seventies (white or gray hair, kind wrinkled smile).
Within an age group the two rows of the same gender must look clearly different from each other: different hair style and color (black, dark brown, auburn, gray, white; short, bob, long, ponytail, bun, permed, side-parted), different clothes and clothing colors, a few with glasses, a few with a small freckle or dimple. Skin tones are natural East Asian. Expressions vary: warm smile, bright laugh, shy smile, calm gentle look. Absolutely no two faces alike.
```

### 시트 사용 현황
아직 받지 않았다. 받으면 여기에 쓸 칸과 못 쓴 칸을 적을 것 (Gemini 작은 별 표시가 오른쪽 아래에 들어오면 그 칸은 쓰지 않거나 지운다).

## 메인 화면 버튼 그림 (Gemini로 만들 것 — 아직 게임에 쓰지 않음)
지금 메인 화면의 버튼 그림은 코드로 그린 픽셀 아이콘(`js/pixicons.js`)과 이모지다. 아래 시트를 Gemini로 받으면 `docs/art/sheets/`에 두고 `tools/slice_sheet.py`로 잘라 `assets/ui/`에 만든 뒤 버튼에 `<img>`로 쓴다(게임 코드는 잘린 조각만 불러온다).
- 공통 규칙: 마젠타(#FF00FF) 단색 배경(받은 뒤 투명하게), 버튼 한 칸 = 정사각 셀, 셀 사이 여백 충분히, 그림자는 버튼 아래로만 짧게, 워터마크·글자 밖 문구 금지.
- **글자는 이미지 안에 직접 넣는다**(요청: 심방·선물 등). Gemini가 한글을 틀리게 그리면 글자 없는 버전으로 다시 받고 글자는 CSS로 얹는다(프롬프트 끝의 'no text' 줄).
- 기존 게임 이름은 쓰지 않는다. 화풍만 설명한다.

### 공통 화풍 블록 (아래 프롬프트마다 맨 앞에 붙인다)
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons.
```

### 1) 성도 화면 위쪽 버튼 — 심방·선물·고민 (글자 포함)
```
[공통 화풍 블록] A sheet of 6 wide rounded-rectangle action buttons (each about 384x192 px), arranged 3 columns by 2 rows on a magenta background. Every button has a bold icon on the left and a large, clearly readable Korean label on the right, in a rounded friendly hand-drawn display font, dark brown text with a cream outline.
Row 1: (1) label "심방": a pastor with a small Bible and a warm smile knocking on a cozy house door, speech bubble heart; button color soft sky blue. (2) label "선물": a small gift box with a ribbon bow and sparkles; button color butter yellow. (3) label "고민": a speech bubble with a big red exclamation mark, worried face; button color bright coral red (this is the ACTIVE alert state).
Row 2: the same three buttons in their idle/disabled state: desaturated gray-beige, no sparkles, the "고민" one with a gray speech bubble and no exclamation mark.
The Korean labels must be exactly: 심방, 선물, 고민. If you cannot draw Hangul correctly, draw the same buttons with no text at all.
```
- 단체 버튼도 같은 모양으로 받는다: 같은 프롬프트에서 라벨만 "모두 심방", "모두 선물"로 바꾼 두 장.

### 2) 아래 기능 버튼 5개 (원형, 라벨 글자 포함)
```
[공통 화풍 블록] A sheet of 5 round main-menu buttons (each about 256x256 px circle with a thick teal rim and cream inner border), one row on a magenta background, each with a small Korean label ribbon under the circle.
(1) label "건축": a tiny cozy church with a red roof and a hammer. (2) label "행사": a calendar page with a heart and a small banner flag. (3) label "성도": two friendly Korean church members, one older, one younger, side by side. (4) label "봉사자": a red heart held by two helping hands, a sash badge. (5) label "직원": a smiling staff worker with a lanyard name tag and a clipboard.
Also draw a second row with the same five buttons in a "pressed" state (slightly darker, 3 px lower, no drop shadow) and a third row in a "locked" state (grayscale with a small padlock icon on the lower right).
Labels must be exactly: 건축, 행사, 성도, 봉사자, 직원. If Hangul comes out wrong, redraw with no text.
```
- 성도 버튼에는 알림용 빨간 느낌표 배지(코드로 얹음)가 붙으니 오른쪽 위 모서리를 비워 둔다.

### 3) 위쪽 HUD 버튼 (지도를 가리지 않게 작고 단순하게)
```
[공통 화풍 블록] A sheet of 14 small round icon buttons (each about 160x160 px) in a 7 by 2 grid on a magenta background, no text, simple bold pictograms:
Row 1: (1) rotate the map 90 degrees: a curved arrow around a tiny isometric house; (2) view mode: an eye; (3) settings: a gear; (4) menu: three horizontal lines; (5) pause: two vertical bars; (6) play 1x: one triangle; (7) fast 2x: two triangles.
Row 2: (8) fast 4x: three triangles; (9) fastest 8x: four triangles; (10) music on: a music note; (11) music off: a music note with a diagonal slash; (12) sound effects on: a speaker with two waves; (13) sound effects off: a speaker with a slash; (14) close: a rounded X on a coral red circle.
```

### 4) 알림·상태 버튼
```
[공통 화풍 블록] A sheet of 6 buttons on a magenta background, each about 192x192 px, no text:
(1) "things to attend to" alert: a glossy round coral-red button with a bold white exclamation mark, a small white count bubble in the upper right corner left empty; (2) the same alert in a pulsing glow state with an outer halo; (3) quest: a round butter-yellow button with a scroll and a star; (4) church level: a rounded badge with a small gold cross and the number slot left empty; (5) concern filter active: coral red rounded square with a white speech bubble and exclamation mark; (6) concern filter idle: gray-beige rounded square with a gray speech bubble.
```

### 5) 성도 아이콘 위 고민 표시
```
[공통 화풍 블록] A sheet of 4 tiny badges (each 96x96 px) on a magenta background, no text: a round red badge with a bold white exclamation mark and a thin white rim in four slightly different sizes/glow levels (normal, pulse small, pulse large, urgent with a faint red halo).
```

### 받은 뒤
1. 마젠타 배경을 투명하게 → 칸마다 `tools/slice_sheet.py`로 잘라 `assets/ui/btn_visit.png` 등 이름을 붙인다(심방 `visit`, 선물 `gift`, 고민 `care`, 모두 심방·선물 `visit_all`·`gift_all`, 기능 버튼 `fab_build`·`fab_events`·`fab_people`·`fab_volunteer`·`fab_staff`, 상태 `_idle`·`_press`·`_lock`).
2. 글자가 틀리면 글자 없는 시트로 다시 받고 라벨은 CSS로 얹는다.
3. 시트 원본은 `docs/art/sheets/ui-*.webp`에 두고, 출처(Gemini 생성)는 README의 에셋 항목에 적는다.

## 추가 버튼 그림 (2차) — 왼쪽 아래 아이콘 · 화면 탭 · 행사 아이콘
공통 화풍 블록(위 '메인 화면 버튼 그림' 절)을 맨 앞에 붙여서 쓴다. 마젠타 배경·워터마크 없음·칸 사이 여백은 같다. 받으면 `docs/art/sheets/ui-buttons6.jpeg` 이후로 두고 `tools/ui_buttons.py`의 `SPEC`에 칸 이름을 적어 자른다.

### 6) 왼쪽 아래 자금·성도 수 칩의 아이콘 (글자·배경 칩 없이 그림만)
```
[공통 화풍 블록] A sheet of 6 standalone icons (no button, no chip, no background plate, no text), each about 192x192 px, in one row of 3 and one row of 3 on a magenta background:
(1) money: a neat stack of Korean banknote-style green bills with a few gold coins in front; (2) money, bright variant for "income" with small sparkles; (3) debt: a deflated coin purse with a small red down arrow and a chain; (4) church members: two friendly Korean church members side by side, a younger woman and an older man, shoulders up; (5) church members, bright variant with a tiny heart above them; (6) congregation count alternative: three small head-and-shoulders silhouettes in warm colors.
Thick dark-brown outline, readable at 32 px.
```

### 7) 화면 탭 버튼 (글자 포함, 상태별로 시트 세 장)
탭 이름 15가지: 행사 · 담임목사 · 부교역자 · 봉사자 · 전체 · 지표 · 퀘스트 · 재정 · 직분자 · 리더 · 섬김이 · 청빙직원 · 직원 · 청빙 · 인력.
```
[공통 화풍 블록] A sheet of 15 small tab buttons (each about 256x96 px, a rounded tab shape with a flat bottom edge like a folder tab), arranged 3 columns by 5 rows on a magenta background. STATE: <IDLE | SELECTED | LOCKED>.
Each tab has a small simple pictogram on the left and a bold readable Korean label on the right in a rounded friendly font, dark brown text with a cream outline. IDLE: sage-green tab, soft shadow. SELECTED: butter-yellow tab raised 4 px higher with a bright cream border and a tiny sparkle. LOCKED: grayscale tab with a small padlock on the right side.
Row 1: "행사" (calendar), "담임목사" (pastor with a Bible), "부교역자" (assistant pastor with a clipboard).
Row 2: "봉사자" (hand holding a heart), "전체" (a group of three people), "지표" (a small bar chart).
Row 3: "퀘스트" (a scroll), "재정" (a coin), "직분자" (a person with a sash badge).
Row 4: "리더" (a person with a flag), "섬김이" (a person with a towel and bucket), "청빙직원" (a person with a name tag and a handshake).
Row 5: "직원" (a person with a lanyard), "청빙" (an envelope with a resume), "인력" (a team of two people).
The Korean labels must be exactly as written. If Hangul comes out wrong, redraw with no text.
```
- 세 번 돌린다: STATE를 `IDLE` → `SELECTED` → `LOCKED`로 바꿔서. 받으면 `tab_<이름>`, `tab_<이름>_on`, `tab_<이름>_lock`으로 자른다.

### 8) 행사 아이콘 — 교회 행사 14개 (글자 없음)
```
[공통 화풍 블록] A sheet of 14 round event icons (each a circle about 224x224 px with a thick sage-green rim, cream inner border and a pastel colored inner disc), arranged 5 columns by 3 rows (last row has 4) on a magenta background. No text, one clear pictogram per icon:
1 small group meeting: a teapot and two cups on a table; 2 Bible study: an open Bible with a bookmark; 3 doctrine study: a rolled scroll with a quill; 4 discipleship training seminar: a graduation cap with a small cross; 5 communion: a loaf of bread and a chalice; 6 street evangelism: a megaphone with small speech bubbles; 7 charity bazaar: a shopping bag and a price tag; 8 community service day: a broom, a bucket and work gloves; 9 retreat: a camping tent under stars; 10 revival meeting: a flame with a small cross; 11 Easter joint worship: a pink tulip and a decorated egg; 12 summer Bible school: a child's backpack and a sun; 13 thanksgiving worship: a bundle of golden wheat and a pumpkin; 14 Christmas worship: a decorated fir tree with a star.
```

### 9) 행사 아이콘 — 담임목사·부교역자 행사 14개 (글자 없음)
```
[공통 화풍 블록] The same round event icon format, 14 icons, 5 columns by 3 rows (last row has 4). No text:
Pastor events (row 1 and the first two of row 2): 1 buy books: a stack of books with a coin; 2 scripture study: a magnifying glass over an open Bible; 3 scripture memorizing: a candle beside a small scroll; 4 prayer mountain meditation: a quiet mountain with a praying silhouette; 5 attend a seminar: a microphone with a lecture screen; 6 pastors' conference: a globe with a small podium; 7 earn a degree: a graduation cap with a diploma scroll.
Assistant pastor events: 8 buy books; 9 scripture study group: a magnifying glass over a Bible with two small speech bubbles; 10 memorizing: a candle and a scroll; 11 attend a seminar: a microphone; 12 degree program: a graduation cap; 13 staff training: a school building with a small bell; 14 staff fellowship night: a teacup with a crescent moon.
Use a cooler blue-violet disc tint for pastor events and a warm teal disc tint for assistant pastor events so they differ at a glance.
```

### 10) 행사 아이콘 — 봉사자 행사 12개 (글자 없음)
```
[공통 화풍 블록] The same round event icon format, 12 icons, 4 columns by 3 rows. No text. Column groups by tint: officers (deacons and elders) = soft rose disc, leaders = sky-blue disc, servers = mint disc, all volunteers = butter-yellow disc.
Row 1 officers: 1 vow dedication worship: praying hands with a sash; 2 officers' seminar: an open Bible with a lecture screen; 3 officers' retreat: a camping tent with a lantern; and a leader icon 4 leaders' tea time: a cookie and a cup.
Row 2: 5 leader training school: a compass; 6 leader MT (group trip): a small bus with a flag; 7 servers' tool sharing: a red toolbox; 8 servers' workshop: a hammer and a wrench.
Row 3: 9 servers' thank-you night: a bouquet with a ribbon; 10 volunteers' prayer meeting: a white dove; 11 volunteers' picnic: a picnic basket on a checkered cloth; 12 volunteers' consolation banquet: a plate with a dome cover and a candle.
```

### 11) 사역팀 아이콘 9개 (봉사자 › 섬김이 탭의 팀 카드 가운데 아이콘)
```
[공통 화풍 블록] The same round icon format, 9 icons, 3 columns by 3 rows, no text: evangelism team (megaphone), praise team (music note and a microphone), care team (two hands holding a heart), newcomer team (a green sprout with a welcome door mat), education team (stack of books and a pencil), intercessory prayer team (praying hands with a soft glow), management team (wrench and a small building), media team (clapperboard and a camera), mission team (a globe with a paper plane).
```

### 받은 뒤 연결 메모
- 탭: `#scrTabs button`의 `data-v`(탭 이름)에 맞춰 배경 그림을 입힌다. 같은 이름의 탭이 화면마다 다르게 쓰이니(`봉사자` = 행사 탭·성도 탭·하단 화면) 화면 + 탭 이름으로 고른다.
- 행사 아이콘: `EVENTS[id].ic`(지금은 이모지)를 `assets/ui/ev_<id>.png`로 바꾼다. id 목록은 위 14·14·12개의 영문 id (`smallgroup bible creed training communion street bazaar service retreat revival easter vbs thanks christmas` / `pbook pstudy pmemo ppray psem pconf pdeg abook astudy amemo asem adeg minedu minfel` / `offvow offsem offret leadtea leadsch leadmt servtool servws servthx volpray volpic volfeast`).
