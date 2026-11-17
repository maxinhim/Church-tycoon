#!/usr/bin/env python3
"""메인 화면 버튼 시트(docs/art/sheets/ui-buttons1~5.jpeg, Gemini 생성)를 칸마다 잘라 투명 PNG로 assets/ui/에 만든다.
마젠타(#FF00FF) 배경을 알파로 바꾸고(가장자리 분홍 물은 되돌려 뺀다), 칸 경계는 행·열 투영으로 찾는다. 실행: python3 tools/ui_buttons.py"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, 'docs/art/sheets')
OUT = os.path.join(ROOT, 'assets/ui')
FABS = ['build', 'events', 'people', 'vol', 'staff']
# 시트 번호 → (행 수, 열 수, 칸 이름 목록(행 우선, None은 쓰지 않음), 가장 긴 변 px)
SPEC = {
  1: (3, 3, ['visit', 'gift', 'care_hot', None, None, None, 'visit_off', 'gift_off', 'care'], 300),
  2: (3, 5, ['fab_' + k for k in FABS] + ['fab_' + k + '_on' for k in FABS] + ['fab_' + k + '_lock' for k in FABS], 144),
  3: (2, 7, ['hud_rot', 'hud_eye', 'hud_gear', 'hud_menu', 'hud_pause', 'hud_x1', 'hud_x2', 'hud_x4', 'hud_x8', 'hud_music', 'hud_music_off', 'hud_sfx', 'hud_sfx_off', 'hud_close'], 96),
  4: (2, 3, ['alert', 'alert_glow', 'quest', 'level', 'care_sq_hot', 'care_sq'], 140),
  5: (1, 4, ['badge0', 'badge1', 'badge2', 'badge3'], 96),
}

def key(a):
    """마젠타 배경을 알파로. 반투명 가장자리는 배경색을 되돌려 뺀다"""
    rgb = a[..., :3].astype(float)
    d = np.sqrt(((rgb - np.array([255, 0, 255.])) ** 2).sum(-1))
    al = np.clip((d - 70) / 110, 0, 1)
    out = np.zeros(a.shape[:2] + (4,))
    m = al > 0.01
    for c, bg in enumerate([255, 0, 255]):
        out[..., c] = np.where(m, np.clip((rgb[..., c] - (1 - al) * bg) / np.maximum(al, 0.05), 0, 255), 0)
    out[..., 3] = al * 255
    return out.astype(np.uint8)

def runs(v, gap=6):
    idx = np.where(v)[0]
    if not len(idx): return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap: out.append((s, p + 1)); s = i
        p = i
    out.append((s, p + 1)); return out

def main():
    os.makedirs(OUT, exist_ok=True)
    for n, (R, C, names, mx) in SPEC.items():
        im = Image.open(os.path.join(SHEETS, 'ui-buttons%d.jpeg' % n)).convert('RGB')
        a = np.array(im)
        rgba = key(a)
        fg = ndi.binary_opening(rgba[..., 3] > 90, iterations=3)
        rows = [r for r in runs(fg.sum(1) > 4, 10) if r[1] - r[0] > 40]
        if len(rows) != R: print('시트', n, '행', len(rows), '!=', R, rows); sys.exit(1)
        k = 0
        for (y0, y1) in rows:
            cols = [c for c in runs(fg[y0:y1].sum(0) > 4, 10) if c[1] - c[0] > 40]
            if len(cols) != C and cols:   # 칸이 서로 닿아 있으면 가장 바깥 폭을 같은 폭으로 나눈다
                a0, a1 = cols[0][0], cols[-1][1]; w = (a1 - a0) / C
                cols = [(int(a0 + i * w), int(a0 + (i + 1) * w)) for i in range(C)]
            if len(cols) != C: print('시트', n, '열', len(cols), '!=', C, cols); sys.exit(1)
            for (x0, x1) in cols:
                nm = names[k]; k += 1
                if not nm: continue
                pad = 14
                sub = rgba[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad].copy()
                # 이웃 칸의 그림자 조각이 섞이면 가장 큰 덩어리(와 그 둘레의 빛·반짝이)만 남긴다
                lab, cnt = ndi.label(ndi.binary_opening(sub[..., 3] > 90, iterations=3))
                if cnt > 1:
                    big = np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, cnt + 1))) + 1
                    keep = ndi.binary_dilation(lab == big, iterations=7)
                    sub[..., 3] = np.where(keep, sub[..., 3], 0)
                cell = Image.fromarray(sub)
                bb = cell.getbbox()
                if bb: cell = cell.crop(bb)
                s = mx / max(cell.size)
                if s < 1: cell = cell.resize((round(cell.width * s), round(cell.height * s)), Image.LANCZOS)
                cell.save(os.path.join(OUT, nm + '.png'), optimize=True)
        print('시트', n, 'OK')

if __name__ == '__main__':
    main()
