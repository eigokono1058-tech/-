/* ==========================================================================
   DELIVERY OS — ユーザーの配送方針 / user delivery policy (ja + en)

   毎回AとBとCから選ばせない。境界だけ先に決めておいて、その内側は
   エージェントが黙って決める。外に出るときだけ聞く。
   ここはその「境界」の定義と保存。UIもエンジンもこの1箇所を読む。
   ========================================================================== */
window.LM_POLICY = (function () {
  var KEY = "lm-policy-v1";

  var DEFAULTS = {
    preferred: "home_door",          // 既定の受取先
    maxExtraCostJpy: 3,            // これ以内なら黙って払う
    maxRouteDeviationMin: 30,        // 動線からの逸脱の上限（徒歩＋待ちの分）
    autoChange: true,                // エージェントによる自動変更を許可する
    autoPay: true,                   // 上限内の追加料金を自動で払う
    optimize: "cheapest",            // cheapest | fastest | safest
    quietFromMin: 23 * 60,           // 静かにしてほしい時間帯のはじまり
    quietToMin: 7 * 60,              // 〃 おわり
    shareLocation: "during_pickup",  // never | during_pickup | always
    explicitOverJpy: 500,          // これ以上の荷物は必ず本人が承認する
    undoWindowSec: 300               // 事後通知の取り消し猶予
  };

  /* 画面に出す説明。値そのものではなく「何が起きるか」を書く。 */
  var LABELS = {
    preferred: {
      title: { ja: "ふだんの受取先", en: "Where you normally receive" },
      note: {
        ja: "条件が合うかぎりここに届けます。",
        en: "Parcels go here whenever it works."
      }
    },
    maxExtraCostJpy: {
      title: { ja: "黙って払っていい追加料金", en: "Extra cost it may spend without asking" },
      note: {
        ja: "これを超える変更は必ず確認します。",
        en: "Anything above this is always confirmed with you."
      }
    },
    maxRouteDeviationMin: {
      title: { ja: "帰り道から外れてよい時間", en: "How far off your route it may take you" },
      note: {
        ja: "徒歩と待ち時間の合計。これを超えると確認します。",
        en: "Walking plus waiting. Beyond this it asks."
      }
    },
    optimize: {
      title: { ja: "迷ったときの優先", en: "What to prioritise when it is a close call" },
      note: {
        ja: "候補の点数のつけ方が変わります。",
        en: "This changes how the options are scored."
      }
    },
    quiet: {
      title: { ja: "静かにしてほしい時間帯", en: "Quiet hours" },
      note: {
        ja: "この時間帯に受け取ることになる案は、自動では選びません。",
        en: "It will not pick an option that lands in this window on its own."
      }
    },
    shareLocation: {
      title: { ja: "現在地をどこまで渡すか", en: "How much location you hand over" },
      note: {
        ja: "「受取直前だけ」が既定。追従ピンはこの設定が要ります。",
        en: "Default is pickup-time only. The following pin needs this."
      }
    },
    explicitOverJpy: {
      title: { ja: "必ず本人が承認する金額", en: "Always needs you in person above" },
      note: {
        ja: "方針では上書きできません。医薬品と本人確認が要る荷物も同じです。",
        en: "Cannot be overridden by policy. Same for medicine and ID-required parcels."
      }
    }
  };

  var OPTIMIZE_OPTS = [
    { v: "cheapest", l: { ja: "安さ", en: "Cost" } },
    { v: "fastest", l: { ja: "早さ", en: "Speed" } },
    { v: "safest", l: { ja: "確実さ", en: "Certainty" } }
  ];

  var SHARE_OPTS = [
    { v: "never", l: { ja: "渡さない", en: "Never" } },
    { v: "during_pickup", l: { ja: "受取直前だけ", en: "Only at pickup" } },
    { v: "always", l: { ja: "常に", en: "Always" } }
  ];

  /* エージェントが黙ってやること / 必ず聞くこと。方針タブに並べて出す。 */
  function summary(p) {
    return {
      silent: [
        {
          ja: "受取時刻を" + p.maxRouteDeviationMin + "分以内で前後させる",
          en: "Shift the pickup time by up to " + p.maxRouteDeviationMin + " minutes"
        },
        { ja: "同じ料金の配送業者に切り替える", en: "Switch to a carrier at the same price" },
        {
          ja: "帰り道にあるロッカーや店舗に変更する（追加 ¥" + p.maxExtraCostJpy + " まで）",
          en: "Move to a locker or store already on your route (up to ¥" + p.maxExtraCostJpy + ")"
        }
      ],
      confirm: [
        { ja: "追加料金が $" + p.maxExtraCostJpy + " を超える", en: "More than $" + p.maxExtraCostJpy + " extra" },
        {
          ja: "帰り道から " + p.maxRouteDeviationMin + "分以上 外れる",
          en: "More than " + p.maxRouteDeviationMin + " minutes off your route"
        },
        {
          ja: hhmm(p.quietFromMin) + "〜" + hhmm(p.quietToMin) + " にかかる",
          en: "Anything between " + hhmm(p.quietFromMin) + " and " + hhmm(p.quietToMin)
        },
        { ja: "現在地の共有範囲が変わる", en: "A change in what location data is shared" }
      ],
      explicit: [
        {
          ja: "$" + p.explicitOverJpy.toLocaleString() + " 以上の荷物",
          en: "Parcels over $" + p.explicitOverJpy.toLocaleString()
        },
        { ja: "医薬品・本人確認が必要な荷物", en: "Medicine and ID-required parcels" },
        { ja: "他人への受取委任", en: "Delegating receipt to someone else" },
        { ja: "すでに受渡しが始まっている荷物", en: "A parcel whose handover has already started" }
      ]
    };
  }

  function hhmm(min) {
    var m = ((min % 1440) + 1440) % 1440;
    return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2);
  }

  /* ---------- 読み書き ---------- */
  var current = null;

  /** 保存された値は信用しない。型と範囲を見て、壊れていれば既定に戻す。 */
  function sanitize(raw) {
    var p = {};
    Object.keys(DEFAULTS).forEach(function (k) { p[k] = DEFAULTS[k]; });
    if (!raw || typeof raw !== "object") return p;

    if (typeof raw.preferred === "string" && window.LM_DATA &&
        window.LM_DATA.pointById(raw.preferred)) p.preferred = raw.preferred;
    p.maxExtraCostJpy = clampInt(raw.maxExtraCostJpy, 0, 50, DEFAULTS.maxExtraCostJpy);
    p.maxRouteDeviationMin = clampInt(raw.maxRouteDeviationMin, 0, 120, DEFAULTS.maxRouteDeviationMin);
    p.explicitOverJpy = clampInt(raw.explicitOverJpy, 0, 10000, DEFAULTS.explicitOverJpy);
    p.undoWindowSec = clampInt(raw.undoWindowSec, 30, 3600, DEFAULTS.undoWindowSec);
    p.quietFromMin = clampInt(raw.quietFromMin, 0, 1439, DEFAULTS.quietFromMin);
    p.quietToMin = clampInt(raw.quietToMin, 0, 1439, DEFAULTS.quietToMin);
    if (typeof raw.autoChange === "boolean") p.autoChange = raw.autoChange;
    if (typeof raw.autoPay === "boolean") p.autoPay = raw.autoPay;
    if (has(OPTIMIZE_OPTS, raw.optimize)) p.optimize = raw.optimize;
    if (has(SHARE_OPTS, raw.shareLocation)) p.shareLocation = raw.shareLocation;
    return p;
  }

  function clampInt(v, lo, hi, dflt) {
    var n = Number(v);
    if (!isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, Math.round(n)));
  }
  function has(opts, v) {
    for (var i = 0; i < opts.length; i++) if (opts[i].v === v) return true;
    return false;
  }

  function get() {
    if (current) return current;
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { raw = null; }
    current = sanitize(raw);
    return current;
  }

  /** 一部だけ差し替える。保存できなくても（プライベートモード等）動作は続ける。 */
  function set(patch) {
    var next = {};
    var p = get();
    Object.keys(p).forEach(function (k) { next[k] = p[k]; });
    Object.keys(patch || {}).forEach(function (k) { next[k] = patch[k]; });
    current = sanitize(next);
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) { /* 保存できなくても続ける */ }
    return current;
  }

  function reset() {
    current = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return get();
  }

  /** ある時刻が「静かにしてほしい時間帯」に入るか。日をまたぐ指定も扱う。 */
  function inQuietHours(min, p) {
    p = p || get();
    var m = ((min % 1440) + 1440) % 1440;
    if (p.quietFromMin === p.quietToMin) return false;
    if (p.quietFromMin < p.quietToMin) return m >= p.quietFromMin && m < p.quietToMin;
    return m >= p.quietFromMin || m < p.quietToMin;   // 23:00→07:00 のように日をまたぐ場合
  }

  return {
    DEFAULTS: DEFAULTS,
    LABELS: LABELS,
    OPTIMIZE_OPTS: OPTIMIZE_OPTS,
    SHARE_OPTS: SHARE_OPTS,
    get: get,
    set: set,
    reset: reset,
    summary: summary,
    inQuietHours: inQuietHours,
    hhmm: hhmm
  };
})();
