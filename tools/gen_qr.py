#!/usr/bin/env python3
"""QRコード生成ツール — イベント用の名刺・スライド素材まで一括で出力する。
QR code generator — also renders print-ready business cards and table posters.

使い方 / Usage:
    pip install segno                          # 初回のみ / first time only
    python3 tools/gen_qr.py                    # profile-config.js の siteUrl を使う
    python3 tools/gen_qr.py --url https://example.com/
    python3 tools/gen_qr.py --name "Eigo Kono"

出力 / Output (assets/qr/):
    profile-qr.svg           サイト埋め込み用（ベクタ）
    profile-qr.png           スライド貼り付け用（1080px）
    profile-qr-card.svg      名刺サイズ(91x55mm) 日本語
    profile-qr-card-en.svg   名刺サイズ(91x55mm) 英語
    profile-qr-poster.svg    A6(105x148mm) 日本語
    profile-qr-poster-en.svg A6(105x148mm) 英語

誤り訂正レベルは H (30%) 固定。クワイエットゾーンは規格どおり4モジュール確保する。
印刷が汚れても、暗い会場でも読めるようにするため。
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
FONT = "Helvetica, Arial, 'Hiragino Sans', 'Noto Sans JP', sans-serif"

STRINGS = {
    "ja": {
        "scan": "SCAN &#8594; PROFILE / DEMO",
        "hold": "カメラをかざしてください",
        "menu": "プロフィール · 動くデモ · 事業構想",
        "noname": "氏名未設定",
    },
    "en": {
        "scan": "SCAN &#8594; PROFILE / DEMO",
        "hold": "Point your camera here",
        "menu": "Profile · Live demo · Business plan",
        "noname": "Name not set",
    },
}


def unescape_js(s: str) -> str:
    """JSの文字列エスケープだけを戻す（unicode_escape は日本語を壊すので使わない）。"""
    return s.replace('\\"', '"').replace("\\n", "\n").replace("\\/", "/").replace("\\\\", "\\")


def read_config(key: str, lang: str = "ja", default: str = "") -> str:
    """profile-config.js から値を読む（情報源を一つにするため）。

    `key: "文字列"` と `key: { ja: "...", en: "..." }` の両方に対応する。
    """
    if not CONFIG.exists():
        return default
    text = CONFIG.read_text(encoding="utf-8")

    m = re.search(r"^\s*%s:\s*\{([^}]*)\}" % re.escape(key), text, re.M)
    if m:
        block = m.group(1)
        for want in (lang, "ja", "en"):
            mm = re.search(r'\b%s:\s*"((?:[^"\\]|\\.)*)"' % want, block)
            if mm:
                value = unescape_js(mm.group(1))
                if PLACEHOLDER not in value:
                    return value
        return default

    m = re.search(r'^\s*%s:\s*"((?:[^"\\]|\\.)*)"' % re.escape(key), text, re.M)
    if not m:
        return default
    value = unescape_js(m.group(1))
    return default if PLACEHOLDER in value else value


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def qr_path_data(matrix, scale: float, offset_x: float = 0.0, offset_y: float = 0.0) -> str:
    """暗モジュールを1本のpathにまとめる（横方向にランレングス圧縮）。"""
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
                parts.append("M%.3f %.3fh%.3fv%.3fh-%.3fz" % (x, y, run * scale, scale, run * scale))
                col += run
            else:
                col += 1
    return "".join(parts)


def qr_block(matrix, size_mm: float, x: float, y: float):
    """白地・クワイエットゾーン4モジュール付きのQRブロックを返す。

    余白が足りないQRはスマホのカメラで読めないことがあるため、規格どおり確保する。
    """
    n = len(matrix)
    module = size_mm / n
    quiet = module * 4
    total = size_mm + quiet * 2
    svg = (
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{total:.2f}" height="{total:.2f}" rx="1.5" '
        f'fill="#ffffff" stroke="#e2e6f0" stroke-width="0.25"/>'
        f'<path fill="{DARK}" d="{qr_path_data(matrix, module, x + quiet, y + quiet)}"/>'
    )
    return total, svg


def fit_font(text: str, max_width_mm: float, base_size: float, min_size: float = 2.2) -> float:
    """与えた幅に収まるフォントサイズ(mm)を返す。全角は半角2つ分として数える。"""
    if not text:
        return base_size
    units = sum(2.0 if ord(c) > 0x2E80 else 1.0 for c in text)
    return max(min_size, min(base_size, max_width_mm / (units * 0.5)))


def text_units(s: str) -> float:
    """半角換算の文字幅。全角は2、半角は1として数える。"""
    return sum(2.0 if ord(c) > 0x2E80 else 1.0 for c in s)


def _tokens(text: str) -> list:
    """英語は単語単位、日本語は文字単位で折り返せるように分解する。"""
    out = []
    buf = ""
    for ch in text:
        if ch.isspace():
            if buf:
                out.append(buf)
                buf = ""
            out.append(" ")
        elif ord(ch) > 0x2E80:
            if buf:
                out.append(buf)
                buf = ""
            out.append(ch)
        else:
            buf += ch
    if buf:
        out.append(buf)
    return out


def wrap_lines(text: str, max_units: float, max_lines: int) -> list:
    """幅（半角換算）で折り返す。英単語は途中で切らない。"""
    lines = []
    cur = ""
    for tok in _tokens(" ".join(text.split())):
        if tok == " ":
            if cur:
                cur += " "
            continue
        if text_units(cur + tok) > max_units and cur.strip():
            lines.append(cur.rstrip())
            cur = ""
            if len(lines) >= max_lines:
                break
        cur += tok
    if cur.strip() and len(lines) < max_lines:
        lines.append(cur.rstrip())

    # 禁則処理（簡易）：行頭に来てはいけない文字は前の行に戻す
    closers = "」』）〕］｝、。，．・？！：；ー"
    for i in range(1, len(lines)):
        while lines[i] and lines[i][0] in closers:
            lines[i - 1] += lines[i][0]
            lines[i] = lines[i][1:]

    # 入り切らなかった場合だけ最後の行を省略記号で締める（空白は比較から除く）
    def bare(s):
        return text_units("".join(s.split()))

    if lines and sum(bare(l) for l in lines) + 0.5 < bare(text):
        last = lines[-1]
        while last and text_units(last) > max_units - 1:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    return [l for l in lines if l]


def make_card(matrix, url: str, name: str, sub: str, headline: str, lang: str) -> str:
    s = STRINGS[lang]
    disp_name = name or sub or s["noname"]
    sub_line = sub if (name and sub) else ""
    total, qr_svg = qr_block(matrix, 33.0, x=0, y=0)
    qr_x = 91 - total - 4.0
    qr_y = (55 - total) / 2 + 0.8
    text_w = qr_x - 6.5 - 2.0
    head_size = 2.45
    lines = wrap_lines(headline, max_units=text_w / (head_size * 0.5), max_lines=4)
    head_svg = "".join(
        f'<text x="6.5" y="{27.4 + i * 3.5:.1f}" font-size="{head_size}" fill="#5b6478">{esc(l)}</text>'
        for i, l in enumerate(lines)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="91mm" height="55mm" viewBox="0 0 91 55">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_1}"/><stop offset="1" stop-color="{BRAND_2}"/>
    </linearGradient>
  </defs>
  <rect width="91" height="55" fill="#ffffff"/>
  <rect x="0" y="0" width="91" height="1.6" fill="url(#g)"/>
  <g font-family="{FONT}">
    <text x="6.5" y="14" font-size="{fit_font(disp_name, text_w, 4.6, 3.0):.2f}" font-weight="700" fill="{DARK}">{esc(disp_name)}</text>
    <text x="6.5" y="20" font-size="{fit_font(sub_line, text_w, 2.9, 2.1):.2f}" fill="#5b6478">{esc(sub_line)}</text>
    {head_svg}
    <text x="6.5" y="45.5" font-size="2.5" font-weight="700" fill="{BRAND_1}">{s["scan"]}</text>
    <text x="6.5" y="49.8" font-size="2.0" fill="#8b93a5">{esc(url[:46])}</text>
  </g>
  <g transform="translate({qr_x:.2f} {qr_y:.2f})">{qr_svg}</g>
</svg>
"""


