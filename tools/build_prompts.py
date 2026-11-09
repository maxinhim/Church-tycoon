#!/usr/bin/env python3
"""모든 Gemini 이미지 시트 프롬프트를 한곳에서 만든다.

쓰는 법:  python3 tools/build_prompts.py
  → docs/art/sheet-prompts.md   (저장소에서 읽는 문서)
  → docs/art/gemini-prompts.html (모바일에서 복사하는 페이지)

모든 프롬프트는 같은 STYLE GUIDE 블록으로 시작한다. 화풍을 바꾸려면 여기 STYLE 하나만 고치고 다시 만든다.
시트 A~C는 이미 받아 쓰고 있으므로 여기에는 D부터 있다 (A~C는 gemini-prompts.md).
"""
import html
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- 공통 블록
STYLE = """STYLE GUIDE (identical for every sheet of this game)
- Theme: a warm, hopeful small neighborhood church campus on a sunny day. Cozy and wholesome, gentle charm, never gloomy, never silly.
- Architecture: Western style ONLY, like a small European or North American town: gable roofs with wooden shingles or slate, red brick, cream plaster, timber trim, arched windows, white wooden porches. NO East Asian architecture at all: no curved or upturned roof eaves, no dark clay roof tiles, no hanok, no pagoda, no temple shapes.
- Crisp late-1990s pixel art, like a cheerful classic park management simulation. Chunky visible pixels: each art pixel is about 3 to 4 image pixels.
- Clean 1-pixel outlines in very dark warm brown (#2b2522), not pure black. 3 to 4 flat shades per material, light dithering only on large surfaces, hard pixel edges, no blur, no gradients, no anti-aliasing halo, no glow, no light rays, no sparkles.
- Light always comes from the upper left: top faces brightest, left faces medium, right faces darkest.
- Palette anchors: cream plaster #efe8da, warm wood #a07a52 and #8a6a46, slate-blue church roofs #4f6db0, red brick #b9694c, light stone #c9c2b6, grass #7fae63 and #5c8a48, water #5fa3d0, warm gold #d1a02e, soft red #d65a4a, friendly blue #2a56c6, outline brown #2b2522. Saturated but natural, never neon.
- No text, letters, numbers, logos, brand marks or religious text anywhere. Every sign, screen, paper, book cover and banner is blank.
- Do not copy any existing game's graphics or characters.
- If a reference image is attached, match its pixel size, outline color, palette and lighting exactly."""

ISO = """PROJECTION (all world objects on this sheet)
- True 2:1 dimetric isometric projection: everything stands on ground tiles shaped like diamonds twice as wide as they are tall, seen by the same camera looking down from the south.
- Proportions, measured against the width W of one ground-tile diamond: one building storey is about 0.45 W tall, an adult person about 0.35 W tall, a large tree about 1 W tall. Footprints are given in tiles (for example 2x1 means two tiles long and one tile deep).
- Do NOT enlarge small objects to fill their cell; keep the shared scale.
- Draw only the object: no ground tile, no grass under it, no floor, no cast shadow (the game draws shadows)."""

def layout(cols, rows, empty_last=True, fill=False):
    n = cols * rows
    L = ["LAYOUT",
         "- Render at the largest resolution the tool offers (2K or 4K if selectable). Never output a smaller image. Keep the pixel art crisp at this size, and draw each object with as many pixels as possible.",
         "- Exactly %d columns x %d rows of equal square cells (%d cells total)." % (cols, rows, n),
         "- Cells are separated by straight 2-pixel pure black (#000000) grid lines, including a border around the whole sheet."]
    if fill:
        L.append("- Every used cell is filled completely, edge to edge, by its picture (no magenta inside used cells, no margin).")
    else:
        L += ["- The background of every cell is one flat solid magenta color (#FF00FF). No gradient, no texture, no ground, no shadow, no glow on the background.",
              "- Each cell contains exactly ONE picture, horizontally centered, resting slightly below the middle of the cell. It must fit inside the middle 75% of the cell width and height: keep at least 12% empty magenta margin on every side. Nothing may touch or cross a grid line, nothing may be cropped."]
    if empty_last:
        L.append("- The bottom-right cell (row %d, column %d) must stay completely empty: only flat magenta, no object, no shadow, no text. "
                 "(Gemini puts its watermark there.)" % (rows, cols))
    return "\n".join(L)

PAIR_H = """FRONT/BACK PAIRS
Some objects take TWO neighbouring cells in the same row: the LEFT cell is the FRONT VIEW and the RIGHT cell is the BACK VIEW of the very same object (one 3D model turned 180 degrees around its vertical axis: same shape, size, colors and position in the cell; only the side facing the camera changes).
- FRONT VIEW: the front (entrance, door, seat side, display side) faces the lower-right, toward the camera.
- BACK VIEW: the object is turned around, so its back faces the lower-right and the front is hidden.
- Buildings and long furniture run with their long side from the lower-left to the upper-right of the cell."""

PAIR_V = """FRONT/BACK PAIRS (vertical)
Pairs are stacked vertically: a cell in an odd row shows the FRONT VIEW and the cell DIRECTLY BELOW it shows the BACK VIEW of the very same object (one 3D model turned 180 degrees around its vertical axis: same shape, size, colors and position in the cell; only the side facing the camera changes).
- FRONT VIEW: the front (main entrance, door, display side) faces the lower-right, toward the camera.
- BACK VIEW: the object is turned around, so its back faces the lower-right and the front is hidden.
- Buildings run with their long side from the lower-left to the upper-right of the cell, with the main entrance on that long front side."""

ICON = """ICON STYLE (this sheet is NOT isometric)
- Flat front-view icons designed on a 24x24 pixel grid and scaled up cleanly, so they stay readable at 24 pixels.
- Bold simple silhouettes, the same 1-pixel outline brown (#2b2522), 2 to 3 flat shades, light from the upper left.
- Every icon is about the same visual weight and fills about 65% of its cell, centered."""

