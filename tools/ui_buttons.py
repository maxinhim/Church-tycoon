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
SOFTKEY = (10,)   # 배경이 마젠타가 아니라 분홍(테두리 색과 가까움)인 시트: 더 예민하게 가른다
FABS = ['build', 'events', 'people', 'vol', 'staff']
# 시트 번호 → (행 수, 열 수, 칸 이름 목록(행 우선, None은 쓰지 않음), 가장 긴 변 px)
SPEC = {
  1: (3, 3, ['visit', 'gift', 'care_hot', None, None, None, 'visit_off', 'gift_off', 'care'], 300),
  2: (3, 5, ['fab_' + k for k in FABS] + ['fab_' + k + '_on' for k in FABS] + ['fab_' + k + '_lock' for k in FABS], 144),
  3: (2, 7, ['hud_rot', 'hud_eye', 'hud_gear', 'hud_menu', 'hud_pause', 'hud_x1', 'hud_x2', 'hud_x4', 'hud_x8', 'hud_music', 'hud_music_off', 'hud_sfx', 'hud_sfx_off', 'hud_close'], 96),
  4: (2, 3, ['alert', 'alert_glow', 'quest', 'level', 'care_sq_hot', 'care_sq'], 140),
  5: (1, 4, ['badge0', 'badge1', 'badge2', 'badge3'], 96),
  6: (2, 3, ['chip_money', 'chip_money_hi', 'chip_debt', 'chip_mem', 'chip_mem_hi', 'chip_mem3'], 96),
  7: (5, 3, ['tab_event', 'tab_pastor', 'tab_assoc', 'tab_vol', 'tab_all', 'tab_ind', 'tab_quest', 'tab_fin', 'tab_off', 'tab_lead', 'tab_serv', 'tab_hirestaff', 'tab_staff', 'tab_hire', 'tab_pool'], 256),
  8: (3, 5, ['ev_' + k for k in 'smallgroup bible creed training communion street bazaar service retreat revival easter vbs thanks christmas'.split()] + [None], 128),
  9: (3, 5, ['ev_' + k for k in 'pbook pstudy pmemo ppray psem pconf pdeg abook astudy amemo asem adeg minedu minfel'.split()], 128),
  10: (3, 4, ['ev_' + k for k in 'offvow offsem offret leadtea leadsch leadmt servtool servws servthx volpray volpic volfeast'.split()], 128),
  11: (3, 3, ['tm_' + k for k in 'evang praise care newcomer edu prayer admin media mission'.split()], 128),
}

