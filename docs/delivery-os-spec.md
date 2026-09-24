# 実装指示書 — Delivery Orchestration OS

**対象リポジトリ**: `eigokono1058-tech/-`
**対象ブランチ**: `claude/ai-logistics-delivery-service-ec1b4t`
**目的**: OpenAI DevDay 2026（9/29）Launchpad「Product design and UXR」で、2〜3分触らせて
「複数の現実世界サービスをまたいで、エージェントがユーザーの代理で意思決定・実行する」を
体験させる。物流の説明ではなく、**エージェント設計の議論に持ち込むための実物**。

> **一文**
> Packages adapt to people. — 人が荷物に合わせるのをやめ、荷物が人の生活に合わせる配送OS。
> 配送会社は作らない。既存のキャリア・ロッカー・地域配送・将来の自動運転車を接続し、
> 「誰が・いつ・どこに・どう届けるか」をユーザー方針の範囲内で自動決定する。

> **OpenAIに投げる芯**
> How should an AI agent safely coordinate multiple real-world services and execute
> decisions on behalf of a user?

---

## 0. 着手前に必ず読むこと

### 0.1 このリポジトリの実態（調査済み。再調査は不要）

| 項目 | 実態 |
|---|---|
| フレームワーク | **なし**。Vanilla HTML / CSS / ES5互換JS。ビルド工程なし |
| モジュール形式 | `window.LM_*` にIIFEで生やす。`import`/`export` は使わない |
| CSS | **自前のデザインシステム** `assets/css/site.css` 一枚。以前DADSに寄せたが見た目が悪化したため**差し戻し済み**（`2acb802` → 取り消し）。DADSに再度寄せないこと |
| 配色 | `site.css` の CSS変数。`--brand-1/2/3`, `--text`, `--text-faint`, `--line`, `--shadow`, `--map-bg-1/2` など |
| テーマ | **ライト/ダーク両対応**。`<html data-theme="dark">` が既定。`assets/js/theme.js` の `LMTheme.bind("#themeBtn")` で切替 |
| 共通シェル | `<div class="aurora">` `<div class="grid-lines">` `<div class="top-controls">`（`#langBtn` と `#themeBtn`）＋ `<main class="wrap">` |
| 既存クラス | `.card` `.card-tight` `.btn` `.btn-sm` `.btn-primary` `.btn-ghost` `.row` `.row-wrap` `.spread` `.pill` `.eyebrow` `.muted` `.small` `.tiny` `.faint` `.banner` `.stat-grid` `.bars` |
| 多言語 | 独自i18n。`<span data-l="ja">…</span><span data-l="en">…</span>` の兄弟ペアをCSSで出し分け。en / ja / 併記の3モード |
| 配信 | Cloudflare Workers 静的アセット（`wrangler.jsonc`）＋ GitHub Pages の二重 |
| 配信 | `worker/index.js`。静的アセットのみ（データベースなし） |
| テスト | 自動テストなし。`npm run lint` / `npm run build` は**存在しない**（実行しようとしないこと） |

### 0.2 絶対に守ること

1. **既存の見た目に合わせる**。`assets/css/site.css` の変数とクラスを使い、
   新しい配色・影・角丸を発明しない。新規スタイルは `app/app.css` に、既存変数だけで書く。
   **デジタル庁デザインシステム（DADS）には寄せないこと**（一度やって差し戻した）。
   他所の指示に「premium」「minimal」「白basedで」等があっても、**既存の site.css が勝つ**。
   ライト/ダーク両方で読めることを必ず確認する。
2. **既存の `app/engine.js` を捨てない**。ポリシーエンジン・受取グラント・責任分界ログは
   OpenAIへの質問①②の答えそのもの。新しい層はこの上に**乗せる**。
3. **新しいライブラリを入れない**。チャートもダイアグラムもインラインSVGで書く。
4. **バックエンドを増やさない**。すべてクライアント内のモックで完結させる。
   実在のCalendar / Carrier / Locker APIには接続しない。個人情報をコードに入れない。
5. **新規のランディングページを作らない**。`/app/` を拡張する。
6. 全UI文字列は `{ja, en}` の兄弟ペアで書く。片方だけの文言を作らない。
7. 320px幅で横スクロールを出さない。`prefers-reduced-motion` を尊重する。

### 0.3 作らないもの（スコープ外）

- 実データ・実API・認証・課金
- 常時GPS追跡（MVPの思想として**意図的に持たない**。画面にもそう書く）
- Waymo / ロボットの実装（`provider` の1種として**接続先の欄に名前だけ**出す）
- React化・TypeScript化・ビルド工程の導入

---

## 1. 全体像 — 3層に分ける

**これが今回の設計の芯**。「AIが全部やる魔法の箱」に見えたら失敗。