# ---------------------------------------------------------------- 시트
SHEETS = []

def sheet(key, title, grid, note, uses, body, empty_last=True, fill=False, iso=True, icon=False, pair=None):
    cols, rows = grid
    parts = ["Create a single square image: a sprite sheet for an isometric church-building management game. " + body[0], "", STYLE, ""]
    if iso:
        parts += [ISO, ""]
    if icon:
        parts += [ICON, ""]
    parts += [layout(cols, rows, empty_last, fill), ""]
    if pair == 'h':
        parts += [PAIR_H, ""]
    if pair == 'v':
        parts += [PAIR_V, ""]
    parts += ["CONTENTS (left to right, top to bottom)"] + body[1:]
    SHEETS.append({'key': key, 'title': title, 'grid': '%dx%d' % grid, 'note': note, 'uses': uses,
                   'prompt': "\n".join(parts).strip()})


sheet('D', '땅·바닥 질감', (4, 4),
      '잔디·도로·바닥 타일·물을 위에서 본 정사각형 질감으로 받는다. 게임이 마름모로 눌러 깔기 때문에 Gemini가 정확한 마름모를 그릴 필요가 없다 (이전 시트에서 물길이 계속 잘린 문제도 이 방식으로 피한다).',
      '잔디(바탕), 도로·주차 구역, 바닥 타일 6종, 돌길·나무 데크 윗면, 물길·연못 물, 눈 덮인 땅',
      ["It contains flat ground textures seen from directly above.",
       "Each used cell holds one square, perfectly seamless, tileable texture seen straight from above (orthographic top-down, no perspective, no lighting gradient, no border, no vignette). Its left edge must continue into its right edge and its top edge into its bottom edge.",
       "Row 1: short lawn grass; lawn grass with a few tiny white daisies and clover; dark grey asphalt road surface; slightly lighter asphalt parking surface.",
       "Row 2: grey concrete sidewalk slabs in a square grid; small grey interlocking paving blocks; warm red brick paving in a herringbone pattern; light beige gravel.",
       "Row 3: warm wooden deck planks running left to right; flat grey stepping stones set in grass; low pink moss phlox ground cover; beige irregular flagstone path.",
       "Row 4: calm blue water with small ripples; a row of grey cut-stone coping blocks; fresh snow on the ground; (empty)."],
      fill=True, iso=False)

sheet('E', '작은 건물 1x1·2x1 (앞·뒤)', (6, 6),
      '1칸·2칸 건물 15종의 앞·뒤 그림과 방향이 있는 꾸미기 몇 가지. 층을 올린 건물(2층 이상)은 아직 그림을 쌓을 수 없어 1층 그림만 쓰고 위층은 지금처럼 코드로 그린다.',
      '기도실·상담실·안내실·수유실·화장실·매점·성경공부방·의료 봉사실·유아방·구제창고·휴게실·카페·빵집·기독교 서점·새벽기도실, 종, 자전거 거치대, 쌍등 가로등, 십자가 첨탑',
      ["It contains small church buildings, each shown from the front and from the back.",
       "Rows 1 to 5 hold three FRONT/BACK pairs each (columns 1-2, 3-4, 5-6). Row 6 holds five single objects.",
       "Row 1: tiny prayer chapel, footprint 1x1, cream walls, small slate-blue gable roof, one arched window, a small plain cross on the ridge; small counseling cottage, 1x1, cream walls, teal door, curtained window, potted plant by the door; welcome information kiosk, 1x1, wide service window, blank sign board above, flat blue roof.",
       "Row 2: nursing room cottage, 1x1, soft pink and cream walls, rounded door, small round window; public restroom, 1x1, light stone walls, two doors, flat roof with a vent; snack kiosk, 1x1, yellow striped awning over a serving counter.",
       "Row 3: bible study classroom, 2x1, cream walls, slate-blue roof, a row of windows; volunteer clinic, 2x1, white walls, red roof trim, a plain awning over the door; nursery, 2x1, pastel yellow walls, round windows, a small fenced porch.",
       "Row 4: relief storehouse, 2x1, plain wooden walls, big sliding door, stacked boxes beside it; lounge, 2x1, cream walls, large glass windows, a small terrace with potted plants; cafe, 2x1, brown walls, striped awning, big windows, one small outdoor table.",
       "Row 5: bakery, 2x1, cream walls, orange awning, bread display window, small chimney; bookstore, 2x1, pale green and white walls, blue awning, books in the window; dawn prayer chapel, 2x1, deep blue walls, small warm yellow windows (no glow).",
       "Row 6 (singles, only the front view): bronze bell in a wooden frame seen from the front; the same bell frame seen from the back; metal bicycle rack; double-headed black street lamp; tall slender church cross tower on a stone base, about 2.5 W tall."],
      pair='h')

sheet('F', '중간 건물 2x2 (앞·뒤)', (5, 5),
      '2x2 건물 10종. 앞·뒤를 위아래 칸에 둔다(한 줄 5칸이라 좌우 쌍이 줄을 넘지 않게).',
      '작은 예배실·찬양실·청년부실·소그룹실·어린이부실·공부방·경로 쉼터·북카페·주차 타워·놀이터, 연못·정자·소형 주차장·분수 광장',
      ["It contains medium church buildings with a 2x2 footprint, each shown from the front and from the back.",
       "Rows 1-2 and rows 3-4 hold five vertical FRONT/BACK pairs each. Row 5 holds four single objects.",
       "Rows 1-2 (front on top, back below): small worship chapel, cream walls, slate-blue gable roof with a small cross on the ridge, arched double door; music room, cream walls, round rose window without any pattern of letters, small bell-shaped roof vent; youth hall, light grey walls with a bold orange stripe, flat roof, big glass door; small-group house, warm cream walls, wooden porch, two windows with curtains; children's hall, pastel yellow and sky blue walls, round windows, a little slide on the side.",
       "Rows 3-4 (front on top, back below): study house, cream walls, green roof, rows of windows, a bicycle by the wall; seniors' rest house, warm wood walls, a low shingled gable roof, a bench on the porch; book cafe, white walls, dark green awning, big shop windows with books and cups; parking tower, two levels of concrete decks with a ramp, open sides, a few cars inside; playground, a small play set with a slide, swings and sandbox inside a low fence.",
       "Row 5 (singles): round garden pond with lily pads and a stone rim, 2x2; white wooden gazebo with a shingled roof, 2x2; small parking lot with two empty painted spaces, 2x1, painted lines only, no ground texture outside the lines; fountain plaza with a round basin, 2x2; (empty)."],
      pair='v')

