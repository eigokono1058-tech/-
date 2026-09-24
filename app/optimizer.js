/* ==========================================================================
   DELIVERY OS — 最適化エンジン / optimization engine (ja + en)

   ここは決定論。LLM的なものは一切入れない。
   候補に点をつけ、容量と車両の制約の下で全体の割当を決める、それだけ。
   「判断と調整はAIに、物流の計算はふつうのコードに」という切り分けの、
   後半にあたる層。

   点数は「小さいほど損」ではなく「大きいほど良い」で揃える（score は負の損失）。
   ========================================================================== */
window.LM_OPT = (function () {

  /* 方針の「迷ったときの優先」で重みが変わる。
     wait  受け取れるまでの待ち時間 / cost 追加料金 / walk 寄り道
     risk  受け取れない確率 / net 配送網への負荷 / co2 追加走行の排出 */
  var WEIGHTS = {
    cheapest: { wait: 0.5, cost: 3.0, walk: 0.8, risk: 2.0, net: 1.0, co2: 0.3 },
    fastest:  { wait: 3.0, cost: 0.5, walk: 1.2, risk: 2.0, net: 0.6, co2: 0.2 },
    safest:   { wait: 0.8, cost: 0.8, walk: 0.6, risk: 6.0, net: 0.8, co2: 0.3 }
  };

  /* 受取成功率は表引き＋補正で出す。モデルに確率を言わせない。
     画面ではこの内訳をそのまま開けるようにして、「なぜその数字か」を見せる。 */
  var BASE_SUCCESS = {
    home_door: 0.62, home_locker: 0.88, konbini: 0.94, station_locker: 0.96,
    office: 0.81, friend: 0.75, moving_me: 0.70, indoor: 0.90
  };

  /* 自宅で受け取る場合、帰宅より後に届くのは「良いこと」。
     逆に帰宅前に届くと不在になる。符号を分けて持つ。 */
  var FACTORS = {
    onRoute:     { delta: +0.06, label: { ja: "帰り道の上にある", en: "On your route home" } },
    homeAfterEta:{ delta: +0.28, label: { ja: "帰宅後に届く", en: "Arrives after you get home" } },
    notHomeYet:  { delta: -0.20, label: { ja: "帰宅前に届いてしまう", en: "Arrives before you get home" } },
    farWalk:     { delta: -0.10, label: { ja: "徒歩15分を超える", en: "More than 15 minutes on foot" } },
    almostFull:  { delta: -0.15, label: { ja: "空きが残り1枠", en: "Only one slot left" } },
    lateNight:   { delta: -0.25, label: { ja: "静かにしてほしい時間帯に本人対応が要る", en: "Needs you awake during quiet hours" } },
    coldChain:   { delta: -0.05, label: { ja: "温度帯の維持が要る", en: "Needs the cold chain held" } }
  };

  /* 自宅そのもので受け取る地点か（帰宅時刻が効くのはここだけ） */
  var AT_HOME = { home_door: true, home_locker: true, indoor: true };

  function clamp01(v) { return Math.max(0.05, Math.min(0.99, v)); }

  /* 「その時刻に本人がそこに居る必要があるか」。
     静かにしてほしい時間帯が効くのはここが true のときだけ。
     ロッカーや店舗は、都合のいいときに取りに行けるので夜でも構わない。 */
  function needsPresence(parcel, opt) {
    var pt = opt.point;
    if (pt.dynamic) return true;                           // ピンでの合流は本人が要る
    if (pt.id === "home_door") return !(parcel && parcel.dropAllowed);
    if (pt.caps.indexOf("secure") !== -1) return false;    // 施錠された箱に入る
    if (pt.caps.indexOf("attended") !== -1) return false;  // 人が預かってくれる
    return true;
  }

  /** 受け取れる確率と、その内訳。 */
  function successProbability(opt, ctx) {
    var base = BASE_SUCCESS[opt.pointId];
    if (base == null) base = 0.8;
    var applied = [];
    var p = base;

    function apply(key, on) {
      if (!on) return;
      p += FACTORS[key].delta;
      applied.push({ key: key, label: FACTORS[key].label, delta: FACTORS[key].delta });
    }

    var atHome = !!AT_HOME[opt.pointId];
    var presence = needsPresence(ctx.parcel, opt);

    apply("onRoute", opt.onRoute && !atHome);
    apply("homeAfterEta", atHome && ctx.homeEtaMin && opt.receivableAtMin >= ctx.homeEtaMin);
    apply("notHomeYet", atHome && ctx.homeEtaMin && opt.receivableAtMin < ctx.homeEtaMin);
    apply("farWalk", opt.walkMin > 15);
    apply("almostFull", opt.point.capacity &&
      (opt.point.capacity.total - opt.point.capacity.used) <= 1);
    apply("lateNight", presence && window.LM_POLICY &&
      LM_POLICY.inQuietHours(opt.receivableAtMin, ctx.policy));
    apply("coldChain", ctx.parcel && ctx.parcel.temp !== "ambient");

    return { base: base, applied: applied, p: clamp01(p) };
  }

  /** 配送網への負荷。ロッカーの逼迫と車両の追加走行。 */
  function networkLoad(opt) {
    var pressure = 0;
    if (opt.point.capacity && opt.point.capacity.total) {
      pressure = (opt.point.capacity.used / opt.point.capacity.total) * 20;
    }
    return pressure + opt.detourKm * 4;
  }

  /** 候補1件の点数と内訳。大きいほど良い。 */
  function score(opt, ctx) {
    var w = WEIGHTS[ctx.policy.optimize] || WEIGHTS.cheapest;
    var sp = successProbability(opt, ctx);

    var waitMin = Math.max(0, opt.receivableAtMin - ctx.nowMin);
    var detour = opt.walkMin + opt.detourKm * 3;
    var risk = 1 - sp.p;
    var net = networkLoad(opt);
    var co2 = opt.detourKm * 0.18;

    var parts = {
      wait: w.wait * waitMin,
      cost: w.cost * (opt.extraCost / 100),
      walk: w.walk * detour,
      risk: w.risk * risk * 100,
      net:  w.net * net,
      co2:  w.co2 * co2
    };
    var loss = parts.wait + parts.cost + parts.walk + parts.risk + parts.net + parts.co2;

    return {
      value: -loss,
      parts: parts,
      waitMin: waitMin,
      detourMin: detour,
      successP: sp.p,
      success: sp,
      co2Kg: co2
    };
  }

  /** 候補をまとめて採点して並べる。良い順。 */
  function rank(opts, ctx) {
    var scored = opts.map(function (o) {
      var s = score(o, ctx);
      var out = { option: o, score: s.value, detail: s };
      return out;
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored;
  }

  /* ======================================================================
     全体最適のデモ
     1人だけを最適化すると配送網が壊れる、を並べて見せるための固定シナリオ。
     受取人の「受け取れる場所の集合」と、車両とロッカーの制約を持つ。
     ====================================================================== */
  var NET_HUBS = {
    shibuya:   { id: "shibuya",   name: { ja: "渋谷ロッカー", en: "Shibuya locker" },   free: 2,  vehicle: "v1" },
    shinjuku:  { id: "shinjuku",  name: { ja: "新宿ロッカー", en: "Shinjuku locker" },  free: 10, vehicle: "v1" },
    shinagawa: { id: "shinagawa", name: { ja: "品川ロッカー", en: "Shinagawa locker" }, free: 10, vehicle: "v2" }
  };

  var NET_VEHICLES = {
    v1: { id: "v1", name: { ja: "配送車1（渋谷方面）", en: "Vehicle 1 (towards Shibuya)" }, baseKm: 6.0 },
    v2: { id: "v2", name: { ja: "配送車2（品川方面）", en: "Vehicle 2 (towards Shinagawa)" }, baseKm: 5.4 }
  };

  /* pref は受取人にとっての望ましさ（大きいほど良い）。km は配送側の追加走行。 */
  var NET_USERS = [
    {
      id: "A", name: { ja: "利用者A", en: "User A" },
      can: [
        { hub: "shibuya",  pref: 10, km: 1.2 },
        { hub: "shinjuku", pref: 9,  km: 1.6 }
      ]
    },
    {
      id: "B", name: { ja: "利用者B", en: "User B" },
      can: [
        { hub: "shibuya",  pref: 10, km: 1.0 }
      ]
    },
    {
      id: "C", name: { ja: "利用者C", en: "User C" },
      can: [
        { hub: "shibuya",   pref: 9, km: 3.4 },
        { hub: "shinagawa", pref: 8, km: 1.1 }
      ]
    }
  ];

  /** 1人ずつ、自分にとっての最善だけを見て決める。制約は見ない。 */
  function assignGreedy() {
    return NET_USERS.map(function (u) {
      var best = u.can.slice().sort(function (a, b) { return b.pref - a.pref; })[0];
      return { userId: u.id, user: u, hub: best.hub, km: best.km, pref: best.pref };
    });
  }

  /** 容量と車両の制約の下で、全体の合計が最も良くなる組み合わせを選ぶ。
      候補数が少ないので総当たりで解く。規模が増えたら貪欲＋交換改善に替える。 */
  function assignNetworkAware() {
    var best = null;
    var combos = [[]];
    NET_USERS.forEach(function (u) {
      var next = [];
      combos.forEach(function (c) {
        u.can.forEach(function (c2) {
          next.push(c.concat([{ userId: u.id, user: u, hub: c2.hub, km: c2.km, pref: c2.pref }]));
        });
      });
      combos = next;
    });

    combos.forEach(function (plan) {
      var used = {};
      var ok = true;
      plan.forEach(function (a) { used[a.hub] = (used[a.hub] || 0) + 1; });
      Object.keys(used).forEach(function (h) {
        if (used[h] > NET_HUBS[h].free) ok = false;
      });
      if (!ok) return;

      /* 受取人の望ましさは足し、配送側の追加走行は引く。
         受取人の希望を壊してまで距離を詰めない、という重み付けにしている。 */
      var value = 0;
      plan.forEach(function (a) { value += a.pref * 3 - a.km * 2; });
      if (!best || value > best.value) best = { value: value, plan: plan };
    });

    return best ? best.plan : assignGreedy();
  }

  /** 割当から、画面に出す4つの指標を出す。 */
  function metrics(plan) {
    var used = {};
    var overflow = 0;
    var km = 0;
    var vehicles = {};

    plan.forEach(function (a) {
      used[a.hub] = (used[a.hub] || 0) + 1;
      if (used[a.hub] > NET_HUBS[a.hub].free) {
        /* 枠に入りきらなかった分は自宅配送に押し戻される。
           不在なら再配達になり、走行も費用も増える。 */
        overflow++;
        km += a.km + 4.2;
      } else {
        km += a.km;
      }
      vehicles[NET_HUBS[a.hub].vehicle] = true;
    });

    var total = plan.length;
    var firstTry = total ? Math.round(((total - overflow) / total) * 100) : 0;
    /* 1個あたりの原価。車両の固定費を、その車両が配る個数で割る。 */
    var vCount = Math.max(1, Object.keys(vehicles).length);
    var fixed = 0;
    Object.keys(vehicles).forEach(function (v) { fixed += NET_VEHICLES[v].baseKm * 120; });
    var cost = Math.round(fixed / Math.max(1, total) + km * 46 + overflow * 300);

    return {
      km: Math.round(km * 10) / 10,
      firstTry: firstTry,
      redeliveries: overflow,
      costPerParcel: cost,
      vehiclesUsed: vCount
    };
  }

  function networkScenario() {
    var greedy = assignGreedy();
    var aware = assignNetworkAware();
    return {
      hubs: NET_HUBS,
      vehicles: NET_VEHICLES,
      users: NET_USERS,
      greedy: { plan: greedy, metrics: metrics(greedy) },
      aware: { plan: aware, metrics: metrics(aware) }
    };
  }

  return {
    WEIGHTS: WEIGHTS,
    BASE_SUCCESS: BASE_SUCCESS,
    FACTORS: FACTORS,
    successProbability: successProbability,
    needsPresence: needsPresence,
    networkLoad: networkLoad,
    score: score,
    rank: rank,
    networkScenario: networkScenario,
    NET_HUBS: NET_HUBS,
    NET_USERS: NET_USERS
  };
})();
