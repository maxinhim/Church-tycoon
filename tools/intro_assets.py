#!/usr/bin/env python3
"""인트로 화면 그림 만들기 (Gemini로 만든 원본 두 장 → assets/intro/).

쓰는 법:  python3 tools/intro_assets.py

원본 (docs/art/sheets/):
  intro-bg.webp  마을 배경 (글자·단추 없음)
  intro-ui.webp  같은 배경 위에 'Church Tycoon' 로고와 'Tap to Start' 단추. 위쪽은 마젠타(#FF00FF)가 덮여 있다
만드는 것 (assets/intro/):
  intro_bg.webp    배경. 오른쪽 아래의 작은 별 모양 워터마크가 들어가지 않게 16:9로 잘라 낸다
  intro_logo.png   로고 (투명 바탕, 둘레 여백 없이)
  intro_btn.png    시작 단추 (투명 바탕, 둘레 여백 없이)

떼어 내는 법: UI 시트의 화소가 '배경 그림과 마젠타를 섞은 색'으로 설명되면 바탕이고(마젠타 띠·로고 둘레의 분홍 번짐),
그 선에서 멀리 떨어진 화소가 로고·단추다. 위쪽 마젠타 띠에서는 줄마다 마젠타가 덮인 정도(Trow)보다 덜 덮인 색은 바탕으로 치지 않는다
(하늘색과 비슷한 노란 글자가 뚫리지 않게). 덩어리를 골라 안쪽 구멍을 메우고, 가장자리는 한 겹 깎은 뒤 안쪽 색을 번지게 해
분홍 물이 남지 않게 한다. 단추는 짙은 갈색 바깥선 안쪽만 떼어 낸다 (둘레의 밝은 빛은 CSS로 다시 준다).
numpy와 Pillow만 쓴다."""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs/art/sheets')
OUT = os.path.join(ROOT, 'assets/intro')
MAG = np.array([255., 0., 255.])
LOGO_ROI = (500, 10, 1500, 480)     # x0, y0, x1, y1 (시트의 위쪽 절반)
BTN_ROI = (650, 830, 1350, 1104)    # 아래쪽 절반 (오른쪽 아래 워터마크는 x 1780부터라 들어가지 않는다)
BG_CROP = (0, 0, 1776, 999)         # 배경: 워터마크(오른쪽 아래)를 뺀 16:9


def label(mask):
    """8방향으로 이어진 덩어리에 번호를 붙인다 (줄마다 이어진 구간을 합치는 방식)."""
    H, W = mask.shape
    lab = np.zeros((H, W), np.int32)
    parent = [0]

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    prev = []
    for y in range(H):
        d = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        runs = []
        for s, e in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            l = 0
            for ps, pe, pl in prev:
                if ps < e + 1 and pe > s - 1:
                    r = find(pl)
                    if l == 0:
                        l = r
                    elif r != l:
                        parent[max(l, r)] = min(l, r)
                        l = min(l, r)
            if l == 0:
                parent.append(len(parent))
                l = len(parent) - 1
            runs.append((s, e, l))
            lab[y, s:e] = l
        prev = runs
    root = np.array([find(i) for i in range(len(parent))])
    return root[lab]


def mfilt(mask, size, mode):
    im = Image.fromarray(mask.astype(np.uint8) * 255)
    im = im.filter(ImageFilter.MaxFilter(size) if mode == 'max' else ImageFilter.MinFilter(size))
    return np.asarray(im) > 127


def fill_holes(mask, keep_open=None):
    """바깥과 이어지지 않은 빈 곳을 메운다. keep_open(참인 화소가 대부분인 구멍)은 그대로 둔다."""
    pad = np.pad(~mask, 1, constant_values=True)
    lab = label(pad)
    outside = lab[0, 0]
    holes = (lab != outside) & pad
    holes = holes[1:-1, 1:-1]
    out = mask | holes
    if keep_open is not None:
        hl = label(holes)
        for i in np.unique(hl[hl > 0]):
            m = hl == i
            if keep_open[m].mean() > .6:
                out[m] = False
    return out


def bleed(rgb, solid, steps=6):
    """가장자리 색 번지기: 불투명한 안쪽 색을 바깥으로 steps화소 퍼뜨려 반투명 화소의 바탕색 물을 없앤다."""
    rgb = rgb.copy()
    have = solid.copy()
    for _ in range(steps):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(have.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if not dy and not dx:
                    continue
                sh = np.roll(np.roll(have, dy, 0), dx, 1)
                acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * sh[..., None]
                cnt += sh
        new = (~have) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]
        have |= new
    return rgb


def blur3(a):
    """3×3 가우시안 흐림 (1 2 1)."""
    p = np.pad(a, 1, mode='edge')
    h = p[:, :-2] + 2 * p[:, 1:-1] + p[:, 2:]
    return (h[:-2] + 2 * h[1:-1] + h[2:]) / 16


