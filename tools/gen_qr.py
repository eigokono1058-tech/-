#!/usr/bin/env python3
"""QRコード生成ツール — イベント用の名刺・スライド素材まで一括で出力する。

使い方:
    pip install segno            # 初回のみ
    python3 tools/gen_qr.py                       # profile-config.js の siteUrl を使う
    python3 tools/gen_qr.py --url https://example.com/
    python3 tools/gen_qr.py --url https://example.com/ --name "Eigo Kono"

出力 (assets/qr/):
    profile-qr.svg        サイト埋め込み用（ベクタ・背景透明）
    profile-qr.png        スライド貼り付け用（1080px・白背景）
    profile-qr-card.svg   名刺サイズ(91x55mm)の印刷用カード
    profile-qr-poster.svg A6(105x148mm)の掲示用ポスター（懇親会の机に置く用）

誤り訂正レベルは H (30%) 固定。印刷が汚れても、暗い会場でも読めるようにするため。
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / "assets" / "js" / "profile-config.js"
OUT_DIR = ROOT / "assets" / "qr"

DARK = "#0a0c12"
BRAND_1 = "#5b8cff"
BRAND_2 = "#2dd4bf"
PLACEHOLDER = "REPLACE_ME"


def read_config(key: str, default: str = "") -> str:
    """profile-config.js から文字列値を読む（単一情報源にするため）。"""
    if not CONFIG.exists():
        return default
    text = CONFIG.read_text(encoding="utf-8")
    m = re.search(r'^\s*%s:\s*"((?:[^"\\]|\\.)*)"' % re.escape(key), text, re.M)
    if not m:
        return default
    value = m.group(1).encode("utf-8").decode("unicode_escape")
    return default if PLACEHOLDER in value else value


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    )


def qr_path_data(matrix, scale: float, offset_x: float = 0.0, offset_y: float = 0.0) -> str:
    """暗モジュールを 1 本の path にまとめる（横方向にランレングス圧縮）。"""
    parts = []
    for row_idx, row in enumerate(matrix):
        col = 0
        width = len(row)
        while col < width:
            if row[col]:
                run = 1
                while col + run < width and row[col + run]:
                    run += 1
                x = offset_x + col * scale
                y = offset_y + row_idx * scale
                parts.append(
                    "M%.3f %.3fh%.3fv%.3fh-%.3fz" % (x, y, run * scale, scale, run * scale)
                )
                col += run
            else:
                col += 1
    return "".join(parts)


def build(url: str, name: str, name_ja: str, headline: str) -> None:
    try:
        import segno
    except ImportError:
        sys.exit("segno が見つかりません。`pip install segno` を実行してください。")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    qr = segno.make(url, error="h", mode="byte", boost_error=True)
    matrix = [list(row) for row in qr.matrix]
    n = len(matrix)
    print(f"URL      : {url}")
    print(f"version  : {qr.version} (error correction: H / 30%)  modules: {n}x{n}")

    # ---- 1. 埋め込み用SVG（背景透明・currentColor追従なしの濃色） -----------
    border = 4
    side = n + border * 2
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" '
        f'width="{side * 8}" height="{side * 8}" shape-rendering="crispEdges" '
        f'role="img" aria-label="QR code for {esc(url)}">'
        f'<rect width="{side}" height="{side}" fill="#ffffff"/>'
        f'<path fill="{DARK}" d="{qr_path_data(matrix, 1, border, border)}"/>'
        "</svg>\n"
    )
    (OUT_DIR / "profile-qr.svg").write_text(svg, encoding="utf-8")

    # ---- 2. スライド用PNG ---------------------------------------------------
    target = 1080
    scale = max(1, round(target / side))
    qr.save(OUT_DIR / "profile-qr.png", scale=scale, border=border, dark=DARK, light="#ffffff")

    # ---- 3. 名刺カード (91 x 55 mm) ----------------------------------------
    disp_name = name or name_ja or ""
    sub = name_ja if (name and name_ja) else ""
    card_qr = 38.0  # mm
    card = f"""<svg xmlns="http://www.w3.org/2000/svg" width="91mm" height="55mm" viewBox="0 0 91 55">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_1}"/><stop offset="1" stop-color="{BRAND_2}"/>
    </linearGradient>
  </defs>
  <rect width="91" height="55" fill="#ffffff"/>
  <rect x="0" y="0" width="91" height="1.6" fill="url(#g)"/>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="7" y="15" font-size="5.2" font-weight="700" fill="{DARK}">{esc(disp_name)}</text>
    <text x="7" y="21" font-size="3.1" fill="#5b6478">{esc(sub)}</text>
    <text x="7" y="31.5" font-size="2.7" fill="#5b6478">{esc(headline[:42])}</text>
    <text x="7" y="35.6" font-size="2.7" fill="#5b6478">{esc(headline[42:84])}</text>
    <text x="7" y="46" font-size="2.6" font-weight="700" fill="{BRAND_1}">SCAN &#8594; PROFILE / DEMO</text>
    <text x="7" y="50" font-size="2.3" fill="#8b93a5">{esc(url)}</text>
  </g>
  <g transform="translate({91 - card_qr - 7} {(55 - card_qr) / 2 + 0.8})">
    <rect x="-1.6" y="-1.6" width="{card_qr + 3.2}" height="{card_qr + 3.2}" rx="2" fill="#ffffff" stroke="#e2e6f0" stroke-width="0.3"/>
    <path fill="{DARK}" d="{qr_path_data(matrix, card_qr / n)}"/>
  </g>
