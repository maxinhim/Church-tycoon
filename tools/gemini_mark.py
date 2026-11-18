#!/usr/bin/env python3
"""Gemini가 생성한 그림 오른쪽 아래에 덧입히는 4갈래 별 표시(반투명 흰 별, 지름 약 56px)를 지운다.
별은 원래 그림 위에 흰색을 일정 비율(alpha)로 덧입힌 것이라(관측 = (1-a)·원본 + a·255) 그 비율 모양을 알면 덧입힌 만큼 되돌릴 수 있다.
주변 색으로 메우는 것보다 벽 윤곽선·질감이 그대로 살아난다.
- 별 위치: 그림 오른쪽·아래 가장자리에서 (STAR_DX, STAR_DY)px 안쪽 (그림 크기가 달라도 같다 — 1584×672·1376×768·1024×1024에서 확인)
- 비율 모양: tools/gemini_star_alpha.png (스테이지 그림 네 장으로 구한 것: python3 tools/gemini_mark.py --calibrate)
사용: tools/ui_buttons.py(아이콘 시트)·tools/stage_assets.py(스테이지 카드)가 unblend()를 가져다 쓴다.
점검: python3 tools/gemini_mark.py 그림.jpeg ...  → 별 자리가 얼마나 바뀌는지 출력"""
import os, sys
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ALPHA_PNG = os.path.join(HERE, 'gemini_star_alpha.png')
STAR_DX, STAR_DY = 121, 120   # 별 중심이 오른쪽·아래 가장자리에서 안쪽으로 들어온 거리(px)
HALF = 40                      # 비율 모양을 담는 정사각형의 반쪽 크기 (81×81)
R_STAR = 33                    # 별 반지름 (이 밖은 비율 0)


def _astroid_mask(h, w, cy, cx, r):
    yy, xx = np.mgrid[0:h, 0:w]
    return (np.abs(xx - cx) ** (2 / 3) + np.abs(yy - cy) ** (2 / 3)) <= r ** (2 / 3)


def _fill(rgb, mask):
    """mask 자리를 둘레 색에서 번지게 채운 그림(배경 추정용)"""
    out = rgb.astype(np.float32).copy()
    ring = ndi.binary_dilation(mask, iterations=4) & ~mask
    for c in range(3):
        ch = out[..., c]
        ch[mask] = ch[ring].mean()
        for _ in range(400):
            nb = (np.roll(ch, 1, 0) + np.roll(ch, -1, 0) + np.roll(ch, 1, 1) + np.roll(ch, -1, 1)) / 4
            ch[mask] = nb[mask]
    return out


def calibrate(paths):
    """별이 같은 자리에 들어간 그림 여러 장으로 별의 비율 모양을 구해 gemini_star_alpha.png로 저장한다."""
    est = []
    for p in paths:
        a = np.array(Image.open(p).convert('RGB')).astype(np.float32)
        H, W = a.shape[:2]
        cy, cx = H - STAR_DY, W - STAR_DX
        sub = a[cy - HALF:cy + HALF + 1, cx - HALF:cx + HALF + 1]
        m = _astroid_mask(sub.shape[0], sub.shape[1], HALF, HALF, R_STAR + 3)
        bg = _fill(sub, m)   # 별이 없었다면 이랬을 배경 (매끈하게 추정)
        est.append(np.clip((sub - bg) / np.maximum(255 - bg, 8), 0, 1).mean(axis=2))
    A = np.median(est, axis=0)
    # 별은 4방향·좌우 대칭이라 8가지 뒤집기·돌리기를 평균해 그림 질감이 섞인 잡음을 줄인다
    A = np.mean([np.rot90(f, k) for f in (A, A[:, ::-1]) for k in range(4)], axis=0)
    A = ndi.gaussian_filter(A, .7)
    A[~_astroid_mask(*A.shape, HALF, HALF, R_STAR)] = 0
    A = np.clip(A - .045, 0, None)   # 가장자리의 옅은 번짐은 빼 둔다 (남기면 별 둘레에 어두운 테두리가 생긴다)
    Image.fromarray((A * 255).round().astype(np.uint8)).save(ALPHA_PNG)
    return A


def alpha_map():
    return np.array(Image.open(ALPHA_PNG)).astype(np.float32) / 255


def unblend(rgb):
    """별을 덧입히기 전 색으로 되돌린 그림을 돌려준다. rgb: H×W×3 (uint8)"""
    out = rgb.astype(np.float32).copy()
    H, W = out.shape[:2]
    cy, cx = H - STAR_DY, W - STAR_DX
    A = alpha_map()[..., None]
    y0, y1, x0, x1 = cy - HALF, cy + HALF + 1, cx - HALF, cx + HALF + 1
    if y0 < 0 or x0 < 0 or y1 > H or x1 > W:
        return rgb
    sub = out[y0:y1, x0:x1]
    out[y0:y1, x0:x1] = (sub - 255 * A) / np.maximum(1 - A, .2)
    return np.clip(out, 0, 255).astype(np.uint8)


def remove_star(rgb, force=True):
    """ui_buttons.py가 부르는 이름 (위치가 고정이라 force는 쓰지 않는다). (그림, 위치)"""
    return unblend(rgb), (rgb.shape[0] - STAR_DY, rgb.shape[1] - STAR_DX)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--calibrate':
        A = calibrate(args[1:] or [os.path.join(os.path.dirname(HERE), 'docs/art/sheets/stage-%s.jpeg' % k) for k in ('rural', 'mount', 'sea', 'city')])
        print('저장', ALPHA_PNG, '최대 비율 %.2f, 별 넓이 %d px' % (A.max(), (A > 0).sum()))
    else:
        for p in args:
            a = np.array(Image.open(p).convert('RGB'))
            b = unblend(a)
            H, W = a.shape[:2]; cy, cx = H - STAR_DY, W - STAR_DX
            d = np.abs(b.astype(int) - a.astype(int))[cy - HALF:cy + HALF + 1, cx - HALF:cx + HALF + 1].mean()
            print(p, '→ 별 자리 평균 변화 %.1f' % d)