def trim_save(rgb, alpha, path):
    ys, xs = np.where(alpha > 8)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = np.dstack([np.clip(rgb, 0, 255), alpha])[y0:y1, x0:x1].astype(np.uint8)
    Image.fromarray(out).save(path, optimize=True)
    return out.shape[1], out.shape[0]


def main():
    os.makedirs(OUT, exist_ok=True)
    bgim = Image.open(os.path.join(SRC, 'intro-bg.webp')).convert('RGB')
    bg = np.asarray(bgim).astype(float)
    ui = np.asarray(Image.open(os.path.join(SRC, 'intro-ui.webp')).convert('RGB')).astype(float)
    H, W, _ = ui.shape

    # 배경: 워터마크를 빼고 저장
    bgim.crop(BG_CROP).save(os.path.join(OUT, 'intro_bg.webp'), quality=86, method=6)

    # 화소마다: 배경 → 마젠타 선분에서 떨어진 거리 r. 줄마다 마젠타가 덮인 정도 Trow보다 덜 덮인 색은 바탕으로 치지 않는다
    v = MAG - bg
    w = ui - bg
    t = np.clip((w * v).sum(2) / np.maximum(1e-6, (v * v).sum(2)), 0, 1)
    side = np.concatenate([t[:, :400], t[:, W - 400:]], axis=1)
    trow = np.median(side, axis=1)
    k = 15
    trow = np.convolve(np.pad(trow, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='valid')
    tmin = np.clip(trow - .12, 0, 1)[:, None]
    t2 = np.maximum(t, tmin)
    r = np.sqrt(((ui - (bg + t2[..., None] * v)) ** 2).sum(2))
    r = blur3(r)
    near_mag = np.sqrt(((ui - MAG) ** 2).sum(2)) < 90
    lum = ui @ np.array([.299, .587, .114])
    mness = np.clip((np.minimum(ui[..., 0], ui[..., 2]) - ui[..., 1]) / 200, 0, 1)   # 마젠타 물이 든 정도

    # ---------- 로고 ----------
    x0, y0, x1, y1 = LOGO_ROI
    R = r[y0:y1, x0:x1]
    core = mfilt(mfilt(R > 40, 3, 'min'), 3, 'max')          # 가는 선 잡티는 지운다
    lab = label(core)
    ids, area = np.unique(lab[lab > 0], return_counts=True)
    main_id = ids[area.argmax()]
    my, mx = np.where(lab == main_id)
    keep = np.zeros_like(core)
    for i, a in zip(ids, area):
        m = lab == i
        if i == main_id:
            keep |= m
            continue
        cy, cx = np.where(m)
        near = cx.min() > mx.min() - 60 and cx.max() < mx.max() + 60 and cy.min() > my.min() - 60 and cy.max() < my.max() + 30
        if a >= 60 and near and R[m].mean() > 75:
            keep |= m                                         # 둘레의 작은 별·색종이 조각
    MN = mness[y0:y1, x0:x1]
    shape = fill_holes(keep, near_mag[y0:y1, x0:x1]) & ~(MN > .6)   # 조각 사이에 낀 마젠타는 뺀다
    inner = mfilt(shape, 5, 'min')                            # 두 겹 안쪽은 불투명
    band = mfilt(shape, 3, 'max')
    soft = np.minimum(np.clip((R - 24) / 34, 0, 1), np.clip(1 - (MN - .1) / .45, 0, 1))   # 분홍 물이 든 가장자리는 그만큼 투명하게
    alpha = np.where(inner, 1., np.where(band, soft, 0.))
    src = ui[y0:y1, x0:x1]
    rgb = bleed(src, inner)
    rgb = np.where((inner | (MN < .12))[..., None], src, rgb)   # 분홍 물이 든 화소는 안쪽 색으로 바꾼다
    a8 = (alpha * 255).astype(np.uint8)
    print('intro_logo.png', trim_save(rgb, a8, os.path.join(OUT, 'intro_logo.png')))

    # ---------- 시작 단추: 짙은 바깥선으로 둘러싸인 안쪽 ----------
    x0, y0, x1, y1 = BTN_ROI
    R = r[y0:y1, x0:x1]
    dark = (lum[y0:y1, x0:x1] < 135) & (R > 40)
    lab = label(mfilt(dark, 3, 'max'))
    ids, area = np.unique(lab[lab > 0], return_counts=True)
    ring = lab == ids[area.argmax()]
    shape = mfilt(fill_holes(ring), 3, 'min')                 # 바깥선 굵게 한 만큼 다시 깎는다
    shape = mfilt(mfilt(shape, 7, 'min'), 7, 'max')           # 바깥선에 붙은 가는 잡티 정리
    inner = mfilt(shape, 3, 'min')
    rgb = bleed(ui[y0:y1, x0:x1], inner, 4)
    rgb = np.where(inner[..., None], ui[y0:y1, x0:x1], rgb)
    a8 = np.asarray(Image.fromarray(shape.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(.8)))
    a8 = np.where(inner, 255, a8)
    print('intro_btn.png', trim_save(rgb, a8, os.path.join(OUT, 'intro_btn.png')))


if __name__ == '__main__':
    main()
