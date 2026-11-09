# 그래픽 생성 프롬프트 (Google Gemini)

여러 요소를 한 장에 격자로 그려 받고, 저장소 스크립트로 칸마다 잘라 쓴다.

## 원칙
- **기존 게임을 지목하지 않는다.** 프롬프트에 특정 게임 이름(롤러코스터 타이쿤 등)을 쓰지 않고, "1990년대 후반 아이소메트릭 픽셀아트 경영 게임"처럼 화풍만 설명한다 (CLAUDE.md: 기존 게임 그래픽 복사 금지).
- **배경은 단색 마젠타(#FF00FF).** Gemini는 투명 배경을 만들지 못한다. 마젠타를 지워 투명하게 만든다. 그래서 바닥 그림자·땅 타일은 그리지 않게 한다 (그림자는 게임 코드가 그린다).
- **칸 사이 검은 선 2px.** 칸이 조금 어긋나도 선을 찾아 정확히 자를 수 있다.
- **방향이 있는 것(울타리·벤치·물길)은 모두 같은 방향으로.** 긴 쪽이 칸의 왼쪽 아래 → 오른쪽 위로 가게 그리고, 다른 방향은 게임에서 좌우 뒤집어 쓴다.
- **크기 기준을 하나로.** 모든 요소가 같은 바닥 한 칸(가로:세로 = 2:1 마름모)에 서 있다고 알려 준다.
- 해상도 선택지가 있으면 **2K(2048×2048) 이상**을 고른다. 1024px이면 7×7 한 칸이 약 146px이라 작은 요소만 쓸 만하다.
- 격자가 클수록 요청한 순서를 덜 지킨다. 7×7은 시험용이고, 결과를 보고 6×6이나 5×5로 줄일지 정한다. 큰 건물은 4×4가 알맞다.

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

## 다음 시트 (시험 결과를 보고 조정)
- 시트 B — 조경·꾸미기 2: 계절 장식(성탄 트리 등), 화단 종류, 놀이 요소
- 시트 C — 2×2 이상 조경(연못·정자·퍼걸러·놀이터) 4×4
- 시트 D~ — 건물 4×4. 층을 쌓는 건물은 1층·중간층·지붕을 따로 받아야 쌓을 수 있다
