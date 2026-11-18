#!/usr/bin/env python3
"""성도 아이콘 시트(마젠타 배경 6열×4행 = 24명)를 칸마다 잘라 assets/portraits/icons/members/ 에 저장한다.
윗 두 행 = 여성, 아래 두 행 = 남성 (열 = 나이대: 10대 → 70대). 칸 순서대로 member_f1~, member_m1~ 로 번호를 매긴다.
Gemini가 성별을 어긴 칸은 GENDER에 적어 바로잡는다(시트1의 2행 5열은 남성). Gemini 별 표시(마지막 칸 오른쪽 아래)는 지운다.
마젠타 정도(min(R,B)-G)를 알파로 바꾸고 가장자리 분홍은 눌러 지운 뒤, 가장 큰 덩어리만 남긴다(Gemini 별 표시 제거). 256×256 PNG.
사용: python3 tools/members_icons.py [시트.png ...]  (시트 여러 장이면 번호가 이어진다: 시트1 f1~11·m1~13, 시트2 f12~23·m14~25)"""
import sys, numpy as np
from PIL import Image
SRCS = sys.argv[1:] or ['assets/portraits/icons/members/member_sheet1.png', 'assets/portraits/icons/members/member_sheet2.png']
OUT = 'assets/portraits/icons/members/'
GENDER = {('member_sheet1', 1, 4): 'm'}   # (시트 이름, 행, 열) → 실제 성별 (그림을 보고 정한 것)
COLS, ROWS, INS, T0, T1, SZ = 6, 4, 6, 70, 160, 256

def largest(mask):
    h, w = mask.shape; seen = np.zeros_like(mask); best = None; bn = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]: continue
        st = [(y0, x0)]; seen[y0, x0] = 1; comp = []
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                yy, xx = y+dy, x+dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = 1; st.append((yy, xx))
        if len(comp) > bn: bn = len(comp); best = comp
    out = np.zeros_like(mask)
    for y, x in best: out[y, x] = 1
    return out

cnt = {'f': 0, 'm': 0}
for SRC in SRCS:
    import os; sid = os.path.splitext(os.path.basename(SRC))[0]
    im = np.array(Image.open(SRC).convert('RGB')).astype(np.float32)
    H, W = im.shape[:2]; cw, ch = W / COLS, H / ROWS
    for r in range(ROWS):
        for c in range(COLS):
            t = im[int(r*ch)+INS:int((r+1)*ch)-INS, int(c*cw)+INS:int((c+1)*cw)-INS]
            R, G, B = t[..., 0], t[..., 1], t[..., 2]
            m = np.minimum(R, B) - G
            a = 1 - np.clip((m - T0) / (T1 - T0), 0, 1)
            a = np.where(largest(a > .5) > 0, a, 0)
            fr = a < 1; cap = G + T0 * .4
            R2 = np.where(fr, np.minimum(R, cap), R); B2 = np.where(fr, np.minimum(B, cap), B)
            o = Image.fromarray(np.dstack([R2, G, B2, a * 255]).clip(0, 255).astype(np.uint8))
            s = max(o.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(o, ((s-o.width)//2, s-o.height))
            sq = sq.resize((SZ, SZ), Image.LANCZOS)
            if (r, c) == (ROWS-1, COLS-1):   # 별 표시: 오른쪽 아래 어두운 보라빛 조각을 지운다
                p = np.array(sq); yy, xx = np.mgrid[0:SZ, 0:SZ]
                box = (xx > SZ*.6) & (xx < SZ*.95) & (yy > SZ*.55) & (yy < SZ*.92) & ((p[..., 3] < 250) | (p[..., 2].astype(int) > p[..., 0].astype(int) - 5) | (p[..., 2].astype(int) > p[..., 1].astype(int) + 8))
                p[box, 3] = 0; sq = Image.fromarray(p)
            g = GENDER.get((sid, r, c), 'f' if r < 2 else 'm'); cnt[g] += 1
            name = g + str(cnt[g])
            sq.save(OUT + 'member_%s.png' % name, optimize=True)
    print('ok')
