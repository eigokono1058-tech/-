# 動画のナレーション原稿

動画は1本だけ。元は `film.html` で、**絵も字幕も読み上げる文も、そのファイルの
`CUES` 1箇所から**作られる。ここはその写しで、声を差し替えるとき用。

いまの声は Kokoro（英語の音声合成、82Mの小さなモデル）の `af_heart`
（アメリカ英語の女性）を1.35倍で読ませたもの。

## 作り直し方

```bash
python3 tools/video/narrate.py tools/video/film.html /tmp/nar.wav af_heart 1.35
node   tools/video/render.cjs  film.html assets/video/delivery-os /tmp/nar.wav
```

`narrate.py` は台本の枠に合わせない。実際に読み上げた長さを測って、前の行のすぐ
後ろに詰めていく（行間は0.22秒）。その結果の時刻を `.spans.json` に書き出し、
`render.cjs` がそれを読んで場面の長さをそちらに合わせる。だから無音が残らない。

- 声を変える → `af_heart` を別の名前に。アメリカ英語の女性は `af_bella`
  `af_nova` `af_sarah` `af_sky` など11種類ある
- 速さを変える → `1.35` を変える。テンポだけが変わり、動画の尺が自動で追従する
- 人が読んだ音声に差し替える → 同じ長さの wav を `render.cjs` の3つめに渡す
  （`.spans.json` が無ければ台本どおりの時刻で並ぶ）

## 読む文

| # | 場面 | 読む文 |
|---|---|---|
| 1 | フック | A fridge notices the milk is running low. An agent orders it and pays. |
| 2 | フック | That took three seconds. The person who has to take it is not home. |
| 3 | 前提を外す | A parcel is something you receive at home. That is the assumption we are dropping. |
| 4 | 前提の確認 | Because nobody lives inside the data. Food, water and medicine have to reach a hand. |
| 5 | 数字 | Japan ships five billion parcels a year. Last year, eight point three percent were carried twice. |
| 6 | 数字 | Back when it was one in ten, the government called that sixty thousand drivers of wasted work. |
| 7 | 先回り | The obvious fixes do not hold. A driverless van still drives back if nobody is home. |
| 8 | 先回り | Left at the door, it gets taken. And a robot that can open your lock is a way into the house. |
| 9 | 逆転 | So stop making the person wait. Let the parcel follow the person. |
| 10 | 具体化 | Share your location, and the drop point is wherever you are. A store by the station, your office. |
| 11 | 具体化 | Or drop a pin on any street, and the van pulls over right there. |
| 12 | 受け取り | You walk up, and it is yours. No second trip, nothing left on a doorstep. |
| 13 | 名前 | Delivery OS. Packages adapt to people. |

## 数字の出どころ

画面にも小さく出している。

| 数字 | 出どころ |
|---|---|
| 50億3147万個（年） | 国土交通省「令和6年度 宅配便・メール便取扱実績」2025年8月27日 |
| 再配達 8.3% | 国土交通省「令和7年10月の宅配便の再配達率は約8.3％」サンプル調査 |
| ドライバー約6万人分 | 国土交通省 試算（再配達率が約10.4%だった時点のもの） |