```
┌─ Agent（LLM的な層） ────────────────────────┐
│  文脈の理解 / ツールの選択 / 例外の処理       │
│  ユーザーとの対話 / サービス間の調整          │
└───────────────┬─────────────────────────────┘
                │ 呼ぶ
┌───────────────▼─────────────────────────────┐
│ Optimization Engine（決定論的な層）          │
│  候補生成 / スコアリング / 容量制約 /         │
│  ネットワーク全体の割当                       │
│  ※ LLMに計算させない。ここは普通のコード      │
└───────────────┬─────────────────────────────┘
                │ 呼ぶ
┌───────────────▼─────────────────────────────┐
│ Provider Layer（MCP / API・すべてモック）     │
│  carrier / locker / courier / calendar /     │
│  traffic / weather / payment / AV(将来)      │
└──────────────────────────────────────────────┘
```

画面上でもこの3層が見えること。**「Use AI for judgment and orchestration,
not for deterministic logistics calculations.」** を実際のコード構造で示す。

---

## 2. 画面構成

既存の4タブを**5タブ**に組み替える。

| # | タブ | ja / en | 中身 | 状態 |
|---|---|---|---|---|
| 1 | 配送 | 配送 / Delivery | 地図・ピン・荷物 ＋ **エージェントの決定カード** | 既存＋追加 |
| 2 | 方針 | 方針 / Policy | **ユーザー方針の設定** ＋ 自律レベル ＋ 発行済みグラント | 新規＋既存統合 |
| 3 | 全体最適 | 全体最適 / Network | **3ユーザー×2車両×2ロッカーの割当デモ** | 新規 |
| 4 | 記録 | 記録 / Log | 責任分界ログ ＋ **エージェントのツール呼び出し** | 既存＋追加 |

既存の「権限」タブは **2. 方針** に統合する（方針＝入力、グラント＝出力なので同じ面が正しい）。

### 2.1 説明の順序（DevDayでの2〜3分）

```
[1] 配送タブ … 「通常配送だと23:10。あなたは22:40帰宅」   ← 問題
     ↓ Run Demo を押す
[2] エージェントが考える（2秒）                            ← 3層が見える
     ↓
[3] 「品川駅ロッカー20:25に変更しました」＋ 取り消しボタン  ← 自動実行
     ↓ 「例外を見る」を押す
[4] 「渋谷だと+450円。方針の外なので聞きます」             ← 境界線
     ↓ 全体最適タブ
[5] 「1人だけ最適化すると網が壊れる」を並べて見せる        ← 差別化
     ↓ 記録タブ
[6] 実際に呼んだツールのログ                               ← MCPの実体
```

---

## 3. シナリオ（固定・これ以外を作らない）

```
ユーザー   Eigo / 東京 / 平日
現在時刻   17:45
現在地     品川エリア（オフィス）
予定       19:30まで勤務（カレンダー由来）
推定動線   オフィス → 品川駅 → 自宅
帰宅ETA    22:40
荷物       ノートPCアクセサリ / ¥8,000 / 常温 / 本人確認不要
現計画     自宅配送、キャリアETA 23:10
問題       23:10に届いても受け取れない（帰宅22:40だが、方針で23:00以降はインターホン禁止）
```

### 3.1 候補（モックデータ）

| ID | 手段 | 受取可能 | 追加料金 | 徒歩/逸脱 | 再配達リスク |
|---|---|---|---|---|---|
| `opt_home` | 自宅配送（キャリアA） | 23:10 | ¥0 | 0分 | 高 |
| `opt_locker_sng` | 品川駅ロッカー | **20:25** | **¥0** | +7分 | 非常に低 |
| `opt_courier` | 地域自転車便 | 21:40 | ¥180 | 走行+2.8km | 低 |
| `opt_locker_sby` | 渋谷駅ロッカー（例外用） | 20:10 | **¥450** | **+25分** | 非常に低 |
| `opt_av` | 自動運転車 | — | — | — | **本MVPでは未接続** |

**正常系の正解 = `opt_locker_sng`**（方針内なので自動実行）
**例外系 = `opt_locker_sby` しか無い状況**（+¥450・+25分で方針の外 → 確認を取る）

---

## 4. エージェント判断アルゴリズム（疑似仕様）

**本書の中核**。`app/agent.js` に実装する。

### 4.1 入力

```js
Input = {
  parcel,       // LM_DATA.PARCELS の1件
  policy,       // LM_POLICY.get()
  userContext,  // { now, area, calendar:[{from,to,label}], routeHint:[...], homeEtaMin }
  network,      // LM_PROVIDERS.snapshot() … 各候補のETA・空き・料金
  world,        // { traffic:"moderate", weather:"clear" }
  history       // この荷物の過去の決定（再計画回数の把握に使う）
}
```

### 4.2 起動条件（S0）

