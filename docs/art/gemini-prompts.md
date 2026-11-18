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

### 공통 화풍 블록 (참고용 원문. 아래 모든 프롬프트에는 이 문장이 이미 포함되어 있다)
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons.
```

### 1) 성도 화면 위쪽 버튼 — 심방·선물·고민 (글자 포함)
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 6 wide rounded-rectangle action buttons (each about 384x192 px), arranged 3 columns by 2 rows on a magenta background. Every button has a bold icon on the left and a large, clearly readable Korean label on the right, in a rounded friendly hand-drawn display font, dark brown text with a cream outline.
Row 1: (1) label "심방": a pastor with a small Bible and a warm smile knocking on a cozy house door, speech bubble heart; button color soft sky blue. (2) label "선물": a small gift box with a ribbon bow and sparkles; button color butter yellow. (3) label "고민": a speech bubble with a big red exclamation mark, worried face; button color bright coral red (this is the ACTIVE alert state).
Row 2: the same three buttons in their idle/disabled state: desaturated gray-beige, no sparkles, the "고민" one with a gray speech bubble and no exclamation mark.
The Korean labels must be exactly: 심방, 선물, 고민. If you cannot draw Hangul correctly, draw the same buttons with no text at all.
```
- 단체 버튼도 같은 모양으로 받는다: 같은 프롬프트에서 라벨만 "모두 심방", "모두 선물"로 바꾼 두 장.

### 2) 아래 기능 버튼 5개 (원형, 라벨 글자 포함)
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 5 round main-menu buttons (each about 256x256 px circle with a thick teal rim and cream inner border), one row on a magenta background, each with a small Korean label ribbon under the circle.
(1) label "건축": a tiny cozy church with a red roof and a hammer. (2) label "행사": a calendar page with a heart and a small banner flag. (3) label "성도": two friendly Korean church members, one older, one younger, side by side. (4) label "봉사자": a red heart held by two helping hands, a sash badge. (5) label "직원": a smiling staff worker with a lanyard name tag and a clipboard.
Also draw a second row with the same five buttons in a "pressed" state (slightly darker, 3 px lower, no drop shadow) and a third row in a "locked" state (grayscale with a small padlock icon on the lower right).
Labels must be exactly: 건축, 행사, 성도, 봉사자, 직원. If Hangul comes out wrong, redraw with no text.
```
- 성도 버튼에는 알림용 빨간 느낌표 배지(코드로 얹음)가 붙으니 오른쪽 위 모서리를 비워 둔다.

### 3) 위쪽 HUD 버튼 (지도를 가리지 않게 작고 단순하게)
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 14 small round icon buttons (each about 160x160 px) in a 7 by 2 grid on a magenta background, no text, simple bold pictograms:
Row 1: (1) rotate the map 90 degrees: a curved arrow around a tiny isometric house; (2) view mode: an eye; (3) settings: a gear; (4) menu: three horizontal lines; (5) pause: two vertical bars; (6) play 1x: one triangle; (7) fast 2x: two triangles.
Row 2: (8) fast 4x: three triangles; (9) fastest 8x: four triangles; (10) music on: a music note; (11) music off: a music note with a diagonal slash; (12) sound effects on: a speaker with two waves; (13) sound effects off: a speaker with a slash; (14) close: a rounded X on a coral red circle.
```

### 4) 알림·상태 버튼
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 6 buttons on a magenta background, each about 192x192 px, no text:
(1) "things to attend to" alert: a glossy round coral-red button with a bold white exclamation mark, a small white count bubble in the upper right corner left empty; (2) the same alert in a pulsing glow state with an outer halo; (3) quest: a round butter-yellow button with a scroll and a star; (4) church level: a rounded badge with a small gold cross and the number slot left empty; (5) concern filter active: coral red rounded square with a white speech bubble and exclamation mark; (6) concern filter idle: gray-beige rounded square with a gray speech bubble.
```

### 5) 성도 아이콘 위 고민 표시
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 4 tiny badges (each 96x96 px) on a magenta background, no text: a round red badge with a bold white exclamation mark and a thin white rim in four slightly different sizes/glow levels (normal, pulse small, pulse large, urgent with a faint red halo).
```

### 받은 뒤
1. 마젠타 배경을 투명하게 → 칸마다 `tools/slice_sheet.py`로 잘라 `assets/ui/btn_visit.png` 등 이름을 붙인다(심방 `visit`, 선물 `gift`, 고민 `care`, 모두 심방·선물 `visit_all`·`gift_all`, 기능 버튼 `fab_build`·`fab_events`·`fab_people`·`fab_volunteer`·`fab_staff`, 상태 `_idle`·`_press`·`_lock`).
2. 글자가 틀리면 글자 없는 시트로 다시 받고 라벨은 CSS로 얹는다.
3. 시트 원본은 `docs/art/sheets/ui-*.webp`에 두고, 출처(Gemini 생성)는 README의 에셋 항목에 적는다.

## 글자 없는 그림의 프롬프트 규칙
글자가 필요 없는 그림(아이콘·배지·배경 칩)은 프롬프트 맨 앞과 맨 뒤에 'ABSOLUTELY NO TEXT OF ANY KIND'로 시작하는 강조 문장을 둔다. 글자 자체가 필요한 그림(심방·선물·탭)은 정확한 글자를 적고, 글자를 틀리면 글자 없는 버전으로 다시 받는다.

## 추가 버튼 그림 (2차) — 왼쪽 아래 아이콘 · 화면 탭 · 행사 아이콘
공통 화풍 블록은 각 프롬프트에 이미 풀어 적혀 있으니 통째로 복사하면 된다. 마젠타 배경·워터마크 없음·칸 사이 여백은 같다. 받으면 `docs/art/sheets/ui-buttons6.jpeg` 이후로 두고 `tools/ui_buttons.py`의 `SPEC`에 칸 이름을 적어 자른다.

### 6) 왼쪽 아래 자금·성도 수 칩의 아이콘 (글자·배경 칩 없이 그림만)
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 6 standalone icons (no button, no chip, no background plate, no text), each about 192x192 px, in one row of 3 and one row of 3 on a magenta background:
(1) money: a neat stack of Korean banknote-style green bills with a few gold coins in front; (2) money, bright variant for "income" with small sparkles; (3) debt: a deflated coin purse with a small red down arrow and a chain; (4) church members: two friendly Korean church members side by side, a younger woman and an older man, shoulders up; (5) church members, bright variant with a tiny heart above them; (6) congregation count alternative: three small head-and-shoulders silhouettes in warm colors.
Thick dark-brown outline, readable at 32 px.
```

### 7) 화면 탭 버튼 (글자 포함, 상태별로 시트 세 장)
탭 이름 15가지: 행사 · 담임목사 · 부교역자 · 봉사자 · 전체 · 지표 · 퀘스트 · 재정 · 직분자 · 리더 · 섬김이 · 청빙직원 · 직원 · 청빙 · 인력.
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 15 small tab buttons (each about 256x96 px, a rounded tab shape with a flat bottom edge like a folder tab), arranged 3 columns by 5 rows on a magenta background. STATE: <IDLE | SELECTED | LOCKED>.
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
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 14 round event icons (each a circle about 224x224 px with a thick sage-green rim, cream inner border and a pastel colored inner disc), arranged 5 columns by 3 rows (last row has 4) on a magenta background. No text, one clear pictogram per icon:
1 small group meeting: a teapot and two cups on a table; 2 Bible study: an open Bible with a bookmark; 3 doctrine study: a rolled scroll with a quill; 4 discipleship training seminar: a graduation cap with a small cross; 5 communion: a loaf of bread and a chalice; 6 street evangelism: a megaphone with small speech bubbles; 7 charity bazaar: a shopping bag and a price tag; 8 community service day: a broom, a bucket and work gloves; 9 retreat: a camping tent under stars; 10 revival meeting: a flame with a small cross; 11 Easter joint worship: a pink tulip and a decorated egg; 12 summer Bible school: a child's backpack and a sun; 13 thanksgiving worship: a bundle of golden wheat and a pumpkin; 14 Christmas worship: a decorated fir tree with a star.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```