sheet('G', '큰 건물 3x2·3x3 (앞·뒤)', (4, 4),
      '3x2·3x3 건물 7종. 칸이 커서(2K에서 약 510px) 건물이 잘 보인다.',
      '예배당·선교관·친교실·식당·무료 급식소·나눔장터·야외 예배터, 주차장(3x2)',
      ["It contains large church buildings, each shown from the front and from the back.",
       "Rows 1-2 hold four vertical FRONT/BACK pairs; rows 3-4 hold three vertical pairs in columns 1 to 3 and one single object in row 3 column 4.",
       "Rows 1-2 (front on top, back below): main chapel, 3x2, cream walls, tall slate-blue gable roof, a bell tower with a cross over the entrance, tall arched windows; mission house, 3x2, red brick walls, white window frames, a flag pole with a blank flag; fellowship hall, 3x2, warm wood and cream walls, wide double doors, a long row of windows; dining hall, 3x2, cream walls, red tiled roof, a chimney, windows with checkered curtains.",
       "Rows 3-4, columns 1-3 (front on top, back below): community food bank, 3x2, light grey walls, a covered serving counter with trays, crates of vegetables; sharing market, 3x2, a row of three small striped market stalls with goods; outdoor worship stage, 3x3, a raised wooden stage with a simple cross frame and rows of benches in front.",
       "Row 3, column 4 (single): large parking lot, 3x2, painted white parking lines only, two parked cars; row 4, column 4: (empty)."],
      pair='v')

sheet('H', '가장 큰 건물과 교회 입구', (3, 3),
      '4x3 건물 두 개와 교회 입구 아치(닫힘·열림). 칸이 가장 크다(약 680px).',
      '체육관·대예배당, 교회 입구 아치 닫힘·열림, 행사 천막, 교회 표지석',
      ["It contains the largest buildings and the church entrance.",
       "Columns 1 and 2 hold vertical FRONT/BACK pairs in rows 1-2. Column 3 rows 1-2 hold two states of the same gate. Row 3 holds two singles.",
       "Column 1, rows 1-2 (front, back): multipurpose gym, 4x3, light grey walls, curved metal roof, big double doors, high windows.",
       "Column 2, rows 1-2 (front, back): grand sanctuary, 4x3, cream stone walls, tall slate-blue roof, a tall steeple with a cross, a wide staircase to the main doors, tall arched windows.",
       "Column 3: row 1, the church entrance gate arch, 1x1, two brick pillars with a curved slate-blue arch on top, wrought-iron double gate CLOSED with a small padlock; row 2, the same gate arch with the gate OPEN (both leaves swung inward).",
       "Row 3: white festival tent with an open front and folding tables, 2x2; church sign monument, a low stone wall with a blank bronze plate and flower beds, 2x1; (empty)."],
      pair='v')

sheet('I', '길·계단·다리·탈것', (5, 5),
      '차는 길이 방향으로 달려서 긴 쪽이 "\\"이다(앞이 오른쪽 아래). 계단도 낮은 쪽이 오른쪽 아래. 게임에서 좌우 뒤집어 나머지 방향을 만든다.',
      '도로의 차·버스·트럭, 철골 계단·나무 계단, 연결 다리, 높은 나무 데크, 도로 울타리·주차 구역 울타리, 가로등, 자전거·스쿠터, 낙엽 더미',
      ["It contains paths, stairs, bridges and vehicles.",
       "Vehicles and stairs are exceptions to the long-side rule: their long side runs from the upper-left to the lower-right, because their front is at one end. FRONT VIEW = the front end (headlights, or the low bottom step) points to the lower-right; BACK VIEW = the rear end (tail lights, or the top step) points to the lower-right.",
       "Rows 1-2 (front on top, back below): small red sedan; small blue sedan; white compact car; silver minivan; small yellow church minibus with blank sides.",
       "Rows 3-4, columns 1-3 (front on top, back below): steel staircase with grey metal stringers and wooden treads, climbing one storey; wooden deck staircase with simple rails, climbing one storey; small green delivery truck with a blank box.",
       "Row 3, column 4: covered sky bridge segment, one tile long, glass sides with a slate-blue roof, running lower-left to upper-right. Row 3, column 5: black wrought-iron roadside fence segment, one tile long.",
       "Row 4, column 4: raised wooden deck walkway segment on posts, one tile long. Row 4, column 5: low silver metal parking-area fence segment, one tile long.",
       "Row 5: tall roadside street lamp; parked bicycle; small parked scooter; pile of fallen autumn leaves; (empty)."],
      pair='v')