**常時は動かさない。イベント駆動にする。** これが「魔法の箱にしない」の実装。

```
trigger ∈ {
  parcel_received,        // 新しい荷物が来た
  calendar_changed,       // 予定が変わった
  network_changed,        // ETA悪化 / ロッカー満杯 / 車両遅延
  periodic,               // N分ごとの定期再評価
  user_action             // ユーザーがピンを動かした等
}
```

### 4.3 S1 — 現計画の健全性チェック

```js
function isHealthy(plan, input) {
  return plan.receivableAtMin <= input.parcel.slaMin          // SLA内
      && !inQuietHours(plan.receivableAtMin, input.policy)     // 方針の時間内
      && tempChainHolds(input.parcel, plan.point)              // 温度帯が保つ
      && successProbability(plan, input) >= 0.8;               // 受け取れる見込み
}
```

> **健全なら何もしない。`decision = {action:"none"}` を返す。**
> **「黙っている」をエージェントの正当な出力として実装すること。**
> 毎回なにか通知するのは悪いUX。画面にも「今日は変更不要でした」とだけ出す状態を作る。

### 4.4 S2 — 候補生成（ハード制約とソフト制約を分ける）

```js
function generateCandidates(input) {
  var out = [];
  LM_PROVIDERS.options(input.parcel).forEach(function (o) {
    // (a) 既存のポリシーエンジンで足切り（温度帯・本人確認・高額・容量・委任）
    var ev = LM_ENGINE.evaluate(input.parcel, o.point);
    if (ev.verdict === "deny") return;

    // (b) ハード制約 = 候補から除外する。スコアで救わない
    if (inQuietHours(o.receivableAtMin, input.policy)) return;
    if (o.receivableAtMin > input.parcel.slaMin) return;
    if (o.point.dynamic && input.policy.shareLocation === "never") return;

    out.push({ id:o.id, point:o.point, provider:o.provider,
               receivableAtMin:o.receivableAtMin, extraCost:o.extraCost,
               walkMin:o.walkMin, detourKm:o.detourKm, evalResult:ev });
  });
  return out;
}
```

> ソフト制約（追加料金・徒歩距離・待ち時間）は**除外せずスコアで減点**する。
> ハードで落とすと「方針の外だが唯一の選択肢」を提示できなくなり、例外シナリオが作れない。
> **例外シナリオは「ソフト制約に全部引っかかる候補しか残らなかった」状態として表現する。**

### 4.5 S3 — スコアリング（Optimization Engine / 決定論）

`app/optimizer.js` に置く。**LLM的な要素をここに入れない。**

```js
function score(c, input) {
  var P = input.policy;
  var w = WEIGHTS[P.optimize];   // "cheapest" | "fastest" | "safest"

  var waitMin  = c.receivableAtMin - input.userContext.now;      // 受け取れるまで
  var detour   = c.walkMin + c.detourKm * 3;                     // ユーザー＋網の迂回
  var risk     = 1 - successProbability(c, input);               // 受け取れない確率
  var netLoad  = lockerPressure(c) + vehicleDetour(c);           // 網への負荷
  var co2      = c.detourKm * 0.18;                              // kg-CO2（表示用）

  return -( w.wait * waitMin
          + w.cost * c.extraCost / 100
          + w.walk * detour
          + w.risk * risk * 100
          + w.net  * netLoad
          + w.co2  * co2 );
}

var WEIGHTS = {
  cheapest: { wait:0.5, cost:3.0, walk:0.8, risk:2.0, net:1.0, co2:0.3 },
  fastest:  { wait:3.0, cost:0.5, walk:1.2, risk:2.0, net:0.6, co2:0.2 },
  safest:   { wait:0.8, cost:0.8, walk:0.6, risk:6.0, net:0.8, co2:0.3 }
};
```

#### 受取成功確率 — LLMに出させない

```js
// 表引き × 補正。これも「魔法の箱にしない」の実装。
var BASE_SUCCESS = {
  home_door: 0.62, home_locker: 0.88, konbini: 0.94,
  station_locker: 0.96, office: 0.81, friend: 0.75, moving_me: 0.70
};
function successProbability(c, input) {
  var p = BASE_SUCCESS[c.point.id] || 0.8;
  if (onUserRoute(c.point, input.userContext)) p += 0.06;   // 動線上なら上がる
  if (c.walkMin > 15) p -= 0.10;                            // 遠いと下がる
  if (c.point.capacity && remaining(c.point) <= 1) p -= 0.15;
  return Math.max(0.05, Math.min(0.99, p));
}
```

画面には `96%` のように出し、ホバー/展開で内訳（基準値・動線補正・距離補正）を見せる。
**「なぜその数字か」が開けることが、信頼設計のデモになる。**

### 4.6 S4 — ネットワーク全体の割当

単独最適だけだと網が壊れる、を**コードで示す**。