</svg>
"""
    (OUT_DIR / "profile-qr-card.svg").write_text(card, encoding="utf-8")

    # ---- 4. 卓上ポスター A6 (105 x 148 mm) ----------------------------------
    p_qr = 74.0
    poster = f"""<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 105 148">
  <defs>
    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_1}"/><stop offset="1" stop-color="{BRAND_2}"/>
    </linearGradient>
  </defs>
  <rect width="105" height="148" fill="#ffffff"/>
  <rect x="0" y="0" width="105" height="3" fill="url(#pg)"/>
  <g font-family="Helvetica, Arial, sans-serif" text-anchor="middle">
    <text x="52.5" y="20" font-size="3.4" font-weight="700" fill="{BRAND_1}" letter-spacing="1.2">LAST METERS</text>
    <text x="52.5" y="31" font-size="7" font-weight="700" fill="{DARK}">{esc(disp_name)}</text>
    <text x="52.5" y="38.5" font-size="3.4" fill="#5b6478">{esc(sub)}</text>
    <g transform="translate({(105 - p_qr) / 2} 48)">
      <rect x="-3" y="-3" width="{p_qr + 6}" height="{p_qr + 6}" rx="4" fill="#ffffff" stroke="#e2e6f0" stroke-width="0.4"/>
      <path fill="{DARK}" d="{qr_path_data(matrix, p_qr / n)}"/>
    </g>
    <text x="52.5" y="136" font-size="4" font-weight="700" fill="{DARK}">カメラをかざしてください</text>
    <text x="52.5" y="142" font-size="2.8" fill="#8b93a5">{esc(url)}</text>
  </g>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="52.5" y="129" font-size="3" fill="#5b6478" text-anchor="middle">プロフィール · 動くデモ · 事業構想</text>
  </g>
</svg>
"""
    (OUT_DIR / "profile-qr-poster.svg").write_text(poster, encoding="utf-8")

    for f in ("profile-qr.svg", "profile-qr.png", "profile-qr-card.svg", "profile-qr-poster.svg"):
        p = OUT_DIR / f
        print(f"  wrote {p.relative_to(ROOT)}  ({p.stat().st_size:,} bytes)")


def main() -> None:
    ap = argparse.ArgumentParser(description="プロフィールサイト用のQRコードを生成する")
    ap.add_argument("--url", default=None, help="QRの遷移先（既定: profile-config.js の siteUrl）")
    ap.add_argument("--name", default=None, help="カードに載せる名前（既定: config の name）")
    ap.add_argument("--name-ja", default=None, help="カードに載せる日本語名（既定: config の nameJa）")
    ap.add_argument("--headline", default=None, help="カードの1行説明（既定: config の headline）")
    args = ap.parse_args()

    url = args.url or read_config("siteUrl")
    if not url:
        sys.exit("URLが決まっていません。--url で指定するか profile-config.js の siteUrl を設定してください。")

    build(
        url=url,
        name=args.name if args.name is not None else read_config("name"),
        name_ja=args.name_ja if args.name_ja is not None else read_config("nameJa"),
        headline=args.headline if args.headline is not None else read_config("headline"),
    )


if __name__ == "__main__":
    main()