sheet('J', '방문자(사람)', (6, 6),
      '걷는 사람 6종 × 앞 걸음 2장·뒷 걸음 2장·우산 앞·우산 뒤. 좌우 뒤집어 네 방향을 만든다. 게임 화면에서 사람은 20px 남짓이라 아주 단순해야 한다. 맨 오른쪽 아래(여자아이 우산 뒤)는 비우므로 남자아이 그림을 대신 쓴다.',
      '방문자·성도 걷기, 비 오는 날 우산',
      ["It contains walking visitors of a church, small and simple.",
       "Each row is one person. The six columns are: 1 walking toward the lower-right (facing the camera), left foot forward; 2 the same, right foot forward; 3 walking away toward the upper-left (back to the camera), left foot forward; 4 the same, right foot forward; 5 walking toward the lower-right holding an open umbrella; 6 walking away toward the upper-left holding an open umbrella.",
       "Seen from the same camera as isometric buildings (looking down from the south at about 30 degrees), so the top of the head and shoulders are slightly visible.",
       "Every person is drawn at the same small scale, about 3 heads tall, simple and readable when shrunk to 20 pixels tall: clear silhouette, solid clothing colors, tiny face with two dot eyes. Same person, same clothes and same height in all six cells of a row.",
       "Row 1: young man in a light blue shirt and dark trousers.",
       "Row 2: young woman in a cream cardigan and a long green skirt.",
       "Row 3: grandmother with grey permed hair, a purple vest and a handbag.",
       "Row 4: grandfather in a brown jacket and a flat cap.",
       "Row 5: little boy in a yellow t-shirt and shorts with a small backpack.",
       "Row 6: little girl in a pink dress with pigtails (the last cell, row 6 column 6, stays empty)."],
      iso=False)

sheet('K', 'UI 아이콘', (7, 7),
      '버튼·메뉴·현황에 쓰는 아이콘 48개. 지금의 선 아이콘(SVG)을 이 그림으로 바꿔 화면 전체를 한 화풍으로 맞춘다. 화면에서는 24~32px로 쓴다.',
      '아래 버튼(건축·행사·현황), 지도 도구(돌리기·확대·축소·가운데), 설정·속도, ✓·✕·되돌리기·화살표, 자금·성도·평판·빚, 건축 분류 9종·철거, 날씨 7종, 잠금·경고·물음표, 문·대출·목표·축하·사역자',
      ["It contains user-interface icons.",
       "Row 1 (main buttons): small house with a plus sign (build); two people with a small star above (events and people); bar chart with three bars (status); gear (settings); pause symbol; play triangle; double triangle (fast forward).",
       "Row 2 (map tools and actions): curved arrow circling a small cube (rotate view); magnifying glass with a plus; magnifying glass with a minus; target crosshair (recenter); bold X (close or cancel); bold check mark (confirm); curved arrow turning back (undo).",
       "Row 3 (status values): small stack of gold coins (money); group of three people (members); gold star badge (reputation); cracked piggy bank (debt); blank calendar page (week); round clock without numbers (time); paper receipt with blank lines.",
       "Row 4 (build categories): small church with a cross (worship); two steaming cups (fellowship); shop front with a striped awning (shops); two hands holding a heart (care); soft armchair (comfort); curving stone path (paths); round green tree (garden).",
       "Row 5 (build categories and markers): street lamp and a little bench (decorations); checkered floor tile (floor); hammer breaking a brick (demolish); small car (parking); padlock (locked); exclamation mark in an orange circle (warning); question mark in a red circle (problem).",
       "Row 6 (weather): sun; white cloud; cloud with rain drops; dark cloud with a lightning bolt; wind swirl lines; snowflake; strong sun with heat waves.",
       "Row 7: arched church door (open the church); small bank building with columns (loans); flag on a little hill (goal); party popper with confetti (celebration); person holding a book (staff); simple triangle arrow pointing right (direction); (empty)."],
      iso=False, icon=True)

sheet('L', 'UI 틀·버튼', (4, 4),
      '창·카드·버튼·칩·알림 말풍선의 모양. 가운데가 단색이고 테두리 두께가 일정해야 9조각으로 늘려 쓸 수 있다. Gemini가 테두리를 고르게 못 그리면 이 시트는 색과 모양의 참고로만 쓰고 CSS로 똑같이 만든다.',
      '하단 패널(건축·행사·현황 창), 작은 카드(지은 것 카드·영수증·날씨), 버튼 5상태, 분류 칩, 둥근 버튼, 알림, 목표 진행 막대, 요일 칸, 제목 엠블럼',
      ["It contains user-interface frames and buttons in the same pixel style.",
       "Every element is drawn flat from the front (not isometric), centered in its cell. Borders have one even thickness all around, the four corners are identical, and the inside is ONE flat solid color with no texture, no text and no icon, so the element can be stretched as a nine-slice.",
       "Row 1: large window panel, cream #f6f1e6 inside, 3-pixel warm wood border #8a6a46 with a thin gold #d1a02e inner line and rounded pixel corners; small card, lighter cream inside, 2-pixel wood border; wide button, cream inside, wood border, a 2-pixel darker bottom edge so it looks raised; the same button pressed (no raised edge, slightly darker inside).",
       "Row 2: primary button, friendly blue #2a56c6 inside, darker blue border, raised; danger button, soft red #d65a4a inside, raised; disabled button, light grey inside, grey border, flat; small pill-shaped chip, light cream inside, thin wood border.",
       "Row 3: the same chip selected, blue inside; round floating button, cream circle with a wood border, raised; dark notification bubble, deep brown #2b2522 inside with a small pointer at the bottom center; empty progress bar track, long and thin, light inside.",
       "Row 4: the progress bar fill, gold #d1a02e, same height as the track; small rounded square day marker, cream; emblem: a small church with a sprouting seedling in front of a rising sun, no text; (empty)."],
      iso=False)