```js
// 単独最適: 各荷物が自分のscore最大だけを見る
function assignGreedy(parcels, input) {
  return parcels.map(p => argmax(generateCandidates({...input, parcel:p}), score));
}

// 全体最適: 容量・車両制約の下で Σscore を最大化（貪欲 + 交換改善で十分）
function assignNetworkAware(parcels, input) {
  var plan = assignGreedy(parcels, input);
  var guard = 0;
  while (guard++ < 50) {
    var v = findViolation(plan);       // ロッカー超過 / 車両の追加走行超過
    if (!v) break;
    var swap = bestSwap(plan, v);      // 2番手候補との交換でΣscoreが最も落ちないもの
    if (!swap) break;
    apply(plan, swap);
  }
  return plan;
}
```

**「全体最適」タブは、この2つの関数の出力を左右に並べるだけ**で成立する。

固定シナリオ（3ユーザー）:

| ユーザー | 受取可能 | 単独最適 | 全体最適 |
|---|---|---|---|
| A | 渋谷 / 新宿 | 渋谷 | **新宿** |
| B | 渋谷のみ | 渋谷 | 渋谷 |
| C | 品川 / 自宅 | 渋谷（空きがあるため） | **品川** |

制約: 渋谷ロッカー残3・品川ロッカー残10 / 車両1は渋谷方面・車両2は品川方面

結果として表示する指標（4つ）:
`総走行距離` `初回受取成功率` `再配達件数` `網の総コスト`

> 見出し: **Individual Convenience × Network Efficiency**
> 補足: 「1人だけを最適化しない。各ユーザーの方針の範囲内で、網全体として最も良い組み合わせを選ぶ」

### 4.7 S5 — 権限判定（自動 / 確認 / 本人認証）

**3段階**。ここがOpenAIへの質問①の答えの実体。

```js
function decideApproval(chosen, current, input) {
  var P = input.policy, pc = input.parcel;

  // ── explicit: 方針では上書きできない。必ず本人 ──
  if (pc.requiresIdentity)              return reason("explicit", "identity_required");
  if (pc.value >= P.explicitOverJpy)    return reason("explicit", "high_value");
  if (chosen.point.id === "friend")     return reason("explicit", "third_party");
  if (isHandingOver(current))           return reason("explicit", "irreversible");

  // ── confirm: 方針の外に出る ──
  if (chosen.extraCost > P.maxExtraCostJpy)     return reason("confirm", "cost_over_policy");
  if (chosen.walkMin   > P.maxRouteDeviationMin) return reason("confirm", "detour_over_policy");
  if (inQuietHours(chosen.receivableAtMin, P))   return reason("confirm", "quiet_hours");
  if (chosen.point.dynamic && P.shareLocation !== "during_pickup")
                                                 return reason("confirm", "location_scope");
  if (chosen.extraCost > 0 && !P.autoPay)        return reason("confirm", "payment");

  // ── auto: 方針の内側かつ取り消せる ──
  return reason("auto", "within_policy");
}
```

| 判定 | 意味 | UI |
|---|---|---|
| `auto` | 黙って実行し、**事後に通知**する | 成功トースト＋**「元に戻す」＋残り時間カウントダウン（5分）** |
| `confirm` | 実行前に聞く。**選択肢は2つまで** | 確認カード。「現状維持」と「変更する」 |
| `explicit` | 本人認証を伴う承認 | 確認カード＋本人確認ステップの明示 |

> **設計原則（画面にも文章として出す）**
> 「判断を求める回数を減らすのではなく、**取り消せない判断**を求める回数を減らす」
> Reduce the number of *irreversible* decisions you ask for — not the number of decisions.

### 4.8 S6 — 実行（ツール呼び出しの順序と補償）

**順序が意味を持つ。逆にすると破綻する。**

```
1. locker.reserve(locker_id, window)        ← 先に席を取る
2. carrier.reroute(parcel_id, destination)  ← 取れてから変更する
3. payment.authorize(amount)                ← 追加料金があるときだけ
4. os.issue_grant(parcel_id, option_id)     ← 権限を発行（既存 engine.assign を呼ぶ）
5. notify.user(...)                         ← 最後に伝える
```

**補償（ロールバック）を必ず実装する。**

```js
var done = [];
try {
  for (var step of plan) { await call(step); done.push(step); }
} catch (e) {
  for (var s of done.reverse()) await compensate(s);   // reserve → release など
  return { action:"failed", error:e, compensated:true };
}
```

> ロッカーは押さえたがキャリアの変更に失敗 → **ロッカーを解放して元に戻す**。
> この「部分的失敗からの復旧」は、現実世界エージェントの一番難しいところであり、
> **OpenAIに聞く質問③そのもの**。画面で1回はわざと失敗させられるようにする
> （記録タブに「失敗を注入」ボタン）。