### 9) 행사 아이콘 — 담임목사·부교역자 행사 14개 (글자 없음)
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. The same round event icon format, 14 icons, 5 columns by 3 rows (last row has 4). No text:
Pastor events (row 1 and the first two of row 2): 1 buy books: a stack of books with a coin; 2 scripture study: a magnifying glass over an open Bible; 3 scripture memorizing: a candle beside a small scroll; 4 prayer mountain meditation: a quiet mountain with a praying silhouette; 5 attend a seminar: a microphone with a lecture screen; 6 pastors' conference: a globe with a small podium; 7 earn a degree: a graduation cap with a diploma scroll.
Assistant pastor events: 8 buy books; 9 scripture study group: a magnifying glass over a Bible with two small speech bubbles; 10 memorizing: a candle and a scroll; 11 attend a seminar: a microphone; 12 degree program: a graduation cap; 13 staff training: a school building with a small bell; 14 staff fellowship night: a teacup with a crescent moon.
Use a cooler blue-violet disc tint for pastor events and a warm teal disc tint for assistant pastor events so they differ at a glance.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```

### 10) 행사 아이콘 — 봉사자 행사 12개 (글자 없음)
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. 
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each round icon and a short soft drop shadow underneath.
A sheet of 12 round event icons (each a circle about 224x224 px with a thick sage-green rim, cream inner border and a pastel colored inner disc), arranged 4 columns by 3 rows on a flat solid magenta (#FF00FF) background. Each icon shows exactly one pictogram and nothing else.
Disc tint by group: officers (deacons and elders) = soft rose disc; leaders = sky-blue disc; servers = mint disc; all volunteers = butter-yellow disc.
Row 1: (1) officers' vow dedication worship: praying hands with a small sash; (2) officers' seminar: an open Bible with a lecture screen; (3) officers' retreat: a camping tent with a lantern; (4) leaders' tea time: a cookie and a teacup.
Row 2: (5) leader training school: a compass; (6) leader group trip: a small bus with a flag; (7) servers' tool sharing: a red toolbox; (8) servers' workshop: a hammer and a wrench.
Row 3: (9) servers' thank-you night: a bouquet of flowers with a ribbon; (10) volunteers' prayer meeting: a white dove; (11) volunteers' picnic: a picnic basket on a checkered cloth; (12) volunteers' consolation banquet: a plate with a dome cover and a candle.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```

### 11) 사역팀 아이콘 9개 (봉사자 › 섬김이 탭의 팀 카드 가운데 아이콘)
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. 
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each round icon and a short soft drop shadow underneath.
A sheet of 9 round team icons (each a circle about 224x224 px with a thick teal rim and cream inner border), arranged 3 columns by 3 rows on a flat solid magenta (#FF00FF) background. Each icon shows exactly one pictogram and nothing else.
Row 1: (1) evangelism team: a megaphone; (2) praise team: a music note and a microphone; (3) care team: two hands holding a heart.
Row 2: (4) newcomer team: a green sprout beside a welcome door mat; (5) education team: a stack of books and a pencil; (6) intercessory prayer team: praying hands with a soft glow.
Row 3: (7) management team: a wrench and a small building; (8) media team: a clapperboard and a camera; (9) mission team: a globe with a paper plane.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```

### 받은 뒤 연결 메모
- 탭: `#scrTabs button`의 `data-v`(탭 이름)에 맞춰 배경 그림을 입힌다. 같은 이름의 탭이 화면마다 다르게 쓰이니(`봉사자` = 행사 탭·성도 탭·하단 화면) 화면 + 탭 이름으로 고른다.
- 행사 아이콘: `EVENTS[id].ic`(지금은 이모지)를 `assets/ui/ev_<id>.png`로 바꾼다. id 목록은 위 14·14·12개의 영문 id (`smallgroup bible creed training communion street bazaar service retreat revival easter vbs thanks christmas` / `pbook pstudy pmemo ppray psem pconf pdeg abook astudy amemo asem adeg minedu minfel` / `offvow offsem offret leadtea leadsch leadmt servtool servws servthx volpray volpic volfeast`).


## 스테이지 1~4 추가 그림 (3차) — 스테이지 카드 · 엠블럼 · 차량 · 산짐승 · 도시 · 인물 · 질감
스테이지 1~4에서 아직 임시 그림(이모지·코드로 그린 그림·SVG)인 요소를 모두 모았다. **12~17번은 필요한 것**(화면 그림·아이콘·인물), **18~20번은 선택**(지도 위 요소와 질감 — 지금도 코드로 그려서 게임은 완성돼 있고, 받으면 더 예뻐지는 것)이다.
- 프롬프트는 **코드 블록 통째로** 복사해 Gemini에 붙여 넣는다. 공통 화풍 문장과 글자 금지 문장이 모두 풀어 적혀 있다(참조 없음). 해상도 선택지가 있으면 2K 이상.
- 글자가 필요 없는 그림은 맨 앞과 맨 뒤에 `ABSOLUTELY NO TEXT OF ANY KIND`가 있다. 그래도 글자가 나오면 그 시트만 다시 돌린다(글자가 들어간 건 16번 탭 하나뿐).
- 마젠타 배경 시트는 아이콘·테두리에 **분홍·보라 계열을 쓰지 않게** 해 두었다(10번 시트에서 배경과 가까운 분홍 때문에 가르기 어려웠다). 시트 맨 오른쪽 아래 구석은 Gemini의 별 표시가 들어오는 자리라 비워 두게 했다.
- 받은 시트는 `docs/art/sheets/`에 두고, 출처(Gemini 생성)는 README의 에셋 항목에 적는다.

| 번호 | 무엇 | 장수 | 어디에 쓰나 |
|---|---|---|---|
| 12 | 스테이지 카드 그림 (농촌·산촌·어촌·도시) | 4장 | 스테이지 고르기 카드 그림 |
| 13 | 스테이지 엠블럼 4종 + 목표 달성판 4종 | 1장 | 카드 번호 줄·목표 달성 표시 |
| 14 | 차량·배 6종 + 운전자·대기 줄·나루 | 1장 | 직원 › 차량 탭, 챙길 일 |
| 15 | 산짐승 3종 · 도시(부지·민원·주차) · 목표 · 이동 아이콘 | 1장 | 챙길 일·알림, 목표 칩, 설정 메뉴 |
| 16 | 직원 화면 '차량' 탭 | 1장 | 탭 버튼 |
| 17 | 스테이지 인물 4명 (이장님·사공·이웃 둘) | 1장 | 차량 카드의 운전자, 민원 알림 |
| 18 | (선택) 지도 위 차량·배·산짐승·정수기·분리수거함 앞뒤 스프라이트 | 1장 | 지도 |
| 19 | (선택) 도시 이웃 건물 5종 | 1장 | 지도 |
| 20 | (선택) 바닥·벽 질감 8종 (산·강·도시) | 1장 | 지형 |

### 12) 스테이지 카드 그림 4장 (글자 없음, 한 장씩 따로 만든다)
스테이지 고르기 카드의 그림이다(지금은 농촌만 인트로 배경을 잘라 쓰고, 산촌·어촌·도시는 코드로 그린 간단한 SVG). 카드 그림은 가로로 아주 긴 띠(화면에 따라 약 2.4:1~2.8:1)로 잘려 보이므로 **21:9로 달라고 하고 주인공을 가운데 띠에 둔다**. 왼쪽 아래에는 '목표' 칩이 얹힌다. 네 장은 같은 화풍·같은 시간대(노을빛)로 맞춘다.
- 받은 뒤: `docs/art/sheets/stage-<id>.webp`(`rural`·`mount`·`sea`·`city`)로 두고, 오른쪽 아래 표시를 잘라 가로 1200px로 줄여 `assets/intro/stage_<id>.webp`로 만든다.

**12-1) 농촌**
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style storybook illustration with a cozy, warm, friendly feeling, hand-painted soft shading, clean confident dark-brown outlines, rich but gentle colors, soft golden-hour light from the upper left, a three-quarter bird's-eye view looking slightly down like a diorama, the same look as a cheerful village title-screen artwork. Composition: a very wide banner (aspect ratio 21:9, as wide as possible). Keep the lower-left corner (about 55% of the width and 25% of the height) calm and low in detail (plain grass, water or road) because a label will be placed over it later. Keep the main subject inside the middle 60% of the image height because the picture will be cropped on small screens. Keep the very bottom-right corner of the image free of important details. Tiny cheerful Korean villagers in cute chibi proportions add life but are never the main subject.
SCENE: a peaceful Korean farming village in spring. A small wooden church with a steep brown roof, a little bell tower and a cross stands on a gentle green hill at the center-right. A winding cobblestone path leads from the lower left up to the church door. Pink cherry blossom trees, terraced rice paddies and vegetable plots, a couple of traditional tile-roofed houses with stone walls in the distance, soft green mountains and warm clouds behind. A few villagers greet each other on the path, one farmer in a straw hat carries a basket.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it.
```

**12-2) 산촌**
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style storybook illustration with a cozy, warm, friendly feeling, hand-painted soft shading, clean confident dark-brown outlines, rich but gentle colors, soft golden-hour light from the upper left, a three-quarter bird's-eye view looking slightly down like a diorama, the same look as a cheerful village title-screen artwork. Composition: a very wide banner (aspect ratio 21:9, as wide as possible). Keep the lower-left corner (about 55% of the width and 25% of the height) calm and low in detail (plain grass, water or road) because a label will be placed over it later. Keep the main subject inside the middle 60% of the image height because the picture will be cropped on small screens. Keep the very bottom-right corner of the image free of important details. Tiny cheerful Korean villagers in cute chibi proportions add life but are never the main subject.
SCENE: a deep mountain village basin in early autumn. Steep rocky green and orange hills with terraced slopes and dark green pine trees surround a flat grassy basin in the center where a small wooden church with a cross stands. A narrow winding road squeezes through a tight canyon between cliffs from the lower left into the basin, and a small old green pickup truck carrying three smiling villagers drives along it. Soft mist hangs between the mountains. A cute wild boar and a young deer peek out of the bushes on the right slope (friendly and cute, not scary). Distant misty peaks and a pale sun.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it.
```

