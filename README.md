# LAST METERS

イベント（デベロッパーデイ）用の **自己紹介サイト＋QRコード** と、
事業アイデア「AIエージェント前提の受取インフラ」の **事業計画＋動くプロトタイプ** をまとめたリポジトリ。

すべて静的ファイル（HTML / CSS / 素のJavaScript）で、ビルド不要・外部ライブラリ依存なしで動く。

**全ページが日本語/英語の両対応**。ブラウザの言語設定で自動判定し、右上のボタンで手動切り替えもできる
（選択は端末に記憶される）。`?lang=en` / `?lang=ja` をURLに付ければ言語を指定してリンクを共有できる。
海外参加者にはそのまま英語で表示されるので、当日は言語を気にせずQRを見せればいい。

| ページ | 場所 | 用途 |
|---|---|---|
| プロフィール（QRの着地先） | [`/`](./index.html) | 名前・実績・各SNSへワンタップで飛ぶハブ |
| QRキット | [`/qr/`](./qr/) | QRのプレビュー・印刷（名刺91×55mm / A6ポスター）・ダウンロード |
| ピッチ（事業構想1ページ） | [`/pitch/`](./pitch/) | 課題・数字・解決策・誰が払うか・足りないもの |
| デモ（動くプロトタイプ） | [`/app/`](./app/) | 受取先の動的変更・ポリシー判定・権限発行・例外処理・需要検証 |
| 事業計画ドキュメント | [`/plan/`](./plan/) | 事業計画／足りないもの／検証計画（Markdownをサイト上で整形表示） |

---

## 🚀 イベント前にやること（この順番で）

### 1. プロフィールを埋める（必須）

`assets/js/profile-config.js` の **`REPLACE_ME` を全部置き換える**。
`{ ja: "...", en: "..." }` になっている項目は**英語側も必ず書く**（海外参加者にはそちらが表示される）。

```js
name:   "REPLACE_ME",                        // 例: "Eigo Kono"（ローマ字・両言語共通）
nameJa: "REPLACE_ME",                        // 例: "河野 英悟"
role:   { ja: "REPLACE_ME",                  // 例: "ITエンジニア / 日立製作所"
          en: "REPLACE_ME" },                // e.g. "IT Engineer / Hitachi, Ltd."

links: [
  { id: "hitachi",   url: "REPLACE_ME" },  // 実績紹介サイト（公開可能なURLのみ）
  { id: "github",    url: "https://github.com/eigokono1058-tech" },  // 設定済み
  { id: "linkedin",  url: "REPLACE_ME" },  // https://www.linkedin.com/in/xxxx/
  { id: "instagram", url: "REPLACE_ME" },  // https://www.instagram.com/xxxx/
  { id: "facebook",  url: "REPLACE_ME" }   // https://www.facebook.com/xxxx
]
```

`headline`（自己紹介1行）、リンクのラベル、プロジェクト紹介文には日英の既定文が入っているので、
気に入らなければ両方書き換える。日本語表示は和名を大きく、英語表示はローマ字を大きく出す。

- `REPLACE_ME` が残っているリンクは **サイトに表示されない**（壊れたリンクを人に見せないため）
- 代わりにページ上部に「セットアップ未完了」バナーが出るので、当日忘れていても気づける
- 顔写真を出したい場合は `assets/img/me.jpg` などを置いて `avatar: "assets/img/me.jpg"`

### 2. 公開する（GitHub Pages）

1. GitHubの **Settings → Pages**
2. **Source: Deploy from a branch** → フォルダ: `/ (root)` → Save
   - すぐ公開したい場合は Branch に `claude/ai-logistics-delivery-service-ec1b4t`
     （このコードが入っているブランチ）を指定すればそのまま公開できる
   - `main` に取り込んでから公開する場合は、先にPull Requestをマージして Branch: `main`
3. 数分後 `https://eigokono1058-tech.github.io/-/` で公開される

> リポジトリ名が `-` なのでURLに `/-/` が入る。見た目を整えたい場合は
> リポジトリ名を `profile` などに変える、または独自ドメインを設定する。
> **どちらもURLが変わるのでQRを作り直す必要がある。印刷前に決めること。**

`.nojekyll` を置いてあるので、`plan/` の `.md` ファイルはそのまま配信される（Jekyll処理されない）。

