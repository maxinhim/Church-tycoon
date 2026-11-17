#!/usr/bin/env python3
"""청빙 초상화의 마젠타(#FF00FF) 배경을 투명하게 만들고 여백을 잘라 PNG로 저장한다.
사용: python3 tools/remove_magenta.py   (assets/portraits/hirecard/*/*.jpeg|png → 같은 이름 .png, 원본 jpeg는 지움)
JPEG 번짐을 위해 '마젠타 정도'(min(R,B)-G)를 부드럽게 알파로 바꾸고, 가장자리 분홍은 R·B를 G쪽으로 눌러 지운다.
T0 문턱을 높게 잡아 머리·옷의 분홍은 남긴다."""
import glob, os, sys
import numpy as np
from PIL import Image
T0, T1 = 60, 150      # 마젠타 정도가 T0 이하면 불투명, T1 이상이면 투명
def run(p):
    a = np.array(Image.open(p).convert('RGB')).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(R, B) - G
    near = m > T0
    bg = near.copy()
    alpha = np.where(bg, 1 - np.clip((m - T0) / (T1 - T0), 0, 1), 1.0)
    # 가장자리(반투명) 화소: 분홍 번짐 제거
    fr = bg & (alpha < 1)
    cap = G + T0 * .4
    R2 = np.where(fr, np.minimum(R, cap), R); B2 = np.where(fr, np.minimum(B, cap), B)
    out = np.dstack([R2, G, B2, alpha * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(out)
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bb)
    dst = os.path.splitext(p)[0] + '.png'
    im.save(dst, optimize=True)
    if dst != p: os.remove(p)
    print(dst, im.size)
for p in sorted(glob.glob('assets/portraits/hirecard/*/*.jpeg') + glob.glob('assets/portraits/hirecard/*/*.jpg')):
    run(p)