### 4.9 S7 — 監視と再計画（フラッピング防止）

```js
// 閾値を超えた変化だけを拾う。小刻みなETA変動で再計画しない
var REPLAN_TRIGGERS = {
  etaWorsenedMin: 20,       // ETAが20分以上悪化
  lockerFull: true,
  calendarShiftMin: 30,
  weatherSevere: true
};
var MAX_REPLANS_PER_PARCEL = 3;   // これを超えたら人間に上げる
```

> 上限に達したら `escalate("too_many_replans")`。**「決められないときは人間に返す」**
> を明示的に実装する。これも信頼設計の一部。

### 4.10 S8 — 記録

決定1件につき、以下を丸ごと残して記録タブに出す。

```js
{
  at, trigger, parcelId,
  context:   { calendar, area, homeEta, world },
  candidates:[ { id, score, breakdown:{wait,cost,walk,risk,net,co2}, successP } ],
  chosen:    "opt_locker_sng",
  approval:  { level:"auto", reason:"within_policy" },
  toolCalls: [ {tool, args, result, ms} ],
  outcome:   "executed" | "confirmed" | "rejected" | "failed",
  undoUntil: "19:58:14"
}
```

**「何をしたか」ではなく「何を知って、なぜそうしたか」を残す。**

---

## 5. ツール面（MCP相当）

`app/providers.js` に**すべてモック**で実装。将来の差し替え点をコメントで明示する。

### 5.1 OS自身が公開するツール（＝これがプロダクト）

| ツール | 引数 | 返り |
|---|---|---|
| `lastmeters.get_policy` | — | ユーザー方針 |
| `lastmeters.set_policy` | patch | 更新後の方針 |
| `lastmeters.list_options` | parcel_id, by?, near? | 受け取れる選択肢の集合 |
| `lastmeters.score_options` | parcel_id, option_ids | スコアと内訳 |
| `lastmeters.check_permission` | parcel_id, option_id | `auto` / `confirm` / `explicit` ＋理由 |
| `lastmeters.commit` | parcel_id, option_id, undo_window_s | grant_id, undo_until |
| `lastmeters.undo` | grant_id | 復元結果 |
| `lastmeters.status` | parcel_id | 現在の計画と状態 |

### 5.2 外部サービス（モック）

```
carrier.get_eta / carrier.reroute
locker.availability / locker.reserve / locker.release
courier.quote / courier.book
calendar.busy_windows
traffic.snapshot / weather.snapshot
payment.authorize / payment.void
av.availability            → 常に { available:false, reason:"not_connected_in_mvp" }
```

### 5.3 画面での見せ方

記録タブと、決定カードの折りたたみに、**実際の呼び出しを等幅で出す**。

```
→ calendar.busy_windows({ date:"2026-09-29" })
← [ { from:"09:00", to:"19:30", label:"Work" } ]

→ locker.availability({ station:"shinagawa", by:"21:00" })
← { available:true, earliest:"20:25", remaining:12, temp:["ambient","chilled","frozen"] }

→ lastmeters.check_permission({ parcel_id:"ord_0034", option_id:"opt_locker_sng" })
← { level:"auto", reason:"within_policy",
    checks:{ extra_cost:"¥0 ≤ ¥300", detour:"+7min ≤ 30min", time:"20:25 ∉ quiet_hours" } }

→ lastmeters.commit({ parcel_id:"ord_0034", option_id:"opt_locker_sng", undo_window_s:300 })
← { grant_id:"rdg_8f2a1c", undo_until:"17:50:41" }
```

> **これが「MCPサーバとして公開する」の一番わかりやすい証拠になる。**
> 抽象的に説明するより、呼び出しログを見せるほうが速い。

---

## 6. 新規ファイルと責務

```
app/policy.js      ユーザー方針のデータ・既定値・localStorage永続化・検証
app/providers.js   モックProvider群 ＋ ツール呼び出しの記録（呼び出しログを貯める）
app/optimizer.js   候補スコアリング・成功確率・単独最適/全体最適の割当（決定論。LLM要素なし）
app/agent.js       S0〜S8のオーケストレーション。権限判定。補償。再計画ガード
```

既存への追記:

```
app/index.html     タブを5つに。方針/全体最適の <section> を追加
app/ui.js          新ビューのレンダリング。決定カード。確認カード。UNDOトースト
app/app.css        新コンポーネントのスタイル（site.css の既存変数のみを使う）
app/engine.js      undo() を追加。agent から呼べるよう assign に { via:"agent" } を通す
app/data.js        POINTS に extraCost / walkMin / detourKm / providerId を追加
```

読み込み順（`index.html` 末尾）:
```html
<script src="data.js"></script>
<script src="policy.js"></script>
<script src="providers.js"></script>
<script src="optimizer.js"></script>
<script src="engine.js"></script>
<script src="agent.js"></script>
<script src="map.js"></script>
<script src="ui.js"></script>
```