### 3. QRを作り直す（URLを変えた場合のみ）

```bash
pip install segno
python3 tools/gen_qr.py                            # profile-config.js の siteUrl を使う
python3 tools/gen_qr.py --url https://your.domain/  # 直接指定する場合
```

`assets/qr/` の4ファイルが同時に更新される。

| ファイル | 用途 |
|---|---|
| `profile-qr.svg` | サイト埋め込み用（ベクタ） |
| `profile-qr.png` | スライド貼り付け用（1080×1080px） |
| `profile-qr-card.svg` / `-en.svg` | 名刺サイズ（91×55mm）の印刷用カード（日本語 / 英語） |
| `profile-qr-poster.svg` / `-en.svg` | A6（105×148mm）の卓上ポスター（日本語 / 英語） |

誤り訂正レベルは **H（30%）** 固定、クワイエットゾーンは規格どおり4モジュール確保。
印刷が汚れても暗い会場でも読める。QRが読む先のURLは日英で同じ（サイト側が言語を自動判定する）ので、
名刺は**日本語版と英語版を両方刷って相手に合わせて渡す**のが楽。

### 4. 印刷する

[`/qr/`](./qr/) を開いて「印刷する」ボタン。名刺・ポスターそれぞれ等倍で印刷される
（ブラウザの印刷設定で「倍率100%」「余白: 既定」にすること）。

### 5. 当日

- QRの着地先は**プロフィール**。そこから1タップでデモとピッチに飛べる
- デモの「検証」タブで、触ってくれた人にアンケートを答えてもらう
  （回答は**その端末のブラウザに保存される**ので、**自分の端末を渡して入力してもらう**運用にする）
- 帰ったら `検証` タブ → 「CSVで書き出す」で回収

---

## 🧭 デモの操作ガイド（人に説明するとき用）

英語で話す相手には、渡す前に**右上のボタンで EN にしてから**渡す
（相手のブラウザではなく自分の端末を渡す運用なので、言語は自分で切り替える必要がある）。

30秒で見せる順番:

1. **配送タブ**: 4件のうち3件が「自宅で受け取る前提では成立しない」と赤字で出ている
   → *「AIが自動発注しても、受取の制約でここで止まるんです」*
2. **地図の駅ロッカーをタップ** → 冷凍ミールキットが「許可」になり配送車が走り出す
   → *「シェア自転車の返却ピンを差す感覚で、配送中に受取先を変えられる」*
3. **処方薬を選んで友人宅をタップ** → 「拒否：薬機法上、第三者委任は不可」
   → *「AIに委譲しても越えられない境界をポリシーで持っています」*
4. **権限タブ** → 受取グラントのJSON。`not_granted` を指して
   → *「玄関の解錠権限は渡していない、と明示できるのがこの層の価値です」*
5. **例外を発生させる → 配送ロボットが襲われた**
   → *「制圧されても中身と住居権限は取れない。だから屋内アクセスは渡さない設計にしています」*
6. **検証タブ** → *「で、これ使いたいと思いますか？ 正直に答えてください」*

技術的なポイント（エンジニア相手のとき）:

- ポリシーエンジンは `app/data.js` の宣言的ルール8本。荷物の属性 × 受取地点の能力 × 自律レベルで判定
- 受取グラントは OAuth のスコープ設計の物理世界版（最小スコープ・時限・失効可能・`not_granted` 明示）
- 例外処理は自律レベル（L0〜L4）で分岐。L3が既定で、L4（屋内搬入）は意図的に無効化している
- 地図は外部タイルを使わない自前SVG。オフラインでも動く（会場のWi-Fiが死んでも大丈夫）

---

## 🗂 ディレクトリ構成

