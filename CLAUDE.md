# このリポジトリで作業するときの約束

## 更新したら、必ず確認用URLを出す

作業が一区切りついたら、**毎回** `main` に取り込んで、本人が見られるURLを出す。
「これでどうでしょう」と見てもらうのが基本。ブランチに置いたままにしない。

手順:
1. ブランチにコミットして push
2. PRを作って main にマージ
3. Pages のビルド（`pages build and deployment`）が success になるのを確認
4. 変わったページのURLを出す。キャッシュ対策に `?v=N` を添える

公開URL: https://eigokono1058-tech.github.io/-/

| ページ | URL |
|---|---|
| プロフィール | `/-/` |
| デモ | `/-/app/` |
| 構想（ピッチ） | `/-/pitch/` |
| Launchpad | `/-/launchpad/` |
| QRキット | `/-/qr/` |

## このリポジトリの作り

- ビルド工程なし。素の HTML / CSS / ES5互換JS。`window.LM_*` に IIFE で生やす
- **`npm run lint` と `npm run build` は存在しない。** 実行しようとしない。
  代わりに Chromium（Playwright）で実機確認する
- CSS は `assets/css/site.css` 一枚。デジタル庁デザインシステムには寄せない（一度やって差し戻した）
- 多言語は `<span data-l="ja">…</span><span data-l="en">…</span>` の兄弟ペア。
  EN / 日本語 / 併記の3モード。**片方だけの文言を作らない**
- 配信は GitHub Pages（main）と Cloudflare Workers の二重

## 確認の仕方

```bash
nohup python3 -m http.server 8877 --bind 127.0.0.1 >/dev/null 2>&1 &
```

Playwright は `/opt/node22/lib/node_modules/playwright` を require する（`.cjs` で書く。
NODE_PATH は ESM では効かない）。

毎回みるもの: コンソールエラー0 / 320・375・768・1280px で横スクロールなし /
h1が1つ・見出しの飛びなし / 日本語・英語とも文言が欠けていない

## 文章について

- 意味を持たない語の羅列を載せない
- 比喩で言い換えない。何が起きるかをそのまま書く
- 日本語は訳し言葉にしない。声に出して不自然なら直す