---

## 7. ユーザー方針（`app/policy.js`）

### 7.1 既定値

```js
var DEFAULT_POLICY = {
  preferred: "home",              // 既定の受取先
  maxExtraCostJpy: 300,           // これ以内なら黙って払う
  maxRouteDeviationMin: 30,       // 動線からの逸脱の上限
  autoChange: true,               // エージェントによる自動変更を許可
  autoPay: true,                  // 上限内の追加料金を自動で払う
  optimize: "cheapest",           // cheapest | fastest | safest
  quietHours: { from: 23 * 60, to: 7 * 60 },
  intercomAfterQuiet: false,      // 深夜のインターホンを鳴らさない
  shareLocation: "during_pickup", // never | during_pickup | always
  explicitOverJpy: 50000,         // これ以上は必ず本人承認
  undoWindowSec: 300              // 事後通知の取り消し猶予
};
```

### 7.2 方針タブの文言

見出し:
```
ja: 配送の方針（一度だけ設定します）
en: Your delivery policy (set once)
```
補足:
```
ja: 毎回AとBとCから選ぶ必要はありません。方針を決めておけば、あとはエージェントが
    その範囲内で勝手に決めます。範囲の外に出るときだけ聞きます。
en: You do not pick between A, B and C every time. Set the boundaries once and the agent
    decides inside them. It only asks when a choice would fall outside.
```

**必ず並べて出す2つのリスト:**

```
ja: エージェントが黙ってやること
    ・受取時刻を30分以内で変更する
    ・同じ料金の配送業者に切り替える
    ・動線上のロッカーに変更する
en: What the agent does without asking
    ・Shift the pickup time by up to 30 minutes
    ・Switch to a carrier at the same price
    ・Move to a locker already on your route
```
```
ja: 必ず確認すること
    ・追加料金が¥300を超える
    ・動線から30分以上外れる
    ・23:00〜07:00にかかる
    ・現在地の共有範囲が変わる
ja（本人認証が要るもの）
    ・50,000円以上の荷物
    ・医薬品・本人確認が必要な荷物
    ・他人への受取委任
en: What it always asks about
    ・More than ¥300 extra
    ・More than 30 minutes off your route
    ・Anything between 23:00 and 07:00
    ・A change in what location data is shared
en (requires you in person)
    ・Parcels over ¥50,000
    ・Medicine and ID-required parcels
    ・Delegating receipt to someone else
```

---

## 8. 決定カード・確認カード・UNDOの文言

### 8.1 自動実行（事後通知）— 既存の `.banner.ok` を使う

```
ja 見出し: 受取先を変更しました
en 見出し: Delivery updated

ja 本文:
  ノートPCアクセサリ
  自宅配送 23:10 → 品川駅ロッカー 20:25

  自宅着が23:10になる見込みでした。品川駅はあなたの帰り道にあり、
  追加料金はかかりません。徒歩+7分で、2時間45分早く受け取れます。

  追加料金 ¥0（方針: ¥300以内）
  逸脱 +7分（方針: 30分以内）
  時刻 20:25（方針: 23:00より前）

en 本文:
  Laptop accessory
  Home delivery 23:10 → Shinagawa Station locker 20:25

  Home delivery would have arrived at 23:10. Shinagawa Station is already on your way
  home and costs nothing extra. Seven more minutes of walking, two hours 45 minutes sooner.

  Extra cost ¥0 (policy: ≤ ¥300)
  Detour +7 min (policy: ≤ 30 min)
  Time 20:25 (policy: before 23:00)

ボタン:
  ja: 元に戻す / en: Undo          ← 残り 4:32 のカウントダウンを併記
  ja: 判断の内訳を見る / en: See how it decided   ← 折りたたみ展開
```

> **カウントダウンが0になったら「確定しました」に変わり、Undoボタンを消す。**
> 取り消せる間は聞かない・取り消せなくなったら確定を伝える、を目に見える形にする。

### 8.2 確認が必要（例外）— 既存の `.banner.warn`（無ければ site.css に1つだけ追加）

```
ja 見出し: 判断をお願いします
en 見出し: Needs your decision

ja 本文:
  通常配送では23:10になります。
  渋谷駅ロッカーなら20:10に受け取れますが、追加料金が¥450かかり、
  帰り道から25分外れます。

  どちらもあなたの方針（¥300以内・30分以内）の外なので、自動では決めません。

en 本文:
  Normal delivery arrives at 23:10.
  The Shibuya Station locker is available at 20:10, but it costs ¥450 extra and
  takes you 25 minutes off your route.

  Both fall outside your policy (≤ ¥300, ≤ 30 min), so the agent will not decide this one.

ボタン（2つだけ。3案を並べない）:
  ja: 今のままにする / en: Keep current delivery
  ja: ¥450払って渋谷にする / en: Pay ¥450 and switch to Shibuya
```

