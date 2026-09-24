# OpenAI DevDay 2026 — 自己紹介サイト・Launchpad資料・プロトタイプ

**2026年9月29日（火）／ Fort Mason, San Francisco ／ 8:00–19:00**
Launchpad セッション: **Product design and UXR**（OpenAIのメンターとの少人数セッション）
相談テーマ: 物流の受取体験をどう検証し、最小の初版をどう設計するか

このリポジトリに入っているもの:

1. QRをかざすと開く **自己紹介サイト**（各SNS・実績サイトへワンタップ）
2. Launchpadで見せる **ブリーフ**（提出した内容・いまの到達点・メンターに聞く4つの質問）
3. プロジェクト **DELIVERY OS** — 日本の不在配送・再配達を減らす物流の受取体験
   （動くプロトタイプ・ピッチ・Launchpad用ブリーフ）

すべて静的ファイル（HTML / CSS / 素のJavaScript）で、ビルド不要・外部ライブラリ依存なしで動く。

### 言語は3モード

右上のボタンで **EN → 日本語 → EN+日本語（併記）** の順に切り替わる（選択は端末に記憶される）。

| モード | 用途 |
|---|---|
| **EN**（既定） | DevDayで相手に見せるとき。日本語端末でも英語で開く |
| 日本語 | 日本人に見せるとき |
| EN+日本語 | **あとから自分で内容を確認するとき。全文に和訳が並んで出る** |

URLに `?lang=en` / `?lang=ja` / `?lang=both` を付ければ指定して開ける。
既定言語を変えたい場合は `assets/js/i18n.js` の `DEFAULT_LANG`（`"auto"` でブラウザ設定に追従）。

| ページ | 場所 | 用途 |
|---|---|---|
| プロフィール（QRの着地先） | [`/`](./index.html) | 名前・実績・各SNSへワンタップで飛ぶハブ |
| **Launchpadブリーフ** | [`/launchpad/`](./launchpad/) | **当日の中心資料。提出済みの応募文・いまの到達点・聞く4つの質問・英語の口頭スクリプト** |
| QRキット | [`/qr/`](./qr/) | QRのプレビュー・印刷（名刺91×55mm / A6ポスター）・ダウンロード |
| ピッチ（事業構想1ページ） | [`/pitch/`](./pitch/) | 課題・数字・解決策・誰が払うか・足りないもの |
| デモ（動くプロトタイプ） | [`/app/`](./app/) | 受取先の動的変更・ポリシー判定・権限発行・例外処理・需要検証 |

---

## 🚀 イベント前にやること（この順番で）

### 1. プロフィール（設定済み・内容の確認だけお願いします）

`assets/js/profile-config.js` に以下を反映済みです。直したいところがあればこのファイルを編集してください。
`{ ja: "...", en: "..." }` の項目は**英語側も必ず埋めた状態**にしてください（海外参加者にはそちらが表示されます）。

| 項目 | 設定値 |
|---|---|
| 名前 | Eigo Kono / 河野 瑛吾 / 呼ばれ方 Ayden |
| 肩書き（日本語） | ITエンジニア / 営業 · 日立製作所 |
| 肩書き（英語） | IT Engineer / Solution Sales · Hitachi, Ltd. |
| 実績 | 日立の公開記事 |
| プロジェクト | DELIVERY OS（物流の受取体験・動くプロトタイプあり） |
| GitHub / LinkedIn / Instagram / Facebook | 設定済み |
| メール・携帯番号 | **公開ページには載せていません**（下記参照） |

**肩書きは要確認です。** 部署が変わったとのことなので本部名は入れていません。
いまの所属に合わせて `profile-config.js` の `role` と `roleShort` を直してください。

公開ページにメールを載せる場合は `email:` のコメントを外してください。ボットに収集されて
迷惑メールが増えるため既定はオフにしています。携帯番号は載せていません（名刺で直接渡す想定）。

`roleShort` は名刺・ポスターの印刷専用の短い肩書き（長いと自動で文字が小さくなるので分けている）。
`headline`（自己紹介1行）、リンクのラベル、プロジェクト紹介文にも日英の文が入っているので、
気に入らなければ両方書き換える。日本語表示は和名を大きく、英語表示はローマ字を大きく出す。

- リンクの `url` に `REPLACE_ME` が残っているものは **サイトに表示されない**（壊れたリンクを人に見せないため）
- その場合はページ上部に「セットアップ未完了」バナーが出る（いまは全部埋まっているので出ない）
- 顔写真は `tools/make_avatar.py` でサイトのトーンに合わせられる（証明写真の無地背景を暗い
  グラデーションに置き換えて、わずかに寒色へ寄せる）。詳細は [`assets/img/README.md`](./assets/img/README.md)

```bash
pip install Pillow
python3 tools/make_avatar.py ~/Desktop/photo.jpg --replace-bg   # 証明写真から
python3 tools/make_avatar.py ~/Desktop/group.jpg --crop 0.51,0.13,0.20,0.45 --preview  # 集合写真から
```

  できたら `avatar: "assets/img/me.jpg"` を設定する。
  **集合写真をそのまま公開ページに載せないこと**（写っている他の人の同意がない）
- 名前や肩書きを変えたら、名刺に印刷される文字も変わるので `python3 tools/gen_qr.py` を再実行する

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