sheet('M', '행사·사역 그림', (5, 5),
      '행사 14개·사역팀 9개·축하 1개의 작은 장면 그림. 행사·사역자 패널의 카드와 목표 달성 카드에 쓴다. 장면이라 칸을 가득 채우고 배경도 그린다(마젠타 없음). 패널이 열렸을 때만 보이므로 화면을 가리지 않는다.',
      '행사 카드(노방전도·바자회·부활절·부흥회·성찬식·성탄·세례식·소그룹·수련회·심방·여름성경학교·연합 행사·봉사의 날·추수감사), 사역팀 카드 9개, 목표 축하',
      ["It contains small square scene illustrations for event and team cards.",
       "Each used cell is a complete small scene that fills the whole cell, with its own simple background (sky, lawn or a plain warm interior wall). Use a gentle three-quarter view. People are small and simple, about 3 heads tall, friendly, no detailed faces.",
       "Row 1: volunteers handing blank flyers to neighbors on a street corner; a church bazaar with tables of goods under a tent; an Easter sunrise service outdoors with white lilies; a crowded revival meeting in a warm chapel; a communion table with bread and a cup.",
       "Row 2: a Christmas service with candles and a decorated tree; a baptism at a small indoor pool; a small group sitting in a circle of chairs with tea; a youth retreat with tents in green mountains; a pastor visiting a home, holding a fruit basket at the door.",
       "Row 3: children making crafts at a summer bible school under a tent; several churches together at an outdoor festival; volunteers cleaning a neighborhood street; a thanksgiving altar with fruits, rice sheaves and pumpkins; a maintenance team with a ladder and a toolbox.",
       "Row 4: a teacher with children at a blank whiteboard; a volunteer helping an elderly woman walk; a media team with a camera and a laptop with a blank screen; greeters welcoming a newcomer at the church door; a globe next to a packed suitcase (missions).",
       "Row 5: two volunteers waving to neighbors from a church tent (outreach team); folded hands beside a candle (prayer team); a worship band with a guitar, a keyboard and a microphone; confetti and balloons over a small church (goal achieved); (empty)."],
      iso=False, fill=True)

sheet('N', '계절·행사 장식', (5, 5),
      '계절 행사(부활절·여름성경학교·추수감사·성탄)와 바자회 때 놓는 꾸미기 24개. 모두 앞뒤가 같은 한 장짜리.',
      '봄·여름·가을·겨울 장식, 바자회·축제 장식, 눈사람(지금은 코드로 그림)',
      ["It contains seasonal and festival decorations for a church garden, one object per cell.",
       "Row 1 (spring): white Easter lily planter; basket of painted Easter eggs on a small stand; wooden wagon full of spring flowers; arch of pastel balloons; low row of white paper candle lanterns on the ground (no glow).",
       "Row 2 (summer): blue and white camp tent for a summer bible school; small round inflatable kiddie pool with water; shaved-ice cart with a parasol; folding chairs stacked on a cart; outdoor speaker on a tripod stand.",
       "Row 3 (autumn): harvest display of pumpkins, rice sheaves and a fruit basket on a wooden cart; friendly scarecrow; pots of yellow and orange chrysanthemums; bare autumn tree with a few red leaves; hay bale with a pumpkin on top.",
       "Row 4 (winter): Christmas tree with ornaments and a star on top; snowy pine tree; small wooden nativity stable with a manger, simple statue figures and a star on the roof; wreath arch with red ribbons over a path, running lower-left to upper-right; pile of wrapped gift boxes.",
       "Row 5 (festival): snowman with a scarf and a hat; white bazaar tent with an open front and one table; string of colorful paper lanterns between two poles, running lower-left to upper-right; blank cloth banner between two poles, running lower-left to upper-right; (empty)."])

sheet('E2', '보충: 글자 없는 매장·안내실·첨탑', (4, 4),
      '시트 E·F에서 쓰지 못한 칸만 다시 받는다: 영어 간판이 그려진 매점·카페·빵집·서점·찬양실, 게시판처럼 나온 안내실, 분홍 번짐이 생긴 첨탑·쌍등 가로등. 지난번 문제(글자, 2x1이 정육면체로 그려짐, 불빛 번짐)를 막는 문장을 넣었다.',
      '매점·카페·빵집·기독교 서점·찬양실·안내실, 십자가 첨탑, 쌍등 가로등, 정자(서양식)',
      ["It contains a few small shops and church buildings, each shown from the front and from the back, plus three single objects.",
       "ABSOLUTELY NO LETTERS: shop signs, awnings and windows must not contain any letters or words in any language. A sign board may show only one tiny simple picture (a cup, a loaf of bread, a book or a music note) on a plain colored panel.",
       "FOOTPRINT: a 2x1 building is clearly twice as long as it is deep (its long front side is about twice its short side); do not draw it as a cube. A 1x1 building is a small square box. A 2x2 building is square and larger.",
       "Rows 1 to 3 hold two FRONT/BACK pairs each (columns 1-2 and 3-4). Row 4 holds two single objects.",
       "Row 1: snack kiosk, 1x1, wooden walls, yellow striped awning over a serving counter, a small sign with a cup picture; cafe, 2x1, brown walls, green striped awning, big windows, one small outdoor table, a sign with a cup picture.",
       "Row 2: bakery, 2x1, cream walls, orange awning, bread display window, small chimney, a sign with a bread picture; Christian bookstore, 2x1, pale green and white walls, blue awning, books in the window, a sign with a book picture.",
       "Row 3: music room, 2x2, cream walls, slate-blue roof, a round window, a sign with a music note picture, no instruments outside; welcome information kiosk, 1x1, a small closed booth with walls, a roof and a wide service window with a counter (NOT a notice board).",
       "Row 4 (singles): tall slender church cross tower, 1x1, brick and stone, about 2.5 W tall, plain stone cross on top with NO glow; double-headed black street lamp with pale yellow lamp glass and NO glow or light around it; white wooden Western garden gazebo, 2x2, octagonal, with a shingled roof and railings (not East Asian); (empty)."],
      pair='h')

