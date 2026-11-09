#!/usr/bin/env python3
"""Gemini 스프라이트 시트를 칸마다 잘라 투명 PNG와 js/sprite-data.js를 만든다.

쓰는 법:  python3 tools/slice_sheet.py docs/art/sheets/decor-b.json

manifest(JSON):
  sheet   시트 이미지 (manifest 기준 상대 경로)
  out     잘린 조각을 둘 폴더 (저장소 기준)
  scale   줄이는 비율 (0.5면 절반)
  cells   { "칸 번호(왼쪽 위 0부터 행 우선)": {id, fw, by, sway, glow} }
          fw   게임에서 그림 너비 (바닥 한 칸 너비 = 1)
          by   그림 밑변 위치 (0 = 칸 가운데, 1 = 칸 앞 꼭짓점). 바닥에 납작한 것은 1에 가깝게
          sway 바람에 흔들리는 정도 (나무 1, 꽃 .4, 없으면 0)
          glow 등불의 분홍빛 번짐까지 지우는 강한 배경 제거

처리 순서: 검은 격자선 찾기 → 칸 안쪽만 잘라내기 → 마젠타 배경·그늘진 마젠타·(glow면) 분홍 번짐 지우기
→ 가장자리에 남은 분홍 테두리 1px 지우기 → 작은 부스러기 지우기 → 여백 자르기 → 미리 곱한 알파로 줄이기.
게임 코드는 여기서 만든 조각과 sprite-data.js만 읽는다 (시트 원본은 docs/art/sheets/).
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_lines(dark, axis, n):
    """격자선: 한 줄 전체의 60% 넘게 검은 줄. 붙어 있는 줄은 하나로 묶는다."""
    frac = dark.mean(axis=axis)
    idx = np.where(frac > 0.6)[0]
    groups = []
    for i in idx:
        if groups and i - groups[-1][-1] <= 2:
            groups[-1].append(i)
        else:
            groups.append([i])
    lines = [(g[0], g[-1]) for g in groups]
    if len(lines) != n + 1:
        raise SystemExit('격자선을 %d개 찾았어요 (%d개여야 해요). 시트를 확인하세요' % (len(lines), n + 1))
    return [(lines[i][1] + 1, lines[i + 1][0]) for i in range(n)]


def key_mask(c, glow):
    r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    bg = np.array([251, 0, 253])
    near = np.abs(c - bg).sum(axis=2) < 90
    shade = (g < 55) & (r > 100) & (b > 100) & (np.abs(r - b) < 90)  # 그늘진 마젠타
    k = near | shade
    if glow:
        m = np.minimum(r, b) - g
        k |= (m > 40) & (r > 140) & (b > 110) & (b > g)  # 등불 둘레 분홍 번짐 (노랑·주황 유리는 b가 낮아 남는다)
    return k


def shift(a, dy, dx):
    out = np.zeros_like(a)
    H, W = a.shape
    out[max(dy, 0):H + min(dy, 0), max(dx, 0):W + min(dx, 0)] = a[max(-dy, 0):H + min(-dy, 0), max(-dx, 0):W + min(-dx, 0)]
    return out


def defringe(c, alpha):
    """투명한 곳에 닿은 분홍 테두리 픽셀을 지운다."""
    r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    pink = (r - g > 50) & (b - g > 50)
    edge = np.zeros_like(alpha)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= ~shift(alpha, dy, dx)
    return alpha & ~(edge & pink)


def drop_specks(alpha, min_px=40):
    """작은 부스러기(연결 덩어리 min_px 미만)를 지운다."""
    H, W = alpha.shape
    seen = np.zeros_like(alpha)
    keep = alpha.copy()
    ys, xs = np.nonzero(alpha)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        comp = []
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and alpha[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(comp) < min_px:
            for y, x in comp:
                keep[y, x] = False
    return keep


def main(manifest_path):
    man = json.load(open(manifest_path))
    base = os.path.dirname(os.path.abspath(manifest_path))
    img = np.asarray(Image.open(os.path.join(base, man['sheet'])).convert('RGB')).astype(int)
    cols, rows = man.get('grid', [7, 7])
    dark = img.sum(axis=2) < 150
    ry = find_lines(dark, 1, rows)
    cx = find_lines(dark, 0, cols)
    out_dir = os.path.join(ROOT, man['out'])
    os.makedirs(out_dir, exist_ok=True)
    scale = man.get('scale', 0.5)
    inset = man.get('inset', 4)
    data = {}
    for key, it in sorted(man['cells'].items(), key=lambda kv: int(kv[0])):
        i = int(key)
        (y0, y1), (x0, x1) = ry[i // cols], cx[i % cols]
        c = img[y0 + inset:y1 - inset, x0 + inset:x1 - inset]
        alpha = ~key_mask(c, it.get('glow', False))
        alpha = defringe(c, alpha)
        alpha = drop_specks(alpha)
        ys, xs = np.nonzero(alpha)
        if not len(ys):
            raise SystemExit('%s: 칸 %d이 비어 있어요' % (it['id'], i))
        t, b_, l, r = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = np.dstack([c, alpha * 255]).astype(np.uint8)[t:b_, l:r]
        im = Image.fromarray(rgba, 'RGBA')
        w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        # 미리 곱한 알파로 줄여야 테두리에 배경색이 번지지 않는다
        im = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
        name = it['id'] + '.png'
        im.save(os.path.join(out_dir, name), optimize=True)
        data[it['id']] = {'src': man['out'] + '/' + name, 'w': w, 'h': h,
                          'fw': it.get('fw', 1), 'by': it.get('by', 0), 'sway': it.get('sway', 0)}
        print('%-12s 칸 %2d  %3dx%3d' % (it['id'], i, w, h))
    js = os.path.join(ROOT, man.get('js', 'js/sprite-data.js'))
    with open(js, 'w') as f:
        f.write("'use strict';\n/* tools/slice_sheet.py가 만든 파일 — 손으로 고치지 말고 manifest(%s)를 고친 뒤 다시 만들 것 */\n"
                % os.path.relpath(manifest_path, ROOT))
        f.write('var SPR_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('},"', '},\n"') + ';\n')
    print('→', os.path.relpath(js, ROOT), len(data), '개')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/art/sheets/decor-b.json'))
