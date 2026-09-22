#!/usr/bin/env python3
"""顔写真をサイトのトーンに合わせたアバターに整える。
Turn a photo into an avatar that matches the site's look.

証明写真（無地の背景）をそのまま載せると固い印象になるので、
背景を暗いグラデーションに置き換えて、わずかに寒色へ寄せる。

使い方 / Usage:
    pip install Pillow

    # 証明写真（青や白の無地背景）から作る
    python3 tools/make_avatar.py photo.jpg --replace-bg

    # 集合写真から自分だけを切り出す（数値は画像全体に対する割合 0〜1）
    #   left,top,width,height の順。まず --preview で位置を確かめる
    python3 tools/make_avatar.py group.jpg --crop 0.55,0.12,0.18,0.60 --preview
    python3 tools/make_avatar.py group.jpg --crop 0.55,0.12,0.18,0.60

出力 / Output:
    assets/img/me.jpg          サイト用（既定 640x640）
    assets/img/me-cutout.png   背景透過版（--replace-bg のときだけ）

そのあと assets/js/profile-config.js に  avatar: "assets/img/me.jpg"  を設定する。
"""

from __future__ import annotations

import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "img"

# サイトの背景色（site.css のダークテーマと同じ）
BG_CENTER = (20, 24, 35)
BG_EDGE = (10, 12, 18)


def load_pil():
    try:
        from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
    except ImportError:
        sys.exit("Pillow が見つかりません。`pip install Pillow` を実行してください。")
    return Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


def parse_crop(text: str):
    parts = [p.strip() for p in text.split(",")]
    if len(parts) != 4:
        sys.exit("--crop は left,top,width,height の4つの割合で指定してください（例: 0.55,0.12,0.18,0.60）")
    try:
        vals = [float(p) for p in parts]
    except ValueError:
        sys.exit("--crop の値は数値で指定してください")
    if any(v < 0 for v in vals) or vals[2] <= 0 or vals[3] <= 0:
        sys.exit("--crop の値が不正です")
    return vals


def radial_bg(Image, ImageDraw, size: int):
    """中心が少し明るい暗いグラデーションを作る（小さく作って拡大する）"""
    small = 64
    grad = Image.new("RGB", (small, small), BG_EDGE)
    draw = ImageDraw.Draw(grad)
    steps = 28
    for i in range(steps, 0, -1):
        f = i / steps
        r = int(small * 0.72 * f)
        t = 1.0 - f
        color = tuple(
            int(BG_EDGE[c] + (BG_CENTER[c] - BG_EDGE[c]) * t) for c in range(3)
        )
        draw.ellipse(
            [small / 2 - r, small / 2 - r * 1.05, small / 2 + r, small / 2 + r * 1.05],
            fill=color,
        )
    return grad.resize((size, size), Image.LANCZOS)


def build_mask(Image, ImageChops, ImageFilter, img, bg_color, low, high, feather):
    """背景色からの距離でマスクを作る（人物=255 / 背景=0）。

    グレースケール変換だと白いシャツと明るい背景の差が潰れるので、
    RGB各チャンネルの差の最大値を使う。
    """
    solid = Image.new("RGB", img.size, bg_color)
    diff = ImageChops.difference(img, solid)
    r, g, b = diff.split()
    d = ImageChops.lighter(ImageChops.lighter(r, g), b)
    span = max(1, high - low)
    mask = d.point(lambda v: 0 if v <= low else (255 if v >= high else int((v - low) * 255 / span)))
    # 髪の輪郭に背景色が残らないよう、わずかに内側へ寄せてからぼかす
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    return mask