sheet('E3', '보충: 서양식으로 다시 받는 건물', (3, 3),
      '시트 F·G에서 한옥처럼 나온 건물 4종(경로 쉼터·소그룹실·선교관·친교실)을 서양식으로 다시 받는다. 정자는 시트 E2의 빈칸에 넣었다. 받기 전까지 게임에서는 이 건물들을 코드 그림으로 그린다.',
      '경로 쉼터(2x2)·소그룹실(2x2)·선교관(3x2)·친교실(3x2)',
      ["It contains four Western-style church buildings, each shown from the front and from the back.",
       "IMPORTANT: every building is clearly Western (European / North American small town). No curved roof eaves, no dark clay tiles, nothing that looks like East Asian architecture.",
       "Columns 1, 2 and 3 of rows 1-2 hold three vertical FRONT/BACK pairs (front on top, back below). Row 3 holds one horizontal pair: front in column 1, back in column 2.",
       "Column 1, rows 1-2: seniors' rest house, footprint 2x2, warm cream clapboard walls, a low wooden-shingle gable roof, a wide white porch with a bench and two rocking chairs, flower boxes under the windows.",
       "Column 2, rows 1-2: small-group house, footprint 2x2, red brick cottage, slate-blue gable roof with a small chimney, a green front door with a little porch light (no glow), two curtained windows.",
       "Column 3, rows 1-2: mission house, footprint 3x2, two storeys, red brick walls, white window frames, a steep slate roof, a flag pole with a blank flag beside the door.",
       "Row 3, columns 1-2: fellowship hall, footprint 3x2, long cream-plaster building with timber trim, a wooden-shingle gable roof, wide double doors under a small gable, a long row of windows; column 1 is the front view, column 2 the back view. Row 3 column 3: (empty)."],
      pair='v')

sheet('E4', '보충: 간판 없는 빵집·서점', (3, 3),
      '시트 E·E2에서 두 번 다 영어 간판 글씨가 그려진 빵집·기독교 서점만 다시 받는다. 간판을 아예 빼고 진열창(빵·책)과 차양 색으로만 구분하게 했다. 시트 E2가 격자를 무시해서 격자 지시도 더 세게 넣었다.',
      '빵집(2x1)·기독교 서점(2x1)',
      ["It contains two small shops, each shown from the front and from the back.",
       "GRID: the image must be divided into exactly 3 columns and 3 rows of equal square cells, no more and no fewer. Only four cells are used; every other cell stays plain flat magenta.",
       "NO SIGNS AT ALL: no sign board, no plaque, no banner, no lettering, no logo, no numbers anywhere on or near the buildings. The shop type is shown ONLY by what is in its windows and by the awning color.",
       "FOOTPRINT: both shops are 2x1, clearly twice as long as they are deep (do not draw a cube). The long front side with the door faces the lower-right.",
       "Row 1: column 1 = FRONT view, column 2 = BACK view of a bakery: cream plaster walls with timber trim, a red-and-white striped awning, a big display window full of round loaves, baguettes and pastries on shelves, a small brick chimney, a flower box under the window. The back view shows a plain cream wall with one small window and a back door. Column 3 stays empty.",
       "Row 2: column 1 = FRONT view, column 2 = BACK view of a small Christian bookstore: red brick walls, a dark green awning, two display windows with neat rows of colorful book spines and a small wooden cross standing on a shelf, a wooden door with a glass pane. The back view shows a plain brick wall with one small window. Column 3 stays empty.",
       "Row 3: all three cells stay empty (the bottom-right cell must be plain magenta)."],
      pair='h')

sheet('W1', '고화질 시험: 작은 예배실·예배당 (2x2)', (2, 2),
      '핵심 건물인 예배당이 작은 칸(6×6, 1024px)에서 받아 확대하면 깨져 보여서, 한 장에 그림 3개만 담아 칸 하나를 약 1000px로 키운다. 결과가 좋으면 예배당 뒷모습·대예배당도 같은 방식으로 받는다.',
      '작은 예배실(처음부터 있는 건물, 2x2) 앞·뒤, 예배당(3x2) 앞',
      ["It contains only THREE large, highly detailed drawings of the main church buildings.",
       "GRID: exactly 2 columns x 2 rows of equal square cells, no more and no fewer. Each cell is very large, so draw each building big (about 70% of the cell width) with rich pixel detail: individual roof shingles, brick or plaster texture, window frames and panes, door panels, steps, trim and small flowers by the walls. Keep the same chunky pixel style and outline color as the reference image; more detail must come from more pixels, never from blur or soft painting.",
       "Do NOT add any other objects, extra views, people, signs or text. Only the three drawings listed below.",
       "Row 1, column 1: FRONT view of the small worship chapel, footprint 2x2: cream plaster walls, a steep slate-blue gable roof, a small plain white cross on the front of the ridge, a round window high on the front gable, an arched wooden double door with two stone steps, tall narrow arched side windows, a stone base.",
       "Row 1, column 2: BACK view of the same small worship chapel (turned 180 degrees): the same walls, roof and cross, the back gable with one small round window, no door.",
       "Row 2, column 1: FRONT view of the main chapel, footprint 3x2: red brick walls, a tall slate-blue gable roof, a white bell tower with a small spire and cross over the entrance, an arched wooden double door, tall arched windows along the long side, a stone base.",
       "Row 2, column 2: (empty)."],
      pair='h')