**12-3) 어촌**
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style storybook illustration with a cozy, warm, friendly feeling, hand-painted soft shading, clean confident dark-brown outlines, rich but gentle colors, soft golden-hour light from the upper left, a three-quarter bird's-eye view looking slightly down like a diorama, the same look as a cheerful village title-screen artwork. Composition: a very wide banner (aspect ratio 21:9, as wide as possible). Keep the lower-left corner (about 55% of the width and 25% of the height) calm and low in detail (plain grass, water or road) because a label will be placed over it later. Keep the main subject inside the middle 60% of the image height because the picture will be cropped on small screens. Keep the very bottom-right corner of the image free of important details. Tiny cheerful Korean villagers in cute chibi proportions add life but are never the main subject.
SCENE: a fishing village on a wide blue river at sunset. A broad river flows across the middle of the image from left to right and there is NO bridge anywhere. On the near (lower) bank stand a wooden pier with lanterns, hanging fishing nets, a few small fishing boats and a small wooden ferry boat carrying villagers. On the far (upper) bank a small white church with a cross and a tiny bell tower sits among fishing-village houses with tile roofs. Seagulls in the sky, a small lighthouse on a distant headland, golden sunlight sparkling on the water.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it.
```

**12-4) 도시**
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style storybook illustration with a cozy, warm, friendly feeling, hand-painted soft shading, clean confident dark-brown outlines, rich but gentle colors, soft golden-hour light from the upper left, a three-quarter bird's-eye view looking slightly down like a diorama, the same look as a cheerful village title-screen artwork. Composition: a very wide banner (aspect ratio 21:9, as wide as possible). Keep the lower-left corner (about 55% of the width and 25% of the height) calm and low in detail (plain grass, water or road) because a label will be placed over it later. Keep the main subject inside the middle 60% of the image height because the picture will be cropped on small screens. Keep the very bottom-right corner of the image free of important details. Tiny cheerful Korean villagers in cute chibi proportions add life but are never the main subject.
SCENE: a small church squeezed between big buildings in a busy Korean city in the late afternoon. In the center a small brick church with a cross and a tiny bell tower, a tiny front yard and a narrow parking lot with three parked cars. Around it stand tall cream-colored apartment blocks, glass office towers, a row of small shops with colorful awnings (all signs blank) and a red-brick villa. A white church minivan picks up a few people at the entrance. Neighbors lean out of apartment windows and look curious. A small tree-lined street, street lamps, warm sunset glow reflected on the glass. The city feels dense but friendly, not gloomy.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no signboards or shop signs with writing (leave every sign blank), no banners with writing, no watermark, no signatures, no logos. Pictures only. If any writing would appear, remove it.
```

