/* ==========================================================================
   DELIVERY OS — Provider層 / mocked providers and the tool registry (ja + en)

   配送OSが外の世界に触るための窓口。キャリア、ロッカー、自転車便、
   カレンダー、交通、天気、決済、そして将来の自動運転車。
   ここは全部モック。実APIやMCPサーバーに差し替えるのはこのファイルだけで済む。

   呼び出しは必ず call() を通す。引数と結果と所要時間がログに残り、
   画面の「エージェントが実際に呼んだもの」はそのログを表示している。
   ========================================================================== */
window.LM_PROVIDERS = (function () {
  var D = window.LM_DATA;

  /* ---------- 今日のユーザー ----------------------------------------------
     カレンダーと推定動線。MVPでは常時GPS追跡は持たない（意図的に持たない）。 */
  var USER = {
    area: { ja: "SoMa（サンフランシスコ）", en: "SoMa, San Francisco" },
    calendar: [
      { fromMin: 9 * 60, toMin: 19 * 60 + 30, label: { ja: "勤務", en: "Work" } }
    ],
    route: [
      { ja: "オフィス", en: "Office" },
      { ja: "モンゴメリー駅", en: "Montgomery St Station" },
      { ja: "自宅", en: "Home" }
    ],
    homeEtaMin: 22 * 60 + 40            // 22:40 帰宅見込み
  };

  var WORLD = {
    traffic: { ja: "やや混雑", en: "Moderate" },
    weather: { ja: "晴れ", en: "Clear" }
  };

  /* ---------- 受取地点ごとの供給側の条件 ----------------------------------
     earliestMin  その地点で「受け取れる」いちばん早い時刻（分）
     extraCost    追加料金（円）
     walkMin      受取人が余分に歩く／待つ時間（分）
     detourKm     配送網側の追加走行（km）
     onRoute      受取人の帰り道の上にあるか（成功率の補正に使う）        */
  var SUPPLY = {
    home_door:      { provider: "carrier_a",    earliestMin: 23 * 60 + 10, extraCost: 0,   walkMin: 0,  detourKm: 0,   onRoute: true },
    home_locker:    { provider: "building_ops", earliestMin: 23 * 60 + 10, extraCost: 0,   walkMin: 1,  detourKm: 0,   onRoute: true },
    station_locker: { provider: "locker_net",   earliestMin: 20 * 60 + 25, extraCost: 0,   walkMin: 7,  detourKm: 0.3, onRoute: true },
    konbini:        { provider: "konbini_net",  earliestMin: 21 * 60 + 5,  extraCost: 0,   walkMin: 11, detourKm: 0.6, onRoute: true },
    /* 受付は18:00で閉まる。いまは18:02なので、次に預かれるのは翌朝。
       断るのではなく「ずっと先」として出す（デモを止めないため）。 */
    office:         { provider: "office_desk",  earliestMin: 33 * 60 + 30, extraCost: 0,   walkMin: 2,  detourKm: 0,   onRoute: false },
    moving_me:      { provider: "courier_bike", earliestMin: 20 * 60 + 5,  extraCost: 1.8, walkMin: 3,  detourKm: 2.8, onRoute: true },
    friend:         { provider: "carrier_a",    earliestMin: 21 * 60 + 40, extraCost: 0,   walkMin: 14, detourKm: 1.2, onRoute: false },
    indoor:         { provider: "robot_ops",    earliestMin: 23 * 60 + 30, extraCost: 4, walkMin: 0,  detourKm: 0,   onRoute: true }
  };

  /* 例外シナリオ用の差し替え。
     駅ロッカーが満杯になり、残るのは料金も距離も方針の外という状態を作る。
     ここで初めて「エージェントが自分では決めない」が発動する。 */
  var SURGE = {
    station_locker: { full: true },
    konbini: {
      earliestMin: 20 * 60 + 10, extraCost: 4.5, walkMin: 25, detourKm: 1.8,
      label: { ja: "1.8km先のストア", en: "Corner store 1.8 km away" }
    },
    moving_me: { extraCost: 6.2 }
  };

  var PROVIDER_NAMES = {
    carrier_a:    { ja: "大手キャリアA", en: "Carrier A" },
    building_ops: { ja: "マンション管理", en: "Building operations" },
    locker_net:   { ja: "駅ロッカー事業者", en: "Station locker network" },
    konbini_net:  { ja: "コンビニチェーン", en: "Convenience store chain" },
    office_desk:  { ja: "勤務先の受付", en: "Office reception" },
    courier_bike: { ja: "地域自転車便", en: "Local bicycle courier" },
    robot_ops:    { ja: "配送ロボット運行者", en: "Delivery robot operator" },
    av_fleet:     { ja: "自動運転車（未接続）", en: "Autonomous vehicle (not connected)" }
  };

  var mode = "normal";   // "normal" | "surge"
  function setMode(m) { mode = m === "surge" ? "surge" : "normal"; }
  function getMode() { return mode; }

  /** その地点の今の条件。例外モードなら差し替えを重ねる。 */
  function supplyFor(pointId) {
    var base = SUPPLY[pointId];
    if (!base) return null;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (mode === "surge" && SURGE[pointId]) {
      var s = SURGE[pointId];
      Object.keys(s).forEach(function (k) { out[k] = s[k]; });
    }
    /* 道の上にピンを差したときだけ、そこまでの徒歩時間を実際の距離から出す。
       追従ピン（既定）のままなら触らない。 */
    if (pointId === "moving_me" && D.PIN && D.PIN.kind === "street") {
      out.walkMin = Math.max(1, Math.round((D.PIN.walkM || 0) / 75));
      out.label = D.PIN.label;
    }
    return out;
  }

  /* ---------- ツールの呼び出しログ --------------------------------------
     画面に出すのはこのログ。「AIが考えている」ではなく「何を呼んだか」を見せる。 */
  var log = [];
  var registry = {};

  function register(name, fn) { registry[name] = fn; }

  /** すべての外部呼び出しはここを通る。引数・結果・所要時間を残す。 */
  function call(name, args) {
    var fn = registry[name];
    var started = (window.performance && performance.now) ? performance.now() : Date.now();
    var entry = { tool: name, args: args || {}, ms: 0, result: null, error: null };
    try {
      if (!fn) throw new Error("unknown tool: " + name);
      entry.result = fn(args || {});
    } catch (e) {
      entry.error = String(e && e.message ? e.message : e);
    }
    var ended = (window.performance && performance.now) ? performance.now() : Date.now();
    entry.ms = Math.max(1, Math.round(ended - started));
    log.unshift(entry);
    if (log.length > 120) log.pop();
    if (entry.error) throw new Error(entry.error);
    return entry.result;
  }

  function calls(n) { return log.slice(0, n || 20); }
  function clearLog() { log.length = 0; }

  /* ---------- 外部サービス（すべてモック） --------------------------------
     実APIやMCPサーバーに差し替えるときは、この節だけを置き換える。       */

  register("calendar.busy_windows", function () {
    return USER.calendar.map(function (c) {
      return { from: LM_POLICY.hhmm(c.fromMin), to: LM_POLICY.hhmm(c.toMin), label: c.label.en };
    });
  });

  register("location.coarse_area", function () {
    return { area: USER.area.en, precision: "district", live_tracking: false };
  });

  register("carrier.get_eta", function (a) {
    var s = supplyFor(a.point_id || "home_door");
    return s ? { point: a.point_id, eta: LM_POLICY.hhmm(s.earliestMin), provider: s.provider } : null;
  });

  register("locker.availability", function (a) {
    var pt = D.pointById(a.point_id);
    var s = supplyFor(a.point_id);
    if (!pt || !s) return { available: false, reason: "unknown point" };
    if (s.full) return { available: false, reason: "full", remaining: 0 };
    var remaining = pt.capacity ? pt.capacity.total - pt.capacity.used : null;
    return {
      available: remaining === null || remaining > 0,
      earliest: LM_POLICY.hhmm(s.earliestMin),
      remaining: remaining,
      temp: pt.caps.filter(function (c) {
        return c === "ambient" || c === "chilled" || c === "frozen";
      })
    };
  });

  /* 予約は状態を持つ。失敗したときに解放できるようにしておく。 */
  var reservations = {};
  var failNextReroute = false;
  function setFailNextReroute(v) { failNextReroute = !!v; }

  register("locker.reserve", function (a) {
    var s = supplyFor(a.point_id);
    if (!s || s.full) throw new Error("no space at " + a.point_id);
    var id = "rsv_" + a.point_id + "_" + Math.random().toString(36).slice(2, 7);
    reservations[id] = { point_id: a.point_id, parcel_id: a.parcel_id };
    return { reservation_id: id, point_id: a.point_id, until: a.until || null };
  });

  register("locker.release", function (a) {
    delete reservations[a.reservation_id];
    return { released: true, reservation_id: a.reservation_id };
  });

  register("carrier.reroute", function (a) {
    /* 記録タブの「失敗を注入」でここを1回だけ失敗させる。
       部分的に進んだ処理を巻き戻せるかを見せるための仕掛け。 */
    if (failNextReroute) { failNextReroute = false; throw new Error("carrier rejected the reroute (503)"); }
    return { parcel_id: a.parcel_id, destination: a.point_id, accepted: true };
  });

  register("courier.quote", function (a) {
    var s = supplyFor(a.point_id);
    return s ? { price_jpy: s.extraCost, eta: LM_POLICY.hhmm(s.earliestMin) } : null;
  });

  var payments = {};
  register("payment.authorize", function (a) {
    var id = "pay_" + Math.random().toString(36).slice(2, 8);
    payments[id] = { amount: a.amount_jpy, parcel_id: a.parcel_id };
    return { authorization_id: id, amount_jpy: a.amount_jpy, captured: false };
  });
  register("payment.void", function (a) {
    delete payments[a.authorization_id];
    return { voided: true, authorization_id: a.authorization_id };
  });

  register("traffic.snapshot", function () { return { level: WORLD.traffic.en }; });
  register("weather.snapshot", function () { return { condition: WORLD.weather.en }; });

  /* 自動運転車。接続先の1つとして名前だけ出す。作るのではなく、繋ぐ。 */
  register("av.availability", function () {
    return { available: false, reason: "not_connected_in_mvp", provider: "av_fleet" };
  });

  register("notify.user", function (a) {
    return { delivered: true, channel: "app", level: a.level || "info" };
  });

  /* ---------- 候補の一覧 --------------------------------------------------
     受取地点そのものではなく「受け取れる選択肢」を返す。
     同じ地点でも時刻や手段が違えば別の選択肢になる、という形にしておく。 */
  function options(parcel) {
    var out = [];
    D.POINTS.forEach(function (pt) {
      var s = supplyFor(pt.id);
      if (!s || s.full) return;
      out.push({
        id: "opt_" + pt.id,
        pointId: pt.id,
        point: pt,
        provider: s.provider,
        providerName: PROVIDER_NAMES[s.provider] || { ja: s.provider, en: s.provider },
        label: s.label || pt.name,
        receivableAtMin: s.earliestMin,
        extraCost: s.extraCost,
        walkMin: s.walkMin,
        detourKm: s.detourKm,
        onRoute: s.onRoute
      });
    });
    return out;
  }

  function snapshot() {
    return {
      user: USER,
      world: WORLD,
      mode: mode,
      providers: PROVIDER_NAMES,
      options: options
    };
  }

  function reset() {
    mode = "normal";
    reservations = {};
    payments = {};
    failNextReroute = false;
    clearLog();
  }

  return {
    USER: USER,
    WORLD: WORLD,
    PROVIDER_NAMES: PROVIDER_NAMES,
    register: register,
    call: call,
    calls: calls,
    clearLog: clearLog,
    options: options,
    supplyFor: supplyFor,
    snapshot: snapshot,
    setMode: setMode,
    getMode: getMode,
    setFailNextReroute: setFailNextReroute,
    reset: reset
  };
})();