sheet('W2', '고화질: 예배당·대예배당 앞·뒤 (2x2)', (2, 2),
      '시트 W1 결과(작은 예배실·예배당)와 같은 방식. 예배당과 대예배당을 각각 앞·뒤 한 쌍으로, 네 칸을 모두 쓴다 (W1에서 빈 칸에 딴 그림이 끼어든 문제 때문). 같은 시트에서 앞·뒤를 함께 받으면 한 쌍이 서로 정확히 맞는다 (W1의 예배당 뒷모습은 따로 받아 예전 그림이 남아 있다). 오른쪽 아래 워터마크는 그림이 칸 가운데에 있으면 구석에 닿지 않는다.',
      '예배당(3x2) 앞·뒤, 대예배당(4x3) 앞·뒤',
      ["It contains exactly FOUR large, highly detailed drawings: two main church buildings, each shown from the front and from the back. Attach the previous sheet (the one with the cream chapel and the red brick chapel) as the style reference and match its pixel size, outline color, shading and level of detail exactly.",
       "GRID: exactly 2 columns x 2 rows of equal square cells, no more and no fewer. Every cell holds ONE building drawn big (about 70% of the cell width). Draw rich pixel detail: roof shingles or slate rows, brick or stone texture, window frames and panes, door panels, steps, trim and small flowers by the walls. More detail must come from more pixels, never from blur or soft painting.",
       "Use all four cells exactly as listed. Do NOT add any other objects, extra views, people, signs or text. Keep the lower-right corner of the bottom-right cell empty magenta (Gemini places its watermark there).",
       "ORIENTATION (same as the reference sheet): the building's roof ridge runs from the lower-left to the upper-right of the cell. The entrance is on the SHORT gable end that faces the lower-left; the long side wall faces the lower-right. The FRONT views show the entrance gable. The BACK views are the same building turned 180 degrees: the entrance is hidden and we see the plain rear gable end on the left and the opposite long wall on the right.",
       "Row 1, column 1: FRONT view of the main chapel, footprint 3x2: red brick walls, a tall slate-blue gable roof, a white bell tower with a dark pointed roof and a small cross rising from the roof near the entrance, a small gabled entrance porch with an arched wooden double door and stone steps, a round window high on the gable, tall arched windows with white frames along the long wall, a stone base.",
       "Row 1, column 2: BACK view of exactly the same main chapel (turned 180 degrees): the same red brick, slate roof, bell tower on the far part of the ridge, arched windows on the long wall, stone base. The rear gable end has a round window and no door and no porch.",
       "Row 2, column 1: FRONT view of the grand sanctuary, footprint 4x3 (much larger and taller than the main chapel): pale cream limestone walls with stone corner blocks, a steep slate-blue gable roof, a tall square bell tower with a pointed spire and a cross rising from the entrance gable, a big round rose window above a wide arched double door, a wide stone staircase of five steps, three tall pointed-arch windows (plain blue-grey glass, no pictures) along the long wall, buttresses between the windows, a stone base.",
       "Row 2, column 2: BACK view of exactly the same grand sanctuary (turned 180 degrees): the same limestone walls, slate roof, buttresses and windows; the rear gable end has a tall window and a smaller round window, no staircase and no main door; the bell tower stands at the far end."],
      empty_last=False, pair='h')

# ---------------------------------------------------------------- 문서
ORDER = [('W2', '고화질 — 예배당·대예배당 앞·뒤 한 쌍씩 (지금 먼저)'),
         ('W1', '고화질 시험 — 핵심 예배당을 2×2 큰 칸으로 (지금 먼저)'),
         ('E4', '보충 — 간판 없는 빵집·서점 (지금 먼저)'),
         ('E3', '보충 — 한옥처럼 나온 건물 4종을 서양식으로 (지금 먼저)'),
         ('E2', '보충 — 글자 없는 매장·안내실·첨탑과 서양식 정자'),
         ('K', 'UI 아이콘 — 버튼·메뉴가 가장 먼저 눈에 띄고, 지금 SVG 선 아이콘과 화풍 차이가 가장 크다'),
         ('L', 'UI 틀·버튼 — 아이콘과 함께 화면 전체 인상을 정한다'),
         ('D', '땅·바닥 질감 — 화면 면적이 가장 넓다'),
         ('E', '작은 건물'), ('F', '중간 건물'), ('G', '큰 건물'), ('H', '가장 큰 건물·입구'),
         ('J', '방문자 — 움직이는 그림이라 같은 사람끼리 어긋나지 않는지 먼저 한 장 시험'),
         ('I', '길·계단·탈것'), ('N', '계절 장식'), ('M', '행사·사역 그림')]


def build_md():
    out = ["# 이미지 시트 프롬프트 (전체)", "",
           "`python3 tools/build_prompts.py`로 만든 문서다. 손으로 고치지 말고 스크립트를 고친 뒤 다시 만든다.",
           "모바일에서는 `gemini-prompts.html`(게시된 프롬프트 페이지)에서 시트마다 복사 버튼으로 복사한다.", "",
           "## 디자인 콘셉트",
           "- **한 줄 요약**: 햇살 좋은 날 작고 따뜻한 동네 교회. 건물은 서양식(유럽·북미 작은 마을)으로만 통일하고 동양식 지붕·한옥은 쓰지 않는다. 1990년대 후반 아이소메트릭 픽셀아트, 따뜻한 갈색 윤곽선, 빛은 늘 왼쪽 위에서.",
           "- **모든 프롬프트는 같은 STYLE GUIDE 블록으로 시작한다** (화풍·윤곽선 색·빛·팔레트·금지 사항). 팔레트는 지금 게임의 건물 색과 UI 파란색(#2a56c6)을 그대로 썼다.",
           "- **참고 이미지를 함께 붙인다**: 시트 B 또는 C 이미지를 Gemini에 같이 첨부하면 픽셀 크기와 색이 훨씬 잘 맞는다 (STYLE GUIDE 마지막 줄이 그것을 따르라고 지시한다).",
           "- **글자는 그림에 넣지 않는다**: Gemini는 한글을 정확히 못 쓰고, 버튼 글씨는 바뀌기 때문에 모든 글자는 게임의 웹 글꼴로 쓴다. 제목도 엠블럼만 받고 글씨는 글꼴로 얹는다.",
           "- **방향**: 앞모습은 앞면이 오른쪽 아래, 뒷모습은 뒷면이 오른쪽 아래. 게임이 좌우 뒤집기로 네 방향을 만든다 (자세한 표는 `gemini-prompts.md`). 차·계단만 긴 쪽이 \"\\\\\".",
           "- **맨 오른쪽 아래 칸은 비운다** (Gemini 워터마크).",
           "- **해상도**: 모든 프롬프트는 \"가능한 가장 큰 해상도(2K 이상)로 만들라\"고 적는다. 프롬프트 문장으로는 픽셀 크기를 보장할 수 없다. 해상도는 도구 설정에서 고른다 (Google AI Studio에서 Nano Banana 계열의 이미지 크기 옵션을 확인하고, 앱에 옵션이 없으면 1K로 받는다). 칸 수를 줄이는 것이 화질에 더 큰 영향을 준다.", "",
           "## 받는 순서 (권장)"]
    for i, (k, why) in enumerate(ORDER, 1):
        out.append("%d. 시트 %s — %s" % (i, k, why))
    out += ["", "## 그림으로 바꾸지 않는 것",
            "- **칸 건물(예배실 칸 등)**: 이웃 칸과 이어 붙는 벽·지붕 모양이 16가지가 넘어 시트로 맞추기 어렵다. 지금처럼 코드로 그리고 색만 팔레트에 맞춘다.",
            "- **층 쌓기(2층 이상)**: 1층·중간층·지붕을 따로 받아야 쌓을 수 있는데, Gemini 그림은 층마다 크기가 조금씩 달라 이음새가 어긋난다. 1층 그림 위에 코드로 층을 얹는 방식을 먼저 써 본다.",
            "- **날씨 효과(비·눈·번개·무지개)·그림자·선택 표시**: 움직이고 투명해야 해서 코드로 그린다.",
            "- **글자·숫자**: 모두 웹 글꼴.", ""]
    for s in SHEETS:
        out += ["## 시트 %s — %s (%s)" % (s['key'], s['title'], s['grid']), "",
                "- **쓰는 곳**: " + s['uses'], "- **메모**: " + s['note'], "", "```", s['prompt'], "```", ""]
    return "\n".join(out)