### 13) 스테이지 엠블럼 4종 + 목표 달성판 4종 (글자 없음)
카드 번호 줄 옆에 붙는 동그란 엠블럼이다. 윗줄은 평소, 아랫줄은 그 스테이지의 목표(성도 100명)를 이뤘을 때 바뀌는 금빛 월계관판.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 8 round stage emblem badges (each a circle about 224x224 px with a thick colored rim, a cream inner border and a pastel inner disc), arranged 4 columns by 2 rows on a flat solid magenta (#FF00FF) background, leaving at least 24 px of magenta between badges. Each badge shows exactly one emblem pictogram and nothing else.
Row 1 (normal state): (1) farming village: a golden rice-ear bundle in front of a tiny wooden church with a cross, rim golden-orange, disc pale warm yellow; (2) mountain village: two green mountain peaks with a winding road and a pine tree, rim forest green, disc pale mint; (3) fishing village: a ship's anchor with two blue waves and a tiny sailboat, rim ocean blue, disc pale sky blue; (4) city: a skyline of three tall buildings with a small cross on one rooftop, rim slate blue-gray, disc pale warm gray.
Row 2 (cleared state): the same four emblems in the same order, each with a golden laurel wreath around the inside of the rim, a small gold star on top and a few tiny sparkles, slightly brighter colors.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `tools/ui_buttons.py`의 `SPEC`에 `13: (2, 4, ['stg_rural', 'stg_mount', 'stg_sea', 'stg_city', 'stg_rural_clear', 'stg_mount_clear', 'stg_sea_clear', 'stg_city_clear'], 144)`을 적고 시트를 `ui-buttons13.jpeg`로 둔다.

### 14) 차량·배 6종 + 운전자·대기 줄·나루 (글자 없음)
직원 › 차량 탭의 차량 카드·구매 단추와 챙길 일 줄에 쓴다(지금은 🛻🚐🚌🛶⛵🚢 이모지). 길을 달리는 것은 노란 원판, 물 위의 것은 하늘색 원판, 나머지 셋은 연두 원판.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 9 round icons (each a circle about 224x224 px with a thick teal rim and cream inner border), arranged 3 columns by 3 rows on a flat solid magenta (#FF00FF) background, leaving at least 24 px of magenta between icons. Each icon shows exactly one pictogram and nothing else.
Row 1 (road vehicles, butter-yellow disc): (1) village truck: a small old green pickup truck seen from the front right with a tiny wooden crate on its back; (2) church van: a white minivan with a small cross on its side door; (3) mini bus: a yellow minibus with a small cross flag on its roof.
Row 2 (boats, sky-blue disc): (4) village ferry: a small flat wooden ferry rowboat with a long pole and a hanging lantern; (5) small boat: a small white motorboat with a blue stripe and a little canopy; (6) chug boat: a chubby small passenger boat with a tiny chimney puffing smoke and a small cross flag.
Row 3 (helpers, mint-green disc): (7) driver: a driver's cap resting on top of a steering wheel; (8) waiting line: three small people waiting in a row, one of them waving; (9) pier: a wooden pier with a lantern and a coiled rope.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC`에 `14: (3, 3, ['veh_truck', 'veh_van', 'veh_bus', 'veh_ferry', 'veh_boat', 'veh_ship', 'fleet_driver', 'fleet_queue', 'fleet_pier'], 128)`. 연결 위치는 `stages.js`의 `VEH_IC`(차량 카드 `.vc-ic`·구매 단추·차량 탭 머리 줄).

### 15) 산짐승 3종 · 도시 아이콘 3종 · 목표 · 이동 아이콘 (글자 없음)
산짐승은 챙길 일 줄·알림, 도시 아이콘은 부지 매입 카드·민원 알림·주차 표시, 목표 깃발은 스테이지 목표 칩(지금은 🎯), 이동 아이콘 둘은 설정 메뉴의 '스테이지 선택'·'메인 화면' 단추(지금은 🗺️🏠)에 쓴다.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 9 round icons (each a circle about 224x224 px with a thick teal rim and cream inner border), arranged 3 columns by 3 rows on a flat solid magenta (#FF00FF) background, leaving at least 24 px of magenta between icons. Each icon shows exactly one pictogram and nothing else.
Row 1 (wild animals, warm tan disc, cute chibi style, never scary, dark brown noses): (1) wild boar: a chubby brown boar with small tusks, three-quarter front view; (2) deer: a young roe deer with big ears and a white rump; (3) raccoon dog: a fluffy raccoon dog with a dark face mask and a bushy tail.
Row 2 (city, soft blue-gray disc): (4) land purchase: a small fenced plot of land with a golden key lying on it and an empty blank price tag; (5) neighbor complaint: a sheet of paper with a frowning face and a small megaphone; (6) parking: a small car seen from above inside a parking space marked with white painted lines (no letters).
Row 3: (7) stage goal, golden-yellow disc: a small flag planted on a green hilltop with a golden star above it; (8) stage select, teal disc: a folded paper map with a red location pin; (9) main screen, warm cream disc: a cozy small house with a door and a chimney.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC`에 `15: (3, 3, ['wild_boar', 'wild_deer', 'wild_racc', 'city_land', 'city_cmp', 'city_park', 'stage_goal', 'nav_stages', 'nav_home'], 128)`. 연결 위치: `stageWarnings`(챙길 일 줄)·`stageGoalHtml`(목표 칩)·`index.html`의 `#bStages`·`#bHome`.

### 16) 직원 화면 '차량' 탭 (글자 포함 — 한글이 틀리면 글자 없이 다시)
7번 탭과 같은 모양의 탭 하나. 선택·잠김 모양은 CSS 필터로 만들므로 평소 모양 하나만 받는다.
```
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet with exactly 1 small tab button (about 256x96 px, a rounded tab shape with a flat bottom edge like a folder tab), centered on a flat solid magenta background with wide empty margins on every side. STATE: IDLE: a sage-green tab with a soft shadow. The tab has a small simple pictogram of a little white church minivan on the left and a bold, clearly readable Korean label on the right in a rounded friendly font, dark brown text with a cream outline. The Korean label must be exactly: 차량. If Hangul comes out wrong, redraw the same tab with no text at all. No other text anywhere, no watermark.
```
- 받은 뒤 연결: `SPEC`에 `16: (1, 1, ['tab_fleet'], 256)`, `screens.js`의 `TAB_IMG`에 `'차량':'fleet'`.

### 17) 스테이지 인물 4명 (성도 초상화와 같은 화풍, 글자 없음)
무료 차량·배의 운전자 표시(이장님·사공)와 도시 민원 알림(이웃 아주머니·아저씨)에 쓴다. 성도 초상화(`assets/portraits/icons/members/`)와 한 화가가 그린 것처럼 보여야 한다.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. A character sheet of 4 small head-and-shoulders portrait icons of Korean villagers and neighbors, arranged in a grid of 3 columns by 2 rows on a single landscape image (each cell is a 256x256 square; 6 cells, only 4 are used). Every portrait is centered in its own square cell with a wide empty margin of at least 24 px between cells so the faces can be cut apart cleanly. The entire background of the image, including all gaps, is one flat solid pure magenta (#FF00FF) with no gradient, no shadow, no texture, no frame, no circle and no text.
Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident outlines, soft cel shading, smooth gradients on skin, large expressive eyes, slightly rounded cute proportions, warm natural colors, soft light from the upper left. The same art style, line weight and face proportions in all portraits. Each portrait shows only the head and shoulders, facing the viewer, face filling about 60% of the cell height, no hands, no props, no background scenery, no watermark, no logos, no letters. Natural East Asian skin tones. Do not use pink, magenta or violet anywhere (the background is magenta).
Row 1: (1) the village head: a Korean man in his sixties with a sun-tanned broad smile, short gray hair under a straw hat and a neat green work vest; (2) the ferryman: a Korean man in his sixties with a weathered tanned face, a white towel around his neck and a faded blue shirt, a calm friendly smile; (3) a neighbor woman: a Korean woman in her fifties with short permed hair and a tidy blouse, a slightly worried pouting expression, still polite.
Row 2: (4) a neighbor man: a Korean man in his fifties with round glasses and a polo shirt, a mildly annoyed but polite expression; cells 5 and 6 stay completely empty magenta, no object, no shadow, no text.
The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `assets/portraits/icons/npc/npc_chief.png`·`npc_boatman.png`·`npc_neighbor_f.png`·`npc_neighbor_m.png`로 자른다(`tools/members_icons.py`와 같은 방식). 연결 위치: 차량 탭의 무료 차량 운전자 줄(`vc-d`)과 도시 민원 알림(`CITY_CMP`).

### 18) (선택) 지도 위 차량·배·산짐승·편의 소품 — 앞·뒤 스프라이트 (글자 없음, 아이소메트릭 픽셀)
지금은 코드로 그린 단순한 상자 모양이다. 같은 칸에서 방향이 바뀌므로 **앞모습(↘ 오른쪽 아래를 향함)과 뒷모습(↖ 왼쪽 위를 향함) 두 장**을 받고 나머지 두 방향은 좌우 뒤집어 쓴다(위의 '방향 처리'). 한 시트에 6열 × 4행, 맨 오른쪽 아래 칸은 비운다.
- 연결: 정수기·분리수거함은 시트를 잘라 등록하면 `drawSprEntity`가 바로 쓴다. 차량·배·산짐승은 `drawVeh`·`drawBoat`·`drawWild`가 그림을 고르도록 코드를 바꿔야 한다.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pixel-art objects only. If any writing would appear, remove it.
Create a single landscape sprite sheet image (aspect ratio 3:2, as high resolution as possible) for an isometric church-village management game.

LAYOUT
- Exactly 6 columns x 4 rows of equal cells (24 cells).
- Cells are separated by straight 2-pixel pure black (#000000) grid lines, including a border around the whole sheet.
- The background of every cell is one flat solid magenta color (#FF00FF). No gradient, no texture, no ground tile, no cast shadow on the background.
- Each cell contains exactly ONE object, horizontally centered, its base resting in the lower third of the cell, with at least 10% empty magenta margin on every side. Nothing may touch or cross a grid line.

STYLE
- Crisp late-1990s isometric pixel art, like a cheerful classic park and garden management simulation.
- True 2:1 dimetric isometric projection: every object stands on the same imaginary ground tile shaped like a diamond twice as wide as it is tall, viewed from the same camera angle (looking down from the south).
- Light comes from the upper left. Clean 1-pixel dark outlines, saturated but natural palette, light dithering, hard pixel edges, no blur, no anti-aliasing halo, no magenta tint on the objects.
- No text, no letters, no numbers, no logos, no UI, no ground tile, no floor, no cast shadow on the background.
- All objects share one consistent scale (a ground tile is the diamond the object stands on): a small village truck is about 1.0 tile long, a church minivan 1.1, a mini bus 1.6, a village ferry boat 1.3, a small motorboat 1.5, a chug passenger boat 2.0, a fishing boat 1.5, a wild boar 0.55, a roe deer 0.7, a raccoon dog 0.4, a water purifier and a recycling station about 0.4 tile wide.
- FRONT view = the object faces toward the lower-right corner of its cell (we see its front and one side). BACK view = the same object faces toward the upper-left corner (we see its rear and the other side). The front and back drawings of one object must match in colors, size and details. No people inside the vehicles.

CONTENTS (left to right, top to bottom)
Row 1: village truck FRONT (small old green pickup with a wooden crate); village truck BACK; church minivan FRONT (white with a small red cross on the side door); church minivan BACK; mini bus FRONT (yellow with a small cross flag on the roof); mini bus BACK.
Row 2: village ferry FRONT (flat wooden ferry with a pole and a hanging lantern); village ferry BACK; small motorboat FRONT (white with a blue stripe and a small canopy); small motorboat BACK; chug passenger boat FRONT (chubby, with a small chimney and a cross flag); chug passenger boat BACK.
Row 3: fishing boat FRONT (small blue wooden boat with a furled sail and a net); fishing boat BACK; wild boar FRONT (chubby brown boar with small tusks); wild boar BACK; roe deer FRONT; roe deer BACK.
Row 4: raccoon dog FRONT (dark face mask, bushy tail); raccoon dog BACK; stone-gray water purifier with a blue water tank (one view only, facing the lower-right); three-bin recycling station in blue, yellow and green (one view only, facing the lower-right); two empty cells.
The bottom-right cell (row 4, column 6) must stay completely empty: only the flat magenta background, no object, no shadow, no text.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pixel-art objects only. If any writing would appear, remove it.
```

### 19) (선택) 도시 이웃 건물 5종 (글자 없음, 아이소메트릭 픽셀)
도시 스테이지의 이웃 건물(`c_apt`·`c_office`·`c_villa`·`c_mart`·`c_house`)이다. 지금은 코드로 그린 상자에 창문 띠. **시트를 잘라 등록하면 `drawSprEntity`가 바로 쓴다**(바닥 면적에 맞춰 크기가 정해지므로 받은 뒤 크기를 확인한다). 문은 모두 남쪽(왼쪽 아래 면) 가운데 1층.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pixel-art buildings only. If any writing would appear, remove it.
Create a single landscape sprite sheet image (aspect ratio 3:2, as high resolution as possible) for an isometric city-and-church management game.

LAYOUT
- Exactly 3 columns x 2 rows of equal large cells (6 cells).
- Cells are separated by straight 2-pixel pure black (#000000) grid lines, including a border around the whole sheet.
- The background of every cell is one flat solid magenta color (#FF00FF). No gradient, no texture, no ground tile, no cast shadow on the background.
- Each cell contains exactly ONE building, horizontally centered, its base resting in the lower third of the cell, with at least 8% empty magenta margin on every side. Nothing may touch or cross a grid line.

STYLE
- Crisp late-1990s isometric pixel art, like a cheerful classic park and garden management simulation.
- True 2:1 dimetric isometric projection: every object stands on the same imaginary ground tile shaped like a diamond twice as wide as it is tall, viewed from the same camera angle (looking down from the south).
- Light comes from the upper left. Clean 1-pixel dark outlines, saturated but natural palette, light dithering, hard pixel edges, no blur, no anti-aliasing halo, no magenta tint on the objects.
- No text, no letters, no numbers, no logos, no UI, no ground tile, no floor, no cast shadow on the background.
- Every building stands on a rectangular footprint made of isometric ground tiles (width x depth) and has its main entrance door centered on the ground floor of the face that looks toward the lower-left. All shop and building signboards are left completely blank. Windows, balconies and roof details are drawn crisply; no people.
- All five buildings share one consistent scale.

CONTENTS (left to right, top to bottom)
Row 1: (1) apartment block: footprint 4 x 5 tiles, 8 floors (about 3.4 tiles tall), cream-white walls with blue-gray stripes, rows of balconies, a rooftop water tank and a glass stair tower; (2) office building: footprint 3 x 3 tiles, 6 floors (about 2.6 tiles tall), a glass curtain wall in blue with thin gray frames and a small rooftop antenna; (3) villa: footprint 2 x 3 tiles, 4 floors (about 1.6 tiles tall), red-brick walls with white window frames and a covered parking space on the ground floor.
Row 2: (4) shop row: footprint 3 x 2 tiles, 2 floors (about 1.0 tile tall), colorful striped awnings over three blank-signed shop fronts, a flat roof; (5) detached house: footprint 2 x 2 tiles, 2 floors (about 0.9 tile tall), brown tiled hip roof, a small front yard with a low wall and a gate; (6) empty cell.
The bottom-right cell (row 2, column 3) must stay completely empty: only the flat magenta background, no object, no shadow, no text.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pixel-art buildings only. If any writing would appear, remove it.
```
- 받은 뒤: `docs/art/sheets/sheet-city.png`와 칸 설정(`sheet-city.json`)으로 `tools/slice_sheet.py`를 돌려 `assets/decor/c_apt.png` 등을 만들고 `sprite-data.js`에 등록한다(내가 만든다).

### 20) (선택) 바닥·벽 질감 8종 (글자 없음, 이음새 없는 타일)
산촌 산의 절벽(지금은 흙색 한 가지)·강·나루·도시 포장에 쓸 질감이다. 위에서 정면으로 본 정사각형 한 장이 반복해 깔려도 이음매가 안 보여야 한다. 마젠타 배경은 쓰지 않고 칸 전체를 질감으로 채운다.
- 연결: 바닥 질감(`t_block` 등 `FLOOR_TEX`·`TEXP`) 방식과 같고, 절벽·강에 입히려면 `terFace`·`drawWaterCell` 코드를 바꿔야 한다.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
Create a single square texture sheet image (aspect ratio 1:1, as high resolution as possible) of 8 seamless, tileable ground and wall textures for a cozy 2D game.

LAYOUT
- Exactly 3 columns x 3 rows of equal square cells (9 cells), separated by straight 2-pixel pure black (#000000) grid lines, including a border around the whole sheet.
- Every used cell is filled edge to edge with its texture: NO magenta, no frame, no margin, no object, no shadow, no perspective. Each texture is seen perfectly flat and straight-on and must repeat seamlessly when tiled, so its left edge matches its right edge and its top edge matches its bottom edge.

STYLE
- Polished hand-painted 2D game texture in a cozy storybook look, soft cel shading, gentle clean dark-brown linework only where natural, warm natural colors, soft light from the upper left. Medium detail, no tiny noise.

CONTENTS (left to right, top to bottom)
Row 1: (1) mountain cliff rock wall seen straight on: layered brown and gray rock strata with small cracks and a few mossy green patches; (2) forest floor seen from above: pine needles, green moss and small pebbles; (3) mountain path seen from above: packed brown earth with small pebbles and faint wheel ruts.
Row 2: (4) river water seen from above: teal-blue water with gentle ripples and a few soft white highlights; (5) riverbank seen from above: light sand mixed with smooth round pebbles; (6) wooden pier planks seen from above: weathered gray-brown boards with nail dots and slightly uneven gaps.
Row 3: (7) city sidewalk seen from above: light gray concrete paver slabs with thin joints; (8) asphalt seen from above: dark gray asphalt with faint fine cracks and no road markings; (9) empty cell.
The bottom-right cell (row 3, column 3) must stay completely empty: a plain flat gray, no object, no text.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤: 칸마다 정사각으로 잘라 `assets/tex/t_cliff.png`·`t_forest.png`·`t_path.png`·`t_river.png`·`t_bank.png`·`t_pier.png`·`t_walk.png`·`t_asphalt.png`로 둔다.

### 받은 뒤 순서 (12~20번)
1. 시트마다 `docs/art/sheets/`에 원본을 둔다(`stage-<id>.jpeg`, `ui-buttons13~16.jpeg`, `npc-sheet.jpeg`, `sprites-stage.jpeg`, `sheet-city.jpeg`, `textures-stage.png`).
2. 13~16번은 `tools/ui_buttons.py`의 `SPEC`에 위 줄을 적고 `python3 tools/ui_buttons.py`로 `assets/ui/`에 자른다. 12번·17번은 크기·표시를 정리하는 작은 도구를 새로 만든다.
3. 화면 연결(`renderStages`의 카드 그림·엠블럼, `VEH_IC`, `stageWarnings`, 설정 메뉴 아이콘 등)은 그림을 받은 뒤 한 번에 한다. 연결 전까지 게임은 지금의 코드 그림·이모지로 그대로 동작한다.
4. 18~20번은 받아도 게임을 바로 바꾸지 않는다: 슬라이스·등록(19번, 18번의 소품)은 자동으로 쓰이고, 차량·배·짐승(18번)과 질감(20번)은 코드 연결 뒤에 쓰인다.

### 받은 결과와 적용 현황 (12~17번 적용함, 18~20번은 받아 두기만 함)
GitHub `assets/UIimg/`에 올라온 파일을 `docs/art/sheets/`로 옮겨(`git mv`) 이름을 맞췄다: `12-1~12-4.jpeg` → `stage-rural·mount·sea·city.jpeg`, `13~16.jpeg` → `ui-buttons13~16.jpeg`, `17.jpeg` → `npc-sheet.jpeg`, `18.jpeg` → `sprites-stage.jpeg`, `19.jpeg` → `sheet-city.jpeg`, `20.png` → `textures-stage.png`.
- **12** 스테이지 카드 그림 4장(1584×672): 그대로 쓸 만하다. Gemini 별 표시(그림 오른쪽·아래에서 121·120px)를 `tools/gemini_mark.py`로 지우고 가로 1200px로 줄여 `assets/intro/stage_<id>.webp`(100KB 안팎)로 만든다(`python3 tools/stage_assets.py cards`). 카드 그림 + 오른쪽 위 엠블럼으로 쓴다(`stagePic`).
- **13·14·15** 아이콘 시트: 글자 없이 깨끗하게 나왔다. `tools/ui_buttons.py`의 `SPEC` 13~15번으로 26개를 잘랐다(`python3 tools/ui_buttons.py 13 14 15`). 그림자에 번진 마젠타(보랏빛)는 `DESPILL`로 회갈색 그림자로 바꾸고, 15번 시트의 별이 '이사 아이콘' 안으로 들어와 `STARFIX`로 지웠다.
- **16** 탭: **요청한 한 장이 아니라 탭 15개 전체 시트**로 나왔다('차량'은 3행 2열, 원래 '재정' 자리). '차량' 탭만 선택된 모양(바깥 크림색 띠)이라 `tools/stage_assets.py tab`이 띠를 깎아 다른 탭과 같은 평소 모양(256×79)으로 만들었다. 나머지 14개 탭은 쓰지 않는다.
- **17** 인물: **4명이 아니라 마을 사람 24명(6열×4행)** 시트로 나왔다(2행 2열은 빈칸). 요청한 네 명을 골랐다 — 이장님 1행 1열 · 사공 1행 2열 · 이웃 아주머니 1행 5열 · 이웃 아저씨 2행 1열 — `assets/portraits/icons/npc/npc_chief·boatman·neighbor_f·neighbor_m.png`(256×256). 나머지 20명은 여분(쓰지 않음).
- **18~20** (선택): `sprites-stage.jpeg`·`sheet-city.jpeg`·`textures-stage.png`가 올라와 있지만 아직 자르거나 게임에 연결하지 않았다.


## UI 디자인 추가 그림 (4차) — 남은 코드·이모지 UI를 Gemini 그림으로
12~20번을 적용한 뒤에도 화면에 **이모지나 코드로 그린 단순 아이콘**으로 남은 UI를 모았다(코드 조사: `js/panel.js`·`screens.js`·`roster.js`·`teams.js`·`entrance.js`·`status.js`·`weather.js`·`concerns.js`·`effects.js`). 모두 **글자 없는 아이콘 시트**라 한글이 깨질 일이 없고, 이름 글자는 지금처럼 CSS가 얹는다.
- 번호는 12~20번에 이어 **21~29번**. 한 시트에 한 번 요청하고, 프롬프트는 **코드 블록 통째로** 복사해 붙인다(공통 화풍·글자 금지 문장이 풀어 적혀 있다). 해상도 선택지가 있으면 2K 이상.
- 모든 시트는 마젠타(#FF00FF) 배경 + 맨 오른쪽 아래 구석 비움(Gemini 별 표시 자리). 아이콘에 분홍·보라 계열을 쓰지 않게 했다.
- 받은 시트는 `docs/art/sheets/ui-buttons21~29.jpeg`로 두고 `tools/ui_buttons.py`의 `SPEC`에 칸 이름을 적어 `assets/ui/`로 자른다(별 표시는 `gemini_mark.py`). 연결 전까지 게임은 지금의 이모지·코드 그림으로 그대로 동작한다.
- 시트가 격자 순서를 틀리게 그리면 그 시트만 다시 돌린다(격자가 클수록 순서를 덜 지킨다 — 5열 이하로 맞춰 두었다).

| 번호 | 무엇 | 개수 | 지금은 | 어디에 쓰나 |
|---|---|---|---|---|
| 21 | 건축 분류 타일 | 12 | 분류 대표 건물 캔버스·⚒ | 건축 › 분류 고르기 타일 |
| 22 | 건축 하위 묶음 칩 | 16 | 이모지 | 건축 목록 위 칩 |
| 23 | 현황 지표 5종 × 3상태 + 보상 | 17 | SVG 선 아이콘 | 현황·퀘스트 지표 줄 |
| 24 | 직원·봉사자 화면 동작 아이콘 | 14 | 이모지 | 근무지·교육·격려·승급·자동 배정 등 |
| 25 | 입구 모양 7 + 꾸미기 소품 6 | 13 | 이모지 | 입구 꾸미기 화면 |
| 26 | 성장 단계 휘장 17 + 갈래 3 | 20 | 글자·색 띠 | 성도·봉사자 카드 단계 배지 |
| 27 | 성도 고민 18종 + 결과 2 | 20 | 이모지 👍😔 | 고민 카드·결과 창 |
| 28 | 날씨 7 + 계절 4 | 11 | 글자 | 시계 옆 날씨·계절 표시 |
| 29 | 건물 카드·배치 모드 공용 버튼 | 12 | 글자·✓✕ | 선택 카드·짓기 모드 |

### 21) 건축 분류 타일 12개 (글자 없음)
건축 버튼을 누르면 뜨는 분류 고르기 타일이다(`panel.js` `btiles`). 지금은 분류의 첫 건물 그림을 줄여 쓰고 철거만 ⚒다. 분류 이름은 CSS가 아래에 얹으니 그림만 받는다. 타일 하나는 둥근 사각형이고 분류마다 테두리 색이 다르면 한눈에 구분된다.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 12 category tiles (each about 256x256 px rounded square with a colored rim) in a 5-column by 3-row grid on a magenta background, reading left to right, top to bottom, with the last 3 cells of row 3 left empty magenta.
Cells: (1) worship: a small white chapel with a cross, rim sky blue; (2) fellowship: two cups of tea and a plate of rice cakes on a table, rim warm orange; (3) small clubs: a soccer ball, a paintbrush and a music note together, rim leaf green; (4) shops: a small market stall with a striped awning and a rice-ball, rim coral red; (5) care: two hands holding a red heart, rim teal; (6) comfort facilities: a bench next to a toilet sign pictogram (a simple standing person silhouette, no letters), rim gray-blue;
(7) parking: a cute small car seen from the front with a plain blue square sign next to it (no letter P), rim slate gray; (8) paths and stairs: a cobblestone path with three stone steps going up, rim sand brown; (9) landscaping: a round tree, a flower bed and a small shrub, rim dark green; (10) decorations: a lantern, a flower pot and a small statue of a dove, rim butter yellow; (11) floor tiles: a patch of checkered floor tiles in cream and brown with a small trowel, rim terracotta;
(12) demolish: a friendly cartoon hammer with a small crack mark, rim coral red.
Cells 13, 14 and 15 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `tools/ui_buttons.py`의 `SPEC`에 `21: (5, 3, ['cat_worship','cat_fellow','cat_club','cat_shop','cat_care','cat_comfort','cat_park','cat_path','cat_garden','cat_deco','cat_floor','cat_dem'], 160)` 같은 줄을 적고 `btile`의 `catIcon` 자리에 `<img>`를 쓴다.

### 22) 건축 하위 묶음 칩 16개 (글자 없음)
건축 목록 위에 뜨는 작은 칩이다(`CAT_SUBS`, panel.js). 지금은 이모지(⚽🎨🎵⛪🙏🧸🫂🍽️🍙☕📚🤲💬🚻🪑🗑️). 아주 작게(약 36px) 쓰이니 **실루엣이 단순하고 굵은** 그림이어야 한다. 칩 하나는 동그란 단추.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 16 tiny round chip icons (each about 160x160 px circle, thick cream rim, very bold simple silhouette) in a 5-column by 4-row grid on a magenta background, reading left to right, top to bottom; the last 4 cells (row 4, columns 2 to 5) stay empty magenta.
Cells: (1) sports: a soccer ball; (2) hobbies: a paint palette with a brush; (3) music: a guitar with a music note; (4) worship service: a tiny church with a cross; (5) prayer and word: two praying hands over an open Bible; (6) departments for children: a teddy bear; (7) small groups: three friendly people sitting in a circle seen from above; (8) fellowship hall: a steaming bowl of rice with chopsticks; (9) food shop: a triangle rice-ball with a seaweed strip; (10) cafe: a coffee cup with steam; (11) bookstore: a stack of three books with a bookmark; (12) neighbor service: two hands giving a small box; (13) counseling and seniors: a speech bubble with a small heart next to a walking cane;
(14) restroom: a simple door with a standing-person pictogram (no letters); (15) rest area: a wooden bench with a small tree; (16) others: a trash can with a leaf.
Cells 17 to 20 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 22번 (5열×4행, 칸 이름 `sub_sport`·`sub_hobby`·`sub_music`·`sub_service`·`sub_pray`·`sub_dept`·`sub_group`·`sub_hall`·`sub_food`·`sub_cafe`·`sub_book`·`sub_neighbor`·`sub_mind`·`sub_toilet`·`sub_rest`·`sub_etc`) → `CAT_SUBS`의 이모지 자리를 `<img>`로 바꾼다.

### 23) 현황 지표 아이콘 5종 × 3상태 + 보상 (글자 없음)
현황 화면(`stscreen.js`)의 다섯 지표(영성·만족도·편의·신뢰도·사역 경험)는 지금 단색 SVG 선 아이콘이다(`status.js` `IND` ic). 평소 / 보상 받을 수 있음(금빛 테두리 + 작은 선물 리본) / 아직 잠김(회색) 세 가지를 받는다. 6열째에는 '보상 받기'용 큰 아이콘 둘.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 18 cells in a 6-column by 3-row grid on a magenta background, each cell a round badge about 192x192 px with a thick cream rim; the last cell (row 3, column 6) stays empty magenta.
Columns 1 to 5 show the five indicators, the same order in every row: (1) spirituality: a glowing white dove above an open Bible, base color sky blue; (2) satisfaction: a big smiling face with rosy cheeks, base color warm orange; (3) convenience: a comfy armchair with a small lamp and a tiny car key, base color teal green; (4) trust: a red heart held in a handshake of two hands, base color coral red; (5) ministry experience: a golden star on top of a small stack of three books, base color butter yellow.
Row 1 = normal state. Row 2 = reward ready state: the same five badges with a shining golden rim, tiny sparkles and a small gift box with a bow attached at the lower right corner. Row 3 = locked state: the same five badges in flat gray-beige with a small padlock at the lower right.
Column 6: row 1 = a round golden "claim reward" button showing an open gift box with coins flying out; row 2 = the same button after claiming: gray-beige with a white check mark; row 3 stays empty.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 23번(6열×3행, `ind_sp`·`ind_mood`·`ind_conv`·`ind_trust`·`ind_xp` + `_rdy`·`_lock`, `ind_claim`·`ind_claimed`). `IND[k].ic`의 SVG 대신 `<img>`.

### 24) 직원·봉사자 화면 동작 아이콘 14개 (글자 없음)
직원 화면(`roster.js`)·봉사자 화면(`screens.js`)·건물 카드(`managers.js`)의 즉시 버튼과 표시가 지금은 이모지(📍📖🎁🎓⚡⚙️👤📨🔒)다. 버튼 앞에 붙는 작은 그림이라 단순·굵게.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 14 small round icon buttons (each about 160x160 px, thick cream rim, bold simple pictogram) in a 5-column by 3-row grid on a magenta background, reading left to right, top to bottom; the last cell (row 3, column 5) stays empty magenta.
Cells: (1) assign workplace: a red map pin standing on a tiny building; (2) job training: an open book with a small pencil and a green upward arrow; (3) special encouragement: a gift box with a heart and a tiny sparkle; (4) promotion: a graduation cap with a small golden star and an upward arrow; (5) auto assign: a lightning bolt over three small person silhouettes; (6) auto place officers: a gear with a tiny person in the center; (7) manager: a friendly person bust with a small clipboard; (8) resume arrived: an envelope with a small flag and a tiny yellow star; (9) monthly pay: a stack of gold coins with a small calendar corner; (10) morale: a cheerful sun-faced smile; (11) training experience: a green droplet filling a small bottle; (12) affection level: a heart with a tiny crown; (13) dismiss: an open door with a small arrow leaving; (14) locked: a closed padlock.
Cell 15 stays empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 24번(5열×3행, `act_post`·`act_train`·`act_cheer`·`act_promo`·`act_auto`·`act_autosup`·`act_mgr`·`act_resume`·`act_pay`·`act_mood`·`act_xp`·`act_like`·`act_fire`·`act_lock`). roster.js·managers.js·teams.js의 이모지를 `<img class="aic">`로.

### 25) 입구 꾸미기 — 모양 7종 + 꾸미기 소품 6종 (글자 없음)
입구 화면(`entrance.js` `ENT_STYLES` 7종, `ENT_DECOS` 6종)의 선택 칩 그림이다. 지금은 이모지(🧱🏢🪨🛖🏛️🪟🌸 / 💡🚩🪴🏮🎈💐). 모양 칩은 **문 기둥 한 쌍을 정면에서 본 작은 그림**이고, 소품 칩은 그 소품 하나다. 칸마다 사각 타일.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 13 rounded-square tiles (each about 224x224 px, thick cream rim, pale warm-cream background inside the tile) in a 5-column by 3-row grid on a magenta background, reading left to right, top to bottom; the last 2 cells of row 3 stay empty magenta.
Row 1 and the first two cells of row 2 show seven church gate designs, each drawn as a pair of gate pillars with a small closed double door between them seen from the front, NO writing on any signboard: (1) red brick pillars with a brown wooden door; (2) smooth gray concrete pillars with a black metal door; (3) stacked rough gray stone pillars with a dark iron door; (4) warm log pillars with a small tiled roof lamp and a wooden door; (5) white marble pillars with gold bands and a gold gate; (6) dark steel frame with a clear glass door and a blue tint; (7) white pillars covered in a flower arch with pink-free colors: yellow, white and orange blossoms with green leaves.
Cells 8 to 13 show six small decorations, each as one object on the tile: (8) a string of warm golden light bulbs; (9) a rope of colorful triangle flags; (10) a pair of flower pots with red and yellow flowers; (11) a red paper lantern with a gold tassel; (12) a bunch of balloons in red, yellow, blue and green; (13) a thick garland of mixed flowers and leaves.
Cells 14 and 15 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 25번(5열×3행, `entr_brick`·`entr_concrete`·`entr_stone`·`entr_wood`·`entr_marble`·`entr_glass`·`entr_garden`·`deco_lights`·`deco_flags`·`deco_planter`·`deco_lantern`·`deco_balloon`·`deco_flower`). `ENT_STYLES`·`ENT_DECOS`의 `ic`를 그림 이름으로.

### 26) 성장 단계 휘장 17개 + 갈래 휘장 3개 (글자 없음)
성도·봉사자 카드의 단계 표시(`PP_TREE`, `p.node`)에 쓸 작은 휘장 메달이다. 단계가 올라갈수록 장식이 화려해지게(새가족은 소박한 새싹, 갈래 끝은 금장). 지금은 글자·색 띠로만 구분한다. 휘장 하나는 방패나 메달 모양이고 아래에 짧은 리본 꼬리(글자 없음).
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 20 small round medal badges (each about 192x192 px, thick cream rim, a short blank ribbon tail underneath with NO writing) in a 6-column by 4-row grid on a magenta background, reading left to right, top to bottom; the last 4 cells (row 4, columns 3 to 6) stay empty magenta.
Common trunk, plain bronze-to-silver medals: (1) new family: a small green sprout in a tiny pot; (2) baptized: a white dove above a drop of water; (3) nurture class completed: an open Bible with a small seedling growing from it; (4) disciple class completed: a lit candle on an open Bible, silver rim.
Officer branch, rim sky blue: (5) devoted member: a heart with a small cross; (6) deacon: a towel and a bowl of water with a small cross; (7) elder (male): a shepherd staff crossed with a Bible, gold rim; (8) female elder (gwonsa): a flower-wreath around a small cross and a Bible, gold rim.
Leader branch, rim leaf green: (9) small group leader: three small circles connected like a cluster; (10) community leader: five circles around a small house; (11) ministry coordinator: a clipboard with a small flag; (12) seminary student: a small graduation cap over a Bible; (13) associate pastor: a clerical-collar bust with a golden cross, gold rim.
Servant branch, rim warm orange: (14) servant: a towel over a hand; (15) team leader: a small banner flag on a pole; (16) department head: two flags crossed over a shield; (17) ministry staff: a golden key with a heart, gold rim.
Cells 18, 19 and 20 are the three branch emblems, larger and fancier: (18) officer branch: a golden shepherd staff with a blue shield; (19) leader branch: a green laurel wreath around a tiny lamp; (20) servant branch: an orange heart in two open hands with a tiny crown.
Cells 21 to 24 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 26번(6열×4행, `node_new`·`node_bapt`·`node_nurture`·`node_disciple`·`node_devoted`·`node_deacon`·`node_elder`·`node_elderf`·`node_sgl`·`node_cml`·`node_kanji`·`node_seminary`·`node_assoc`·`node_server`·`node_tlead`·`node_dlead`·`node_cstaff`·`br_off`·`br_lead`·`br_serv`). `stageCardHtml`·`ofBigHtml`의 단계 표시 옆에 `<img>`.

### 27) 성도 고민 18종 + 결과 2종 (글자 없음)
성도의 고민 카드·결과 창(`concerns.js` `CARES`, `careResHtml`)에 쓸 사건 아이콘이다. 지금은 아이콘 없이 제목만 있고 결과는 이모지(👍😔). 고민 종류는 직장·부부·자녀·병환·신앙 회의·봉사 지침·빚·외로움·중독·시험·노부모 간병·사별·육아 우울·주일 근무·청년·이사·예배당 이용·은퇴. **사람 얼굴 대신 상황을 상징하는 그림**으로 한다(심각한 소재(중독·사별 등)도 부드럽고 순하게, 무섭거나 자극적인 그림 금지).
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 20 square icon tiles (each about 192x192 px, thick cream rim, soft pastel tile background in a different calm color per tile) in a 6-column by 4-row grid on a magenta background, reading left to right, top to bottom; the last 4 cells (row 4, columns 3 to 6) stay empty magenta. All scenes are gentle and non-graphic, symbolic with small chibi figures, never scary.
Cells: (1) job loss: a small figure holding a cardboard box beside a briefcase; (2) marriage conflict: two small figures sitting back to back with a small crack-line heart between them; (3) children trouble: a small child with a backpack turning away from a school-bag; (4) family illness: a hospital bed with a thermometer and a small blanket; (5) doubts of faith: a small figure looking up at a cloudy sky with a swirl of clouds; (6) volunteer burnout: a small figure slumped beside a wilted flower and an empty watering can; (7) debt: a stack of coins with a heavy chain and a small bill; (8) loneliness: one small figure on a bench in the evening with an empty seat beside;
(9) addiction struggle: a small figure holding a cup that is chained to a small padlock (gentle, no drugs, no bottles drawn); (10) exam pressure: a student at a desk with a tall stack of books and a clock; (11) caring for aged parent: a younger figure helping an elderly figure with a cane; (12) bereavement: a small white chrysanthemum flower with a candle; (13) postpartum fatigue: a tired mother holding a baby with a small moon overhead;
(14) Sunday work: a small figure in a work uniform with a clock at the sunday-morning sun and a small closed church door; (15) young adult uncertainty: a figure standing at a fork in a road with two signposts (blank); (16) moving to a new place: a small moving truck with boxes and a house with a key; (17) accessibility problem: a wheelchair in front of a few stone steps; (18) retirement emptiness: an elderly figure beside an empty desk, a retirement flower and a clock.
Cell 19 = good result: a warm golden thumbs-up hand with a small heart. Cell 20 = bad result: a gray small downcast cloud with a drooping flower.
Cells 21 to 24 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 27번(6열×4행, `care_job`·`care_marriage`·`care_kids`·`care_health`·`care_doubt`·`care_burnout`·`care_debt`·`care_lonely`·`care_addiction`·`care_exam`·`care_caregiving`·`care_bereave`·`care_postpartum`·`care_sundaywork`·`care_youthjob`·`care_move`·`care_accessibility`·`care_retire`·`care_good`·`care_bad`). 고민 카드 제목 옆, 결과 창 위에 `<img>`.

### 28) 날씨 7종 + 계절 4종 (글자 없음)
시계 옆 날씨·계절 표시(`weather.js` `WEATHER`: 맑음·흐림·비·폭우·바람·눈·폭염, `WX_SEASON`: 봄·여름·가을·겨울, `hud.js`)다. 지금은 글자 위주라 작은 그림이 있으면 지도를 덜 가린다. 약 40px로 줄어 쓰이니 단순하게. 날씨는 작은 둥근 구름·해 모양 단추, 계절은 잎 모양 단추.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 11 small round icons (each about 160x160 px, thick cream rim, soft pastel sky-colored disc inside) in a 5-column by 3-row grid on a magenta background, reading left to right, top to bottom; the last 4 cells (row 3, columns 2 to 5) stay empty magenta.
Cells: (1) sunny: a big golden sun with rays; (2) cloudy: a fluffy gray-white cloud with a small patch of sun behind; (3) rain: a cloud with blue raindrops and a tiny umbrella; (4) heavy storm: a dark gray cloud with a bright yellow lightning bolt and heavy slanted rain; (5) windy: swirling wind lines with a flying leaf and a bending small tree; (6) snow: a cloud with white snowflakes and a tiny snowman; (7) heat wave: a hot orange sun with a thermometer and wavy heat lines;
(8) spring: a cherry-blossom branch drawn in white and soft yellow-orange (no pink) with fresh green leaves; (9) summer: a bright green leaf with a small watermelon slice; (10) autumn: a red-orange maple leaf with an acorn; (11) winter: a snowflake above a bare branch and a small red scarf.
Cells 12 to 15 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 28번(5열×3행, `wx_sun`·`wx_cloud`·`wx_rain`·`wx_storm`·`wx_wind`·`wx_snow`·`wx_heat`·`ssn_spring`·`ssn_summer`·`ssn_autumn`·`ssn_winter`). `hud.js` 날씨 표시와 `toast`에 `<img>`(작게, 지도를 가리지 않는 위치 유지).

### 29) 건물 카드·배치 모드 공용 버튼 12개 (글자 없음)
선택 카드(`selcard.js`)와 짓기·옮기기 모드(`place.js`)의 작은 동작 버튼이다. 지금은 ✓ ✕ 글자와 CSS 단추다. 짓기 모드에서 쓰이니 **✓와 ✕는 크고 또렷하게**. 12개 모두 동그란 단추.
```
ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it. Style: polished high-quality 2D anime-style illustration with a cozy, warm, friendly storybook feeling, the same look as the church-member portrait icons: clean confident dark-brown outlines, soft cel shading, gentle gradients, rounded chunky shapes, a thick cream-colored border around each button and a short soft drop shadow underneath. Palette: sage green, teal, butter yellow, warm cream, soft coral red for alerts. Each button is a rounded square (or circle where noted) about 256x256 px, icon centered with a clear silhouette that stays readable when shrunk to 48 px. Solid flat magenta (#FF00FF) background between buttons, no gradients, no watermark, no extra text outside the buttons. A sheet of 12 round icon buttons (each about 192x192 px, thick cream rim, bold simple pictogram) in a 5-column by 3-row grid on a magenta background, reading left to right, top to bottom; the last 3 cells of row 3 stay empty magenta.
Cells: (1) confirm: a big white check mark on a green disc; (2) cancel: a big white X on a coral red disc; (3) rotate: a curved arrow around a small cube; (4) undo: a curved arrow turning back on a butter-yellow disc; (5) demolish: a friendly hammer with a small crack on a coral red disc; (6) repair: a wrench and a small hammer crossed on a teal disc; (7) invest or level up: a green potion bottle with an upward arrow and a tiny star (the game fills it like a liquid gauge); (8) move building: a small house with four direction arrows; (9) info: a round blue disc with a white dot above a short white vertical bar, an information pictogram (no letters); (10) more options: three horizontal dots on a cream disc; (11) collapse: a small chevron arrow pointing up on a cream disc; (12) decorate: a small paintbrush with a sparkle.
Cells 13, 14 and 15 stay empty magenta.
Do not use pink, magenta, violet or rose colors anywhere on the icons (the background is magenta and must be removed cleanly); use only warm browns, creams, greens, teals, blues, golds, grays, tans and reds. Leave generous magenta space between cells. The very bottom-right corner of the image (about 8% of its width and height) must stay completely empty magenta.
Final reminder: ABSOLUTELY NO TEXT OF ANY KIND: no letters, no Hangul, no Latin characters, no numbers, no captions, no labels, no ribbons with writing, no signs, no watermark, no signatures, no logos. Pictograms only. If any writing would appear, remove it.
```
- 받은 뒤 연결: `SPEC` 29번(5열×3행, `btn_ok`·`btn_no`·`btn_rot`·`btn_undo`·`btn_dem`·`btn_fix`·`btn_invest`·`btn_move`·`btn_info`·`btn_more`·`btn_fold`·`btn_deco`). `place.js`의 ✓✕와 `selcard.js` 버튼 글자 앞에 `<img>`.

### 받은 뒤 순서 (21~29번)
1. 시트마다 `docs/art/sheets/ui-buttons21~29.jpeg`로 둔다.
2. `tools/ui_buttons.py`의 `SPEC`에 위 줄을 적고 `python3 tools/ui_buttons.py 21 22 …`로 자른다(마젠타 번짐은 `DESPILL`, 별 표시는 `STARFIX`).
3. 화면 연결(`catIcon`·`CAT_SUBS`·`IND.ic`·roster/teams/managers 이모지·`ENT_*`·`PP_TREE` 배지·`CARES`·`WEATHER`·place/selcard 버튼)은 시트를 다 받은 뒤 한 번에 한다. CLAUDE.md의 '화면을 가리지 않는다' 원칙에 따라 새 아이콘은 지금 자리의 크기를 유지한다.
4. 시트 원본의 출처(Gemini 생성)는 README 에셋 항목에 적는다.
5. (선택) 창 머리띠·카드 틀·게이지 같은 **틀 그림**은 늘려 쓰는 9-slice 처리가 필요해 Gemini보다 CSS가 낫다고 보고 프롬프트에서 뺐다. 필요하면 말해 달라.

### 적용 현황 (21~29번)
시트는 `docs/art/sheets/ui-buttons21~29`(21~24 jpeg, 25~29 png)이고 `python3 tools/ui_buttons.py 21 … 29`로 135개를 `assets/ui/`에 잘랐다(줄이 서로 닿은 시트는 같은 높이로 나눈다). **연결함:** 건축 분류 타일 `cat_*`·하위 칩 `sub_*`(panel.js) · 지표 `ind_*`(`indIcon`) · 날씨 `wx_*`(`wxIcon`) · 직원·섬김이·리더·건물 슬롯 동작 `act_*`(`aic()`, pixicons.js) · 단계 휘장 `node_*`(성도 단계 카드) · 고민 결과 `care_good/bad` · 짓기 모드 `btn_ok/no/undo`. **받아 두기만 함:** `ind_*_rdy/_lock/claim`, `entr_*`·`deco_*`(입구 카드는 실제 문을 그려 쓰므로 필요 없음), `br_*`, `care_<종류>` 18종, `ssn_*`, `btn_rot/dem/fix/invest/move/info/more/fold/deco`, `act_pay/mood/xp/like/fire/lock/resume`.