def make_poster(matrix, url: str, name: str, sub: str, lang: str) -> str:
    s = STRINGS[lang]
    disp_name = name or sub or s["noname"]
    sub_line = sub if (name and sub) else ""
    total, qr_svg = qr_block(matrix, 66.0, x=0, y=0)
    qr_x = (105 - total) / 2
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 105 148">
  <defs>
    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_1}"/><stop offset="1" stop-color="{BRAND_2}"/>
    </linearGradient>
  </defs>
  <rect width="105" height="148" fill="#ffffff"/>
  <rect x="0" y="0" width="105" height="3" fill="url(#pg)"/>
  <g font-family="{FONT}" text-anchor="middle">
    <text x="52.5" y="20" font-size="3.4" font-weight="700" fill="{BRAND_1}" letter-spacing="1.2">LAST METERS</text>
    <text x="52.5" y="32" font-size="{fit_font(disp_name, 92, 6.6, 3.6):.2f}" font-weight="700" fill="{DARK}">{esc(disp_name)}</text>
    <text x="52.5" y="39.5" font-size="{fit_font(sub_line, 92, 3.3, 2.4):.2f}" fill="#5b6478">{esc(sub_line)}</text>
    <text x="52.5" y="130" font-size="{fit_font(s["hold"], 92, 3.9, 2.8):.2f}" font-weight="700" fill="{DARK}">{s["hold"]}</text>
    <text x="52.5" y="136.5" font-size="{fit_font(s["menu"], 96, 2.9, 2.2):.2f}" fill="#5b6478">{s["menu"]}</text>
    <text x="52.5" y="142.5" font-size="2.5" fill="#8b93a5">{esc(url[:52])}</text>
  </g>
  <g transform="translate({qr_x:.2f} 46)">{qr_svg}</g>