def key(a, lo=70, hi=110):
    """배경(왼쪽 위 모서리 색)을 알파로. 반투명 가장자리는 배경색을 되돌려 뺀다"""
    rgb = a[..., :3].astype(float)
    bgc = np.median(rgb[4:40, 4:40].reshape(-1, 3), axis=0)
    d = np.sqrt(((rgb - bgc) ** 2).sum(-1))
    al = np.clip((d - lo) / hi, 0, 1)
    out = np.zeros(a.shape[:2] + (4,))
    m = al > 0.01
    for c, bg in enumerate(bgc):
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
        f = os.path.join(SHEETS, 'ui-buttons%d.jpeg' % n)
        if not os.path.exists(f): f = f[:-5] + '.png'
        im = Image.open(f).convert('RGB')
        if im.width > 1700: im = im.resize((1400, round(1400 * im.height / im.width)), Image.LANCZOS)   # 큰 시트는 줄여서 처리
        a = np.array(im)
        rgba = key(a, 18, 40) if n in SOFTKEY else key(a)
        fg = ndi.binary_opening(rgba[..., 3] > 90, iterations=3)
        rows = [r for r in runs(fg.sum(1) > 4, 10) if r[1] - r[0] > 40]
        if len(rows) != R: print('시트', n, '행', len(rows), '!=', R, rows); sys.exit(1)
        k = 0
        for (y0, y1) in rows:
            cols = [c for c in runs(fg[y0:y1].sum(0) > 4, 10) if c[1] - c[0] > 40]
            want = min(C, len(names) - k)   # 마지막 줄은 칸이 모자랄 수 있다
            if len(cols) != want and cols:   # 칸이 서로 닿아 있으면 가장 바깥 폭을 같은 폭으로 나눈다
                a0, a1 = cols[0][0], cols[-1][1]; w = (a1 - a0) / want
                cols = [(int(a0 + i * w), int(a0 + (i + 1) * w)) for i in range(want)]
            if len(cols) != want: print('시트', n, '열', len(cols), '!=', want, cols); sys.exit(1)
            for (x0, x1) in cols:
                nm = names[k]; k += 1
                if not nm: continue
                pad = 4
                sub = rgba[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad].copy()
                # 이웃 칸의 그림자 조각이 섞이면 가장 큰 덩어리(와 그 둘레의 빛·반짝이)만 남긴다
                lab, cnt = ndi.label(ndi.binary_opening(sub[..., 3] > 90, iterations=3))
                if cnt > 1:
                    big = np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, cnt + 1))) + 1
                    keep = ndi.binary_dilation(lab == big, iterations=7)
                    sub[..., 3] = np.where(keep, sub[..., 3], 0)
                # 배경색과 가까운 속 색(갈색·분홍)이 구멍으로 뚫리지 않게, 겉선 안쪽은 원래 색 그대로 불투명으로 채운다
                core = ndi.binary_closing(sub[..., 3] > 60, iterations=3)
                inner = ndi.binary_erosion(ndi.binary_fill_holes(core), iterations=4)
                orig = a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad][..., :3]
                sub[..., :3] = np.where(inner[..., None], orig, sub[..., :3])
                sub[..., 3] = np.where(inner, 255, sub[..., 3])
                cell = Image.fromarray(sub)
                # 이웃 칸의 가는 테두리 조각이 가장자리에 남으면 잘라 낸다(바깥 열·행의 불투명 화소가 가장 두꺼운 열의 30%보다 적을 때)
                al = np.array(cell)[..., 3] > 128
                cs, rs = al.sum(0), al.sum(1)
                xs = np.where(cs > 0.3 * cs.max())[0]; ys = np.where(rs > 0.3 * rs.max())[0]
                if len(xs) and len(ys) and not nm.startswith('tab_'):
                    cell = cell.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
                # 원형 아이콘인데 가로가 더 길면 이웃 테두리가 붙은 것: 높이만큼의 창을 불투명 화소가 가장 많은 자리에 둔다
                if nm.split('_')[0] in ('ev', 'tm', 'hud') and cell.width > 1.04 * cell.height:
                    al = (np.array(cell)[..., 3] > 128).sum(0); w = int(cell.height * 1.02)
                    sc = np.convolve(al, np.ones(w), 'valid'); x0c = int(np.argmax(sc))
                    cell = cell.crop((x0c, 0, min(cell.width, x0c + w), cell.height))
                bb = cell.getbbox()
                if bb: cell = cell.crop(bb)
                # 챙길 일 단추: 그림 오른쪽 위에 붙은 흰 숫자 방울(반쯤 잘린 것)은 지우고 둥근 판만 남긴다 — 숫자 배지는 CSS가 그린다
                if nm == 'alert':
                    arr = np.array(cell); al = arr[..., 3] > 128; H = al.shape[0]
                    wid = al[H // 2:].sum(1); r0 = H // 2 + int(np.argmax(wid))   # 아래 절반에서 가장 넓은 줄 = 판의 가운데 줄
                    xs = np.where(al[r0])[0]; cx = (xs[0] + xs[-1]) / 2; r = (xs[-1] - xs[0] + 1) / 2
                    cy = np.where(al.any(1))[0][-1] - r + 1
                    yy, xx = np.mgrid[:H, :al.shape[1]]
                    arr[..., 3] = np.where((xx - cx) ** 2 + (yy - cy) ** 2 <= (r + 1.5) ** 2, arr[..., 3], 0)
                    cell = Image.fromarray(arr); bb = cell.getbbox()
                    if bb: cell = cell.crop(bb)
                s = mx / max(cell.size)
                if s < 1: cell = cell.resize((round(cell.width * s), round(cell.height * s)), Image.LANCZOS)
                cell.save(os.path.join(OUT, nm + '.png'), optimize=True)
        print('시트', n, 'OK')

if __name__ == '__main__':
    main()