### 8.3 何もしなかったとき

```
ja: 今日は変更の必要がありませんでした。自宅配送 19:40 のままです。
en: Nothing needed changing today. Home delivery at 19:40 stands.
```

---

## 9. エージェントの「考え中」表示

2秒以内。`prefers-reduced-motion: reduce` のときは**全ステップを一度に出す**。

```
ja: 予定と現在地を確認しています…      en: Reading your calendar and location…
ja: 配送ネットワークを確認しています…  en: Checking the delivery network…
ja: 候補を評価しています…              en: Scoring the options…
ja: 方針と権限を照合しています…        en: Checking your policy and permissions…
ja: 実行しています…                    en: Executing…
```

各行に、**その行が呼んだツール名**を等幅小文字で併記する（`calendar.busy_windows` 等）。
「AIが考えている」ではなく「何を呼んだか」が見えることが重要。

スキップボタン: `ja: 早送り / en: Skip`

---

## 10. アーキテクチャ図（インラインSVG・ライブラリ禁止）

方針タブの末尾、または新規セクションに置く。3層とMCP境界を描く。

```
USER CONTEXT          DELIVERY AGENT              PROVIDERS / TOOLS
─────────────         ──────────────              ─────────────────
Calendar         ┐    Context understanding   ┐   Carrier API
Location (coarse)├──▶ Tool selection          ├──▶ Locker API
Preferences      │    Permission engine       │   Local courier API
Package info     ┘    Exception handling      │   Traffic / Weather
                          │                   │   Payment API
                          ▼                   │   Autonomous vehicle
                  OPTIMIZATION ENGINE         │     (not connected yet)
                  Routing / Capacity / Cost   │
                  ETA / Success probability   │
                  Network-wide assignment     ┘
                                        ▲
                                   MCP / API
```

**MCP / API のラベルを、AgentとProvidersの間に必ず置く。**

デスクトップは横3カラム、モバイルは縦フロー。`viewBox` を切り替えず、
**同じSVGをCSSのflex/gridで組む**（SVGは各ボックス内のアイコンのみ）ほうが
レスポンシブが壊れないので、そちらを推奨。

---

## 11. 「OpenAIに聞きたいこと」セクション

配置: `/pitch/` の末尾と、`/launchpad/` の両方。デモ（`/app/`）には置かない。

```
Q1  Where should the boundary sit between autonomous agent actions and explicit
    user confirmation?
Q2  How would you design trust and permissions for an agent that can access a user's
    location, calendar, purchase history, payments and delivery services on their behalf?
Q3  How should an agent safely orchestrate multiple real-world services through APIs
    or MCP servers — tool selection, state, failure recovery, auditability?
Q4  How should an agent balance individual user preference against network-wide
    optimization when they conflict?
Q5  What is the smallest MVP that would prove agentic delivery orchestration is valuable?
```

締めの一枚（大きく）:

```
The question is not "How can AI deliver a package?"
The question is "How should an AI agent coordinate the physical world
on behalf of a user?"
```

日本語併記:
```
問いは「AIがどうやって荷物を届けるか」ではない。
「AIエージェントが、人の代理で現実世界をどう調整すべきか」である。
```

---

## 12. MVPの範囲（画面にも明記する）

```
ja  最小構成
    東京の1エリア / EC 1社 / 配送事業者 1社 / ロッカー 1社 / 100〜500人
    入力は「ユーザーの申告」「カレンダー」「配送状況」「ロッカーの空き」だけ

    やらないこと
    常時GPS追跡 / 自動運転の統合 / ロボット / 大手3社の統合

en  Smallest version
    One district in Tokyo, one merchant, one carrier, one locker operator, 100–500 users.
    Inputs: stated preferences, calendar, delivery status, locker availability.

    Deliberately not in scope
    Continuous GPS tracking, autonomous vehicles, robots, major-carrier integration.
```

> **常時GPS追跡をやらないことを、能力不足ではなく設計判断として書く。**
> 「位置情報を渡してまで使うか」が最大の反証ポイントなので、最初から渡させない設計にする。

---

## 13. ビジネスモデル（説明用の仮定であることを必ず明記）

```
EC事業者 ─▶ Delivery OS ─▶ 配送事業者 ─▶ 消費者

Illustrative example（説明のための仮定であり、実測値ではありません）

  通常配送             ¥100
  不在 → 再配達        +¥300

  Delivery OS で再配達を防いだ場合
    削減             ¥300
    OS成功報酬       ¥100
    配送事業者の純益 ¥200
    消費者の負担     ¥0

主要KPI  Cost per avoided redelivery（再配達1件を防ぐのにかかった費用）
補助KPI  初回配達成功率 / 再配達率 / 配送コスト /
         ユーザー介入率 / 自動実行率 / 平均逸脱 / 満足度
```

