#!/usr/bin/env python3
"""Gemini 스프라이트 시트를 칸마다 잘라 투명 PNG와 js/sprite-data.js를 만든다.

쓰는 법:  python3 tools/slice_sheet.py docs/art/sheets/decor-b.json docs/art/sheets/decor-c.json
          (시트를 여럿 주면 한 js/sprite-data.js로 합친다. 인자가 없으면 docs/art/sheets의 모든 시트)

manifest(JSON):
  sheet   시트 이미지 (manifest 기준 상대 경로)
  out     잘린 조각을 둘 폴더 (저장소 기준)
  scale   줄이는 비율 (0.5면 절반)
  cells   { "칸 번호(왼쪽 위 0부터 행 우선)": {id, fw, by, sway, glow} }
          fw   게임에서 그림 너비 (바닥 한 칸 너비 = 1)
          by   그림 밑변 위치 (0 = 칸 가운데, 1 = 칸 앞 꼭짓점). 바닥에 납작한 것은 1에 가깝게
          sway 바람에 흔들리는 정도 (나무 1, 꽃 .4, 없으면 0)
          back 앞모습 칸이면 짝인 뒷모습 조각의 id (뒷모습 칸도 따로 cells에 적는다)
          fl   앞면이 왼쪽 아래를 향하게 그려진 그림이면 1 (기본은 오른쪽 아래)
          glow 등불의 분홍빛 번짐까지 지우는 강한 배경 제거
          box  [x0,y0,x1,y1] 칸을 합쳐 그린 그림은 픽셀 범위를 직접 준다
          tex  바닥 질감 칸: 배경을 지우지 않고 size(기본 128)px 정사각형으로. k = 질감 한 장이 덮는 칸 수
  uniform 격자선이 고르지 않으면 true: 시트 크기를 칸 수로 똑같이 나눈다
  bgauto  배경이 바랜 분홍이면 true: 칸 가장자리 색도 배경으로 지운다

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


def ring_bg(c):
    """칸 가장자리 띠의 중간값 색. 배경이 바랜 분홍이어도 그 칸의 배경색을 잡는다."""
    ring = np.concatenate([c[:6].reshape(-1, 3), c[-6:].reshape(-1, 3), c[:, :6].reshape(-1, 3), c[:, -6:].reshape(-1, 3)])
    return np.median(ring, axis=0)


def key_mask(c, glow, auto=False):
    r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    bg = np.array([251, 0, 253])
    near = np.abs(c - bg).sum(axis=2) < 90
    if auto:
        m = ring_bg(c)
        if m[0] - m[1] > 60 and m[2] - m[1] > 30 and m[0] > 150:  # 가장자리가 마젠타·분홍 계열일 때만
            near |= np.abs(c - m).sum(axis=2) < 95
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


def process(manifest_path):
    """시트 하나를 잘라 조각을 저장하고 {id: 정보}를 돌려준다."""
    man = json.load(open(manifest_path))
    base = os.path.dirname(os.path.abspath(manifest_path))
    img = np.asarray(Image.open(os.path.join(base, man['sheet'])).convert('RGB')).astype(int)
    cols, rows = man.get('grid', [7, 7])
    if man.get('uniform'):
        # 격자선이 고르지 않은 시트: 크기를 칸 수로 똑같이 나눈다 (칸을 합친 그림은 cells의 box로 직접)
        H, W = img.shape[:2]
        ry = [(round(H * i / rows) + 3, round(H * (i + 1) / rows) - 3) for i in range(rows)]
        cx = [(round(W * i / cols) + 3, round(W * (i + 1) / cols) - 3) for i in range(cols)]
    else:
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
        if it.get('box'):
            x0, y0, x1, y1 = it['box']
        else:
            (y0, y1), (x0, x1) = ry[i // cols], cx[i % cols]
        c = img[y0 + inset:y1 - inset, x0 + inset:x1 - inset]
        if it.get('tex'):
            # 바닥 질감: 배경을 지우지 않고 정사각형 그대로 (게임이 마름모로 눌러 반복해 깐다)
            n = min(c.shape[0], c.shape[1])
            im = Image.fromarray(c[:n, :n].astype(np.uint8), 'RGB')
            sz = it.get('size', 128)
            im = im.resize((sz, sz), Image.LANCZOS)
            name = it['id'] + '.png'
            im.save(os.path.join(out_dir, name), optimize=True)
            data[it['id']] = {'src': man['out'] + '/' + name, 'w': sz, 'h': sz, 'tex': 1, 'k': it.get('k', 1)}
            print('%-12s 칸 %2d  질감 %d' % (it['id'], i, sz))
            continue
        alpha = ~key_mask(c, it.get('glow', False), man.get('bgauto', False))
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
        d = {'src': man['out'] + '/' + name, 'w': w, 'h': h,
             'fw': it.get('fw', 1), 'by': it.get('by', 0), 'sway': it.get('sway', 0)}
        if it.get('back'):
            d['back'] = it['back']  # 뒷모습 조각 id
        if it.get('fl'):
            d['fl'] = 1  # 앞면이 오른쪽 아래가 아니라 왼쪽 아래를 향하는 그림
        data[it['id']] = d
        print('%-12s 칸 %2d  %3dx%3d' % (it['id'], i, w, h))
    return data, man


def main(paths):
    data, mans = {}, []
    for p in paths:
        d, man = process(p)
        for k in d:
            if k in data:
                raise SystemExit('조각 id가 겹쳐요: ' + k)
        data.update(d)
        mans.append(os.path.relpath(p, ROOT))
    js = os.path.join(ROOT, 'js/sprite-data.js')
    with open(js, 'w') as f:
        f.write("'use strict';\n/* tools/slice_sheet.py가 만든 파일 — 손으로 고치지 말고 manifest(%s)를 고친 뒤 다시 만들 것 */\n"
                % ', '.join(mans))
        f.write('var SPR_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('},"', '},\n"') + ';\n')
    print('→', os.path.relpath(js, ROOT), len(data), '개')


if __name__ == '__main__':
    main(sys.argv[1:] or [os.path.join(ROOT, 'docs/art/sheets', n) for n in
                         ('decor-b.json', 'decor-c.json', 'sheet-D.json', 'sheet-E.json', 'sheet-F.json', 'sheet-G.json', 'sheet-H.json',
                          'sheet-E2.json', 'sheet-E3.json', 'sheet-E4.json')])
