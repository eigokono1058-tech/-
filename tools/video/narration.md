# 動画のナレーション原稿

字幕と音声は、元のページ（`film-35s.html` / `film-50s.html`）の `CUES` 1箇所から
作っている。ここはその写しで、**声を差し替えるとき用**。

いまの音声は espeak-ng（オフラインで動く代わりに機械的な声）。
下の文を好きな読み上げサービスに通して、wav か mp3 をもらってくれば差し替えられる。

## 差し替え方

1. 下の文を読み上げさせる。**1行ずつ別ファイル**でも、**通しで1本**でもよい
2. 通しで1本の場合は、下の「開始」の秒数どおりに間を空けて読ませる
   （合わない場合は、その秒数に合わせて `CUES` の時刻を書き換える）
3. 動画を作り直す

```bash
node tools/video/render.cjs film-35s.html assets/video/delivery-os      声.wav
node tools/video/render.cjs film-50s.html assets/video/delivery-os-full 声50.wav
```

wav でなくても ffmpeg が読める形式なら何でも入る。長さが動画（35秒 / 50秒）より
長い場合は末尾が切られる。

---

## 35秒版 — `film-35s.html`

| 開始 | 終了 | 読む文 |
|---|---|---|
| 0.4 | 5.0 | Nobody was home. So the parcel goes back. |
| 5.5 | 10.2 | In Japan, that happens 400 million times a year. |
| 10.6 | 15.0 | A parcel can only go to one fixed place. Your address. |
| 15.4 | 20.2 | But people don't stay in one place. |
| 20.7 | 27.4 | So let the parcel come to you. A spot on the street, where the van pulls over. |
| 27.9 | 34.6 | Delivery OS. Packages adapt to people. |

## 50秒版 — `film-50s.html`

| 開始 | 終了 | 読む文 |
|---|---|---|
| 0.4 | 5.0 | Nobody was home. So the parcel goes back. |
| 5.5 | 10.2 | In Japan, that happens 400 million times a year. |
| 10.7 | 15.6 | The carrier did nothing wrong. A parcel can only go to one fixed place. |
| 16.1 | 21.2 | But you move. Work, a train, an evening out. |
| 21.7 | 28.8 | So let the parcel follow you. Drop a pin on any street, and the van pulls over there. |
| 29.3 | 35.4 | Most of the time you never choose at all. You set the boundaries once. |
| 35.9 | 42.4 | The agent decides inside them and tells you after. Five minutes to take it back. |
| 42.9 | 49.6 | Delivery OS. Packages adapt to people. |

---

## 元の動画の音声

`reference-narration.m4a` は、以前の2分24秒の動画から音声だけを取り出したもの。
声の参考用。背景に音楽が入っているので、この音声から声だけを切り出して
使い回すことはできない（話している区間の切れ目が取れない）。