`.nojekyll` を置いてあるので、`_` で始まる名前のファイルもそのまま配信される（Jekyll処理されない）。

### 3. QRを作り直す（URL・名前・肩書きを変えた場合）

```bash
pip install segno
python3 tools/gen_qr.py                            # profile-config.js の値を使う
python3 tools/gen_qr.py --url https://your.domain/  # URLを直接指定する場合
```

`assets/qr/` の6ファイルが同時に更新される。

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
2. **地図の駅ロッカーをタップ → 「ここで受け取る」** → 冷凍ミールキットが「許可」になり配送車が走り出す
   → *「GOタクシーやUberで『ここで乗る』とピンを差すのと同じ操作で、配送中に受取先を変えられる」*
3. **⌖ 自分に追従 を押す** → ピンが歩いている自分についてきて、配送車の走行ルートがその場で曲がる
   → *「住所ではなく人に届く、というのはこういうことです」*
4. **処方薬を選んで友人宅にピンを差す** → 「拒否：薬機法上、第三者委任は不可」
   → *「AIに委譲しても越えられない境界をポリシーで持っています」*
5. **権限タブ** → 受取グラントのJSON。`not_granted` を指して
   → *「玄関の解錠権限は渡していない、と明示できるのがこの層の価値です」*
   （固定ピンのときは `locate:subject_while_active` も `not_granted` に入る＝現在地は渡していない）
6. **例外を発生させる → 配送ロボットが襲われた**
   → *「制圧されても中身と住居権限は取れない。だから屋内アクセスは渡さない設計にしています」*
7. **検証タブ** → *「で、これ使いたいと思いますか？ 正直に答えてください」*

技術的なポイント（エンジニア相手のとき）:

- ポリシーエンジンは `app/data.js` の宣言的ルール8本。荷物の属性 × 受取地点の能力 × 自律レベルで判定
- 受取グラントは OAuth のスコープ設計の物理世界版（最小スコープ・時限・失効可能・`not_granted` 明示）
- 例外処理は自律レベル（L0〜L4）で分岐。L3が既定で、L4（屋内搬入）は意図的に無効化している
- 地図は外部タイルを使わない自前SVG。オフラインでも動く（会場のWi-Fiが死んでも大丈夫）
- ピンは道路と受取地点にスナップし、動かすたびにポリシーエンジンが再判定する
  （受け取れない場所では赤くなって確定ボタンが押せない）

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
│   ├── js/i18n.js              言語切り替え（EN / 日本語 / 併記の3モード・?lang=）
│   ├── qr/                     生成済みQR素材（6種：日英 × 名刺/ポスター + 汎用2種）
│   ├── video/                  コンセプト動画2本
│   └── favicon.svg
├── qr/index.html               QRキット（プレビュー・印刷・ダウンロード）
├── launchpad/index.html        Launchpadセッション用ブリーフ（当日の中心資料）
├── pitch/index.html            事業構想1ページ（DELIVERY OS）
├── app/
│   ├── index.html              デモ本体
│   ├── app.css                 デモ専用スタイル
│   ├── data.js                 受取地点・荷物・ポリシールール・例外シナリオ
│   ├── engine.js               ポリシーエンジン・受取グラント・状態機械
│   ├── map.js                  街区マップ（自前SVG・外部タイル不要）
│   ├── ui.js                   画面描画とインタラクション
│   └── survey.js               需要検証フォーム・集計・CSV/JSON書き出し
├── tools/
│   ├── gen_qr.py               QR生成ツール（segnoを使用）
│   └── make_avatar.py          顔写真をサイト用アバターに整える（Pillowを使用）
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
- 動画2本は構想を映像化したもの（このリポジトリを作った環境では再生できるコーデックがなかったため、
  内容を確認せずファイル名とメタデータのみでキャプションを付けている。文言は必要に応じて直すこと）
- 英語版はすべて書き下ろし（機械翻訳の直訳ではない）。固有名詞や社名を入れるときは英語側も直すこと

---

## About this repository (English)

A self-introduction site with a printable QR code, plus the business plan and a working prototype for
**DELIVERY OS** — an idea about the receiving side of AI-driven commerce.

Everything is static HTML, CSS and plain JavaScript: no build step, no external libraries.
**Every page is bilingual (Japanese / English)** — the language is detected from the browser, can be
switched with the button in the top right, and can be forced with `?lang=en` or `?lang=ja`.

| Page | Path | What it is |
|---|---|---|
| Profile (where the QR lands) | [`/`](./index.html) | One tap to each social profile and to the project |
| QR kit | [`/qr/`](./qr/) | Preview, download and print (business card 91×55mm, A6 poster) in both languages |
| Pitch | [`/pitch/`](./pitch/) | The problem in numbers, the solution, who pays, what is unproven |
| Demo | [`/app/`](./app/) | Change the destination mid-delivery, watch a policy engine rule on it, issue a scoped receipt grant, break it on purpose |

The short version of the idea: AI agents will soon order and pay on our behalf, but goods still arrive
physically, and today's delivery assumes somebody is home. This project treats the **last few meters**
as a permissions-and-liability problem rather than a robotics problem — issuing a scoped, time-boxed,
revocable "receipt grant" so the handover can happen anywhere except inside your home.

The demo runs on fictional data and is not connected to any real carrier.