```
.
├── index.html                  プロフィールハブ（QRの着地先）
├── .nojekyll                   GitHub PagesでJekyllを無効化（.md をそのまま配信）
├── assets/
│   ├── css/site.css            共通デザイントークン（ライト/ダーク両対応）
│   ├── js/profile-config.js    ★ここだけ書き換えれば完成
│   ├── js/profile.js           プロフィールの描画・vCard書き出し・QR表示
│   ├── js/icons.js             インラインSVGアイコン
│   ├── js/theme.js             配色切り替え
│   ├── js/i18n.js              日英切り替え（自動判定 + 手動トグル + ?lang=）
│   ├── qr/                     生成済みQR素材（6種：日英 × 名刺/ポスター + 汎用2種）
│   ├── video/                  コンセプト動画2本
│   └── favicon.svg
├── qr/index.html               QRキット（プレビュー・印刷・ダウンロード）
├── pitch/index.html            事業構想1ページ
├── plan/
│   ├── index.html              ドキュメントビューア（言語で .md / .en.md を切り替え）
│   ├── md.js                   最小限のMarkdownレンダラ
│   ├── business-plan.md        事業計画（全体構想）
│   ├── business-plan.en.md     Business plan (English)
│   ├── open-questions.md       足りないもの・未解決論点
│   ├── open-questions.en.md    Open questions (English)
│   ├── validation-plan.md      検証計画（インタビュースクリプト付き）
│   └── validation-plan.en.md   Validation plan (English)
├── app/
│   ├── index.html              デモ本体
│   ├── app.css                 デモ専用スタイル
│   ├── data.js                 受取地点・荷物・ポリシールール・例外シナリオ
│   ├── engine.js               ポリシーエンジン・受取グラント・状態機械
│   ├── map.js                  街区マップ（自前SVG・外部タイル不要）
│   ├── ui.js                   画面描画とインタラクション
│   └── survey.js               需要検証フォーム・集計・CSV/JSON書き出し
├── tools/gen_qr.py             QR生成ツール（segnoを使用）
└── demos/nordic-interior/      以前アップロードされていた3Dデモ（退避）
```

> `demos/nordic-interior/index.html` は、もともとリポジトリ直下にあった
> Three.jsのインテリアデザインデモ。ルートをプロフィールサイトにするため移動しただけで、中身は変更していない。

---

## 🛠 ローカルで確認する

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

`plan/` はMarkdownを `fetch` で読むため、**ファイルを直接開く（file://）と表示できない**。
必ずHTTPサーバー経由で開くこと。

---

## 📈 需要検証の回答をサーバーに集めたい場合

既定では回答はブラウザのlocalStorageのみに保存される。外部に送りたい場合は
`app/index.html` の最後に1行足す。

```html
<script>window.LM_SURVEY_ENDPOINT = "https://example.com/collect";</script>
```

POSTが失敗してもlocalStorageへの保存は必ず行われるので、会場の電波が悪くても回答は失われない。

---

## ⚠️ 注意

- デモは**架空データによる概念検証用シミュレーション**で、実在の配送事業者・車両とは接続していない
- 事業計画中の数値のうち、出典のないものは `[要検証]` を付けた仮定
- 動画2本は構想を映像化したもの（このリポジトリを作った環境では再生できるコーデックがなかったため、
  内容を確認せずファイル名とメタデータのみでキャプションを付けている。文言は必要に応じて直すこと）
- 英語版はすべて書き下ろし（機械翻訳の直訳ではない）。固有名詞や社名を入れるときは英語側も直すこと

---

## About this repository (English)

A self-introduction site with a printable QR code, plus the business plan and a working prototype for
**LAST METERS** — an idea about the receiving side of AI-driven commerce.

Everything is static HTML, CSS and plain JavaScript: no build step, no external libraries.
**Every page is bilingual (Japanese / English)** — the language is detected from the browser, can be
switched with the button in the top right, and can be forced with `?lang=en` or `?lang=ja`.

| Page | Path | What it is |
|---|---|---|
| Profile (where the QR lands) | [`/`](./index.html) | One tap to each social profile and to the project |
| QR kit | [`/qr/`](./qr/) | Preview, download and print (business card 91×55mm, A6 poster) in both languages |
| Pitch | [`/pitch/`](./pitch/) | The problem in numbers, the solution, who pays, what is unproven |
| Demo | [`/app/`](./app/) | Change the destination mid-delivery, watch a policy engine rule on it, issue a scoped receipt grant, break it on purpose |
| Business plan | [`/plan/`](./plan/) | Plan, open questions and validation plan (English versions are `*.en.md`) |

The short version of the idea: AI agents will soon order and pay on our behalf, but goods still arrive
physically, and today's delivery assumes somebody is home. This project treats the **last few meters**
as a permissions-and-liability problem rather than a robotics problem — issuing a scoped, time-boxed,
revocable "receipt grant" so the handover can happen anywhere except inside your home.

The demo runs on fictional data and is not connected to any real carrier.