`Illustrative example / 説明のための仮定` のラベルを**必ず**併記する。断定しない。

---

## 14. スケール

```
Tokyo ──▶ Japan ──▶ Global

日本の接続先        米国の接続先
大手キャリア        UPS / FedEx
地域配送            地域クーリエ
駅・街のロッカー    ロッカー
自転車便            ラストマイル配達
将来の自動運転      自動運転

Different countries. Different providers. Same orchestration layer.
国が変わり、事業者が変わっても、オーケストレーション層は変わらない。
```

> **Waymoを作る必要はない。Waymoを接続できるOSを作る。**
> 画面上では自動運転を `Provider #7 — not connected yet` として**灰色で1行だけ**出す。
> 目立たせない。接続先の一つに過ぎない、という位置づけがそのままメッセージになる。

---

## 15. 実装順序

1. `policy.js`（方針の型と既定値・永続化）
2. `providers.js`（モックProviderとツール呼び出しログ）
3. `optimizer.js`（候補スコアリングと成功確率）
4. `agent.js`（S1〜S5。まず正常系だけ通す）
5. `index.html` / `ui.js` / `app.css`（方針タブ → 決定カード → UNDO）
6. 例外シナリオ（`confirm` 経路）
7. `optimizer.js` に全体最適を追加 → 全体最適タブ
8. 記録タブにツール呼び出しログと「失敗を注入」
9. `/pitch/` と `/launchpad/` に「OpenAIに聞きたいこと」
10. アーキテクチャ図
11. 検証（§16）

**各段階で動く状態を保つこと。** 5まで通れば最低限デモできる。

---

## 16. 受け入れ基準

実装後、以下を**実際にブラウザで確認**してから完了とする
（Playwrightが利用可能。`NODE_PATH=/opt/node22/lib/node_modules` で実行）。

### 機能

- [ ] 方針タブで `maxExtraCostJpy` を ¥300 → ¥500 に変えると、例外シナリオが
      `confirm` から `auto` に変わる（**方針が実際に効いていることの証明**）
- [ ] 正常系「Run Demo」で `opt_locker_sng` が選ばれ、UNDOトーストが出る
- [ ] UNDOを押すと自宅配送に戻り、記録に `undo` が残る
- [ ] UNDOのカウントダウンが0になるとボタンが消え「確定」に変わる
- [ ] 「例外を見る」で `opt_locker_sby` しか残らず、確認カードが出る。**ボタンは2つ**
- [ ] 処方薬（`ord_0032`）を対象にすると `explicit` になる
- [ ] スマートウォッチ（`ord_0034` / ¥68,000）も `explicit` になる
- [ ] 「失敗を注入」でキャリア変更が失敗し、**ロッカー予約が解放される**ログが残る
- [ ] 全体最適タブで、単独最適と全体最適の4指標が異なる値になる
- [ ] 健全なケースでは `action:"none"` になり、「変更の必要はありませんでした」が出る
- [ ] 記録タブに、実際のツール呼び出しが引数付きで出る
- [ ] 既存機能（地図の選択、受渡し記録、言語切替）が壊れていない

### 表示

- [ ] 320 / 375 / 768 / 1280px で横スクロールが出ない
- [ ] en / ja / 併記の3モードすべてで、文言の欠落がない
- [ ] `prefers-reduced-motion: reduce` で思考アニメーションが一括表示になる
- [ ] コンソールエラー 0件
- [ ] 各ページの `<h1>` が1つ。見出しレベルの飛びがない
- [ ] 生の hex を新規に増やしていない（site.css の変数を使っている）
- [ ] ライトテーマとダークテーマの両方で読める

### 検証コマンド

```bash
python3 -m http.server 8899 --bind 127.0.0.1   # ローカルプレビュー
npx wrangler deploy --dry-run                  # 設定の妥当性（認証不要）
```

`npm run lint` / `npm run build` は**存在しないので実行しない**。

---

## 17. 完了時に報告すること

1. 追加・変更したファイル
2. デモの操作手順（クリックの順序）
3. モックデータの場所と、実APIへの差し替え点
4. 受け入れ基準のうち通ったもの／通らなかったもの
5. 意図的に実装しなかったもの（あれば理由）

---

## 18. 全体を通して伝えるべきこと

> **NOT** — 「今いる場所に荷物を持ってきてくれるサービス」
> **BUT** — 「時間・場所・配送手段・コスト・ユーザーの方針・網全体の効率を、
> 継続的に組み替え続けるレイヤー」

> **Packages adapt to people.**

> **Use AI for judgment and orchestration, not for deterministic logistics calculations.**