def estimate_bg(img, sample=12):
    """四隅を平均して背景色を推定する"""
    w, h = img.size
    boxes = [
        (0, 0, sample, sample),
        (w - sample, 0, w, sample),
        (0, h - sample, sample, h),
        (w - sample, h - sample, w, h),
    ]
    totals = [0, 0, 0]
    count = 0
    for box in boxes:
        region = img.crop(box).resize((1, 1))
        px = region.getpixel((0, 0))
        for c in range(3):
            totals[c] += px[c]
        count += 1
    return tuple(t // count for t in totals)


def cool_grade(Image, ImageEnhance, img):
    """ほんのり寒色に寄せる。肌の色が破綻しない範囲にとどめる。"""
    r, g, b = img.split()
    r = r.point(lambda v: max(0, min(255, int(v * 0.97))))
    b = b.point(lambda v: max(0, min(255, int(v * 1.05 + 4))))
    out = Image.merge("RGB", (r, g, b))
    out = ImageEnhance.Contrast(out).enhance(1.07)
    return out


def vignette(Image, ImageDraw, ImageFilter, img):
    size = img.size[0]
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    pad = int(size * 0.02)
    d.ellipse([-pad, -pad, size + pad, size + pad], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(size * 0.10))
    dark = Image.new("RGB", img.size, BG_EDGE)
    return Image.composite(img, dark, m)


def main() -> None:
    Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter = load_pil()

    ap = argparse.ArgumentParser(description="写真をサイト用のアバターに整える")
    ap.add_argument("source", help="元の写真（jpg / png / webp）")
    ap.add_argument("--crop", default=None,
                    help="切り出す範囲を割合で指定: left,top,width,height（例 0.55,0.12,0.18,0.60）")
    ap.add_argument("--replace-bg", action="store_true",
                    help="無地の背景を暗いグラデーションに置き換える（証明写真向け）")
    ap.add_argument("--size", type=int, default=640, help="出力の一辺（既定 640px）")
    ap.add_argument("--face-top", type=float, default=0.42,
                    help="正方形に切るときの縦位置（0=上寄せ, 0.5=中央。既定 0.42 で顔が上に来る）")
    ap.add_argument("--low", type=int, default=26, help="背景判定のしきい値（下）")
    ap.add_argument("--high", type=int, default=64, help="背景判定のしきい値（上）")
    ap.add_argument("--feather", type=float, default=1.1, help="輪郭のぼかし量")
    ap.add_argument("--preview", action="store_true",
                    help="切り出し範囲の確認用に、加工前の切り出し結果だけを書き出す")
    ap.add_argument("--no-grade", action="store_true", help="色調の補正をしない")
    args = ap.parse_args()

    src = pathlib.Path(args.source)
    if not src.exists():
        sys.exit(f"ファイルが見つかりません: {src}")

    img = Image.open(src).convert("RGB")
    print(f"input    : {src.name}  {img.size[0]}x{img.size[1]}")

    # ---- 1. 指定範囲を切り出す --------------------------------------------
    if args.crop:
        l, t, w, h = parse_crop(args.crop)
        W, H = img.size
        box = (int(l * W), int(t * H), int((l + w) * W), int((t + h) * H))
        box = (max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3]))
        if box[2] <= box[0] or box[3] <= box[1]:
            sys.exit("--crop の範囲が画像の外です")
        img = img.crop(box)
        print(f"cropped  : {img.size[0]}x{img.size[1]}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.preview:
        p = OUT_DIR / "me-preview.jpg"
        img.save(p, quality=92)
        print(f"  wrote {p.relative_to(ROOT)}  ← 範囲を確認して、よければ --preview を外して再実行")
        return

    # ---- 2. 正方形に整える（顔が上に来るように） ---------------------------
    w, h = img.size
    side = min(w, h)
    cx = w // 2
    top = int((h - side) * args.face_top) if h > side else 0
    img = img.crop((max(0, cx - side // 2), top, max(0, cx - side // 2) + side, top + side))
    img = img.resize((args.size, args.size), Image.LANCZOS)

    # ---- 3. 背景を置き換える ----------------------------------------------
    if args.replace_bg:
        bg_color = estimate_bg(img)
        print(f"bg color : rgb{bg_color}（四隅から推定）")
        mask = build_mask(Image, ImageChops, ImageFilter, img, bg_color, args.low, args.high, args.feather)
        cutout = img.copy()
        cutout.putalpha(mask)
        cut_path = OUT_DIR / "me-cutout.png"
        cutout.save(cut_path)
        print(f"  wrote {cut_path.relative_to(ROOT)}  （背景透過版）")
        img = Image.composite(img, radial_bg(Image, ImageDraw, args.size), mask)

    # ---- 4. 色調とビネット -------------------------------------------------
    if not args.no_grade:
        img = cool_grade(Image, ImageEnhance, img)
    img = vignette(Image, ImageDraw, ImageFilter, img)

    out = OUT_DIR / "me.jpg"
    img.save(out, quality=90, optimize=True)
    print(f"  wrote {out.relative_to(ROOT)}  {args.size}x{args.size}  ({out.stat().st_size:,} bytes)")
    print("\n次の1行を assets/js/profile-config.js に設定してください:")
    print('    avatar: "assets/img/me.jpg",')


if __name__ == "__main__":
    main()
