# デジタル庁デザインシステム（DADS v2）

このディレクトリのCSSは**デジタル庁の公式実装をそのまま取り込んだもの**です。
手を入れないでください。サイト固有の調整は `assets/css/site.css` 側で行います。

| ファイル | 出典 | 内容 |
| --- | --- | --- |
| `global.css` | [digital-go-jp/design-system-example-components-html](https://github.com/digital-go-jp/design-system-example-components-html) `src/global.css` | デザイントークン（色・書体・エレベーション）、ベーススタイル、フォーカスリング、`dads-u-*` ユーティリティ |
| `components.css` | 同リポジトリ `src/components/*/*.css` を連結 | Heading / List / Description List / Blockquote / Link / Utility Link / Divider / Form Control Label / Input Text / Textarea / Radio / Checkbox / Select / Notification Banner / Accordion / Breadcrumb / Table / Chip Label / Resource List / Tab / TOC / Button / Language Selector / Menu List Box / Menu List |

トークンは npm の [`@digital-go-jp/design-tokens`](https://www.npmjs.com/package/@digital-go-jp/design-tokens) と同じ値です。

## ライセンス

MIT License, Copyright (c) 2025 デジタル庁（`LICENSE` を参照）。

## 注意

- このサイトは**デジタル庁とは関係のない個人のサイト**です。デザインシステムを利用しているだけで、
  デジタル庁による提供・監修・推奨を受けたものではありません。
- デジタル庁のロゴ・府省庁のブランド要素は使用していません。
- DADSは**ライトテーマのみ**を規定しています。独自のダークテーマは持たせていません。

## 更新のしかた

```bash
git clone --depth 1 https://github.com/digital-go-jp/design-system-example-components-html.git
cp design-system-example-components-html/src/global.css assets/css/dads/global.css
# components.css は必要なコンポーネントのCSSを連結して作り直す
```