def build_html():
    css = open(os.path.join(ROOT, 'tools', 'prompt_page.css')).read()
    secs = []
    for s in SHEETS:
        secs.append('''  <section class="box" id="s%(k)s" aria-labelledby="h%(k)s">
    <div class="head"><h2 id="h%(k)s">시트 %(k)s · %(t)s</h2><span class="tag">%(g)s</span></div>
    <p class="note"><b>쓰는 곳</b> %(u)s</p>
    <p class="note">%(n)s</p>
    <pre tabindex="0">%(p)s</pre>
    <button type="button" class="copy" data-copy>시트 %(k)s 프롬프트 복사</button>
  </section>''' % {'k': s['key'], 't': html.escape(s['title']), 'g': s['grid'], 'u': html.escape(s['uses']),
                   'n': html.escape(s['note']), 'p': html.escape(s['prompt'])})
    order = ''.join('<li><a href="#s%s">시트 %s</a> <span>%s</span></li>' % (k, k, html.escape(w)) for k, w in ORDER)
    return '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>이미지 시트 프롬프트</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
''' + css + '''</style>
<main>
  <header>
    <h1>이미지 시트 프롬프트</h1>
    <p class="lead">교회개척 타이쿤의 모든 그림을 한 화풍으로 맞추는 Gemini 프롬프트입니다. 모든 프롬프트가 같은 스타일 가이드로 시작합니다.</p>
  </header>
  <section class="box">
    <h2>쓰는 방법</h2>
    <ol class="steps">
      <li><span>시트마다 아래 <b>복사</b> 버튼을 누릅니다.</span></li>
      <li><span>Gemini에 붙여넣고, 이미 받은 <b>시트 B나 C 이미지를 함께 첨부</b>합니다. 화풍이 훨씬 잘 맞습니다.</span></li>
      <li><span>해상도는 <b>2K 이상</b>. 받은 이미지는 이 대화에 첨부해 주세요. 먼저 평가하고 쓸 칸만 잘라 넣습니다.</span></li>
    </ol>
  </section>
  <section class="box">
    <h2>받는 순서</h2>
    <ol class="order">''' + order + '''</ol>
  </section>
''' + "\n".join(secs) + '''
</main>
<div id="msg" role="status" aria-live="polite"></div>
<script>
(function(){
  var msg=document.getElementById('msg');
  document.querySelectorAll('[data-copy]').forEach(function(btn){
    var pre=btn.parentNode.querySelector('pre'),label=btn.textContent,t=0;
    function done(ok){
      clearTimeout(t);btn.classList.toggle('done',ok);
      btn.textContent=ok?'복사했어요 · Gemini에 붙여넣으세요':'길게 눌러 직접 복사하세요 (전체 선택됨)';
      msg.textContent=btn.textContent;t=setTimeout(function(){btn.classList.remove('done');btn.textContent=label;},3500);
    }
    function fallback(){
      var r=document.createRange();r.selectNodeContents(pre);var s=window.getSelection();s.removeAllRanges();s.addRange(r);
      var ok=false;try{ok=document.execCommand('copy');}catch(e){}done(ok);
    }
    btn.addEventListener('click',function(){
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(pre.textContent).then(function(){done(true);},fallback);
      else fallback();
    });
  });
})();
</script>
'''


if __name__ == '__main__':
    SHEETS.sort(key=lambda x: {'W2': 0, 'W1': 1, 'E4': 2, 'E3': 3, 'E2': 4}.get(x['key'], 2))  # 지금 받을 보충 시트를 맨 위에
    open(os.path.join(ROOT, 'docs/art/sheet-prompts.md'), 'w').write(build_md())
    open(os.path.join(ROOT, 'docs/art/gemini-prompts.html'), 'w').write(build_html())
    print('시트', len(SHEETS), '개:', ' '.join(s['key'] for s in SHEETS))
    for s in SHEETS:
        print(' ', s['key'], s['grid'], len(s['prompt']), '자')