</svg>
"""


def build(url: str, name: str, name_ja: str) -> None:
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

    # ---- 1. 埋め込み用SVG（クワイエットゾーン4モジュール） -----------------
    border = 4
    side = n + border * 2
    (OUT_DIR / "profile-qr.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" '
        f'width="{side * 8}" height="{side * 8}" shape-rendering="crispEdges" '
        f'role="img" aria-label="QR code for {esc(url)}">'
        f'<rect width="{side}" height="{side}" fill="#ffffff"/>'
        f'<path fill="{DARK}" d="{qr_path_data(matrix, 1, border, border)}"/>'
        "</svg>\n",
        encoding="utf-8",
    )

    # ---- 2. スライド用PNG ---------------------------------------------------
    scale = max(1, round(1080 / side))
    qr.save(OUT_DIR / "profile-qr.png", scale=scale, border=border, dark=DARK, light="#ffffff")

    # ---- 3/4. 名刺カードと卓上ポスター（日本語・英語） ----------------------
    written = ["profile-qr.svg", "profile-qr.png"]
    for lang in ("ja", "en"):
        suffix = "" if lang == "ja" else "-en"
        headline = read_config("headline", lang)
        card_name = name if lang == "en" else (name or name_ja)
        card_sub = read_config("role", lang) or (name_ja if lang == "ja" else "")

        card = OUT_DIR / f"profile-qr-card{suffix}.svg"
        card.write_text(make_card(matrix, url, card_name, card_sub, headline, lang), encoding="utf-8")
        poster = OUT_DIR / f"profile-qr-poster{suffix}.svg"
        poster.write_text(make_poster(matrix, url, card_name, card_sub, lang), encoding="utf-8")
        written += [card.name, poster.name]

    for f in written:
        p = OUT_DIR / f
        print(f"  wrote {p.relative_to(ROOT)}  ({p.stat().st_size:,} bytes)")


def main() -> None:
    ap = argparse.ArgumentParser(description="プロフィールサイト用のQRコードを生成する")
    ap.add_argument("--url", default=None, help="QRの遷移先（既定: profile-config.js の siteUrl）")
    ap.add_argument("--name", default=None, help="カードに載せる名前（既定: config の name）")
    ap.add_argument("--name-ja", default=None, help="日本語表記の名前（既定: config の nameJa）")
    args = ap.parse_args()

    url = args.url or read_config("siteUrl")
    if not url:
        sys.exit("URLが決まっていません。--url で指定するか profile-config.js の siteUrl を設定してください。")

    build(
        url=url,
        name=args.name if args.name is not None else read_config("name"),
        name_ja=args.name_ja if args.name_ja is not None else read_config("nameJa"),
    )


if __name__ == "__main__":
    main()
