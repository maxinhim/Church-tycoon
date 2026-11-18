#!/usr/bin/env python3
"""스테이지 1~4 추가 그림(docs/art/gemini-prompts.md 12·16·17번)을 게임에 쓰는 조각으로 만든다.
  12) docs/art/sheets/stage-<id>.jpeg  → assets/intro/stage_<id>.webp   (가로 1200px, Gemini 별 표시 지움)
  16) docs/art/sheets/ui-buttons16.jpeg의 '차량' 탭(3행 2열) → assets/ui/tab_fleet.png
      Gemini가 이 탭만 '선택된 모양'(바깥 크림색 띠)으로 그려서, 그 띠를 깎아 다른 탭과 같은 평소 모양으로 만든다
  17) docs/art/sheets/npc-sheet.jpeg(6열×4행 마을 사람들) 가운데 쓸 네 명 → assets/portraits/icons/npc/npc_<이름>.png (256×256)
13~15번 아이콘 시트는 tools/ui_buttons.py. 사용: python3 tools/stage_assets.py [cards|tab|npc ...]  (없으면 모두)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemini_mark

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, 'docs/art/sheets')
STAGES = ['rural', 'mount', 'sea', 'city']
# npc-sheet.jpeg에서 쓸 사람: 이름 → (행, 열) (0부터). 나머지 20명은 쓰지 않는 여분이다
NPC = {'chief': (0, 0), 'boatman': (0, 1), 'neighbor_f': (0, 4), 'neighbor_m': (1, 0)}
NPC_GRID = (4, 6)   # 행, 열


def cards():
    out = os.path.join(ROOT, 'assets/intro')
    os.makedirs(out, exist_ok=True)
    for k in STAGES:
        a = np.array(Image.open(os.path.join(SHEETS, 'stage-%s.jpeg' % k)).convert('RGB'))
        a = gemini_mark.unblend(a)   # 오른쪽 아래 별 표시를 지운다
        im = Image.fromarray(a)
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        im.save(os.path.join(out, 'stage_%s.webp' % k), quality=84, method=6)
        print('카드', k, im.size, os.path.getsize(os.path.join(out, 'stage_%s.webp' % k)) // 1024, 'KB')


def _largest(mask):
    lab, n = ndi.label(mask)
    if n < 2:
        return mask
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    return lab == (int(np.argmax(sizes)) + 1)


def tab():
    im = np.array(Image.open(os.path.join(SHEETS, 'ui-buttons16.jpeg')).convert('RGB')).astype(np.float32)
    H, W = im.shape[:2]
    ch, cw = H / 5, W / 3
    y0, y1, x0, x1 = int(2 * ch) - 8, int(3 * ch) + 8, int(1 * cw), int(2 * cw)   # 3행 2열 = '차량'
    t = im[y0:y1, x0:x1]
    R, G, B = t[..., 0], t[..., 1], t[..., 2]
    a = 1 - np.clip((np.minimum(R, B) - G - 70) / 90, 0, 1)   # 마젠타 정도 → 알파
    body = ndi.binary_fill_holes(_largest(a > .5))
    # 어두운 갈색 겉선(이어진 고리)의 바깥 경계까지만 남긴다 → 그 바깥의 크림색 띠(두께 0~9px)가 사라진다
    lum = t.mean(axis=2)
    ring = _largest(ndi.binary_closing((lum < 125) & body, iterations=2))
    inner = ndi.binary_fill_holes(ring)
    if inner.sum() < .6 * body.sum():   # 겉선이 끊겨 안쪽을 못 채우면 균일하게 깎는다
        inner = _largest(ndi.distance_transform_edt(body) > 8.5)
    al = np.where(inner, 255, 0).astype(np.uint8)
    rgb = t.clip(0, 255).astype(np.uint8)
    ys, xs = np.where(inner)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    o = Image.fromarray(np.dstack([rgb, al])).crop(box)
    o = o.resize((256, round(o.height * 256 / o.width)), Image.LANCZOS)
    o.save(os.path.join(ROOT, 'assets/ui/tab_fleet.png'), optimize=True)
    print('탭 tab_fleet', o.size)


def npc():
    src = Image.open(os.path.join(SHEETS, 'npc-sheet.jpeg')).convert('RGB')
    rows, cols = NPC_GRID
    W, H = src.size
    cw, chh = W / cols, H / rows
    out = os.path.join(ROOT, 'assets/portraits/icons/npc')
    os.makedirs(out, exist_ok=True)
    INS, T0, T1, SZ = 4, 70, 160, 256   # tools/members_icons.py와 같은 기준
    arr = np.array(src).astype(np.float32)
    for name, (r, c) in NPC.items():
        t = arr[int(r * chh) + INS:int((r + 1) * chh) - INS, int(c * cw) + INS:int((c + 1) * cw) - INS]
        R, G, B = t[..., 0], t[..., 1], t[..., 2]
        m = np.minimum(R, B) - G
        a = 1 - np.clip((m - T0) / (T1 - T0), 0, 1)
        a = np.where(_largest(a > .5), a, 0)   # 가장 큰 덩어리(사람)만 남긴다
        fr = a < 1
        cap = G + T0 * .4   # 가장자리 분홍 물을 눌러 지운다
        R2 = np.where(fr, np.minimum(R, cap), R); B2 = np.where(fr, np.minimum(B, cap), B)
        o = Image.fromarray(np.dstack([R2, G, B2, a * 255]).clip(0, 255).astype(np.uint8))
        s = max(o.size)
        sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        sq.paste(o, ((s - o.width) // 2, s - o.height))
        sq = sq.resize((SZ, SZ), Image.LANCZOS)
        sq.save(os.path.join(out, 'npc_%s.png' % name), optimize=True)
        print('인물', name)


if __name__ == '__main__':
    todo = sys.argv[1:] or ['cards', 'tab', 'npc']
    for t in todo:
        {'cards': cards, 'tab': tab, 'npc': npc}[t]()
