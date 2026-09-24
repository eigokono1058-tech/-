/* ==========================================================================
   DELIVERY OS — 街区マップ（自前SVG・外部タイル不要／オフラインでも動く）
   The map is built around one interaction: dropping a pickup pin.

   ・地図をタップする／ピンをドラッグすると、受取ピンがその場所へ移動する。
     配車アプリ（GOタクシー・Uber）で「ここで乗る」を指定するのと同じ操作。
   ・ピンは道路と既存の受取地点にスナップするので、届けられない場所には刺さらない。
   ・「追従」がONのあいだ、ピンは歩いている自分についてくる。＝「ここで受け取る」。
   ・画面上のマーカーは常に同じものが出ている。点滅したり消えたりするものは置かない。
   ========================================================================== */
window.LM_MAP = (function () {
  var D = window.LM_DATA;
  var W = 360, H = 240;
  var M_PER_PX = 1.4; // 地図1px ≒ 1.4m（距離表示のためのスケール）

  function T(v) { return window.LM_I18N ? window.LM_I18N.t(v) : (v && (v.ja || v)) || ""; }

  var svg = null;
  var layers = {};
  var hooks = {};          // { onPick: fn(pointId), onArrive: fn(pointId) }

  /* 受取地点を選べる状態かどうか。選べるときだけ地図が反応する。 */
  var pickable = false;
  var picked = null;

  function setPickable(on) {
    pickable = !!on;
    if (!on) picked = null;
    if (svg) svg.classList.toggle("is-pickable", pickable);
    paintPicked();
  }

  function paintPicked() {
    if (!layers.points) return;
    Array.prototype.forEach.call(layers.points.querySelectorAll(".m-point"), function (g) {
      g.classList.toggle("is-picked", picked === g.getAttribute("data-id"));
    });
  }
  var focusParcel = null;

  /* ---------- 道路（描画とスナップの両方に使う） ---------- */
  var ROADS = [
    { pts: [[-20, -46], [380, -46]], major: true, name: { ja: "ブッシュ通り", en: "Bush St" } },
    { pts: [[-20, 62], [380, 62]], major: true, name: { ja: "パイン通り", en: "Pine St" } },
    { pts: [[-20, 130], [380, 130]], major: true, name: { ja: "マーケット通り", en: "Market St" } },
    { pts: [[-20, 200], [380, 200]], major: true, name: { ja: "ハワード通り", en: "Howard St" } },
    { pts: [[-20, 282], [380, 282]], major: true, name: { ja: "ブライアント通り", en: "Bryant St" } },
    { pts: [[20, -90], [20, 330]], major: true, name: { ja: "エンバカデロ", en: "Embarcadero" } },
    { pts: [[58, -90], [58, 330]], major: true, name: { ja: "バッテリー通り", en: "Battery St" } },
    { pts: [[150, -90], [150, 330]], major: true, name: { ja: "モンゴメリー通り", en: "Montgomery St" } },
    { pts: [[252, -90], [252, 330]], major: true, name: { ja: "カーニー通り", en: "Kearny St" } },
    { pts: [[318, -90], [318, 330]], major: true, name: { ja: "駅前通り", en: "Station Rd." } },
    { pts: [[110, -90], [110, 330]], name: { ja: "西の路地", en: "West Lane" } },
    { pts: [[200, -90], [200, 330]], name: { ja: "中の路地", en: "Mid Lane" } },
    { pts: [[285, -90], [285, 330]], name: { ja: "東の路地", en: "East Lane" } },
    { pts: [[0, 96], [360, 96]], name: { ja: "けやき小路", en: "Keyaki Lane" } },
    { pts: [[0, 165], [360, 165]], name: { ja: "南小路", en: "Minami Lane" } }
  ];

  /* 受取人（自分）の徒歩ルート：駅 → けやき小路 → さくら通り → 自宅の前。
     端まで行くと向きを変えて戻るので、デモ中はずっと「移動中」でいられる。 */
  var WALK = [[318, 86], [318, 96], [252, 96], [200, 96], [150, 96], [150, 78], [150, 70]];
  var WALK_SEC = 80;   // 端から端まで歩く実時間
  var DWELL_SEC = 2.2; // 折り返し前の小休止
  var walkT = 0;
  var walkDir = 1;
  var dwell = 0;

  var EMOJI = {
    home: "🏠", locker: "🔐", store: "🏪", office: "🏢",
    person: "🧑", delegate: "🤝", robot: "🤖"
  };
  var VEHICLE_COLORS = ["#5b8cff", "#2dd4bf", "#a78bfa", "#fbbf24"];

  /* ---------- geometry ---------- */
  function polyLength(pts) {
    var total = 0, segs = [];
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      var len = Math.sqrt(dx * dx + dy * dy);
      segs.push(len);
      total += len;
    }
    return { total: total, segs: segs };
  }
  function pointAt(pts, frac) {
    if (pts.length === 1) return { x: pts[0][0], y: pts[0][1], angle: 0 };
    var m = polyLength(pts);
    var target = Math.max(0, Math.min(1, frac)) * m.total;
    var acc = 0;
    for (var i = 0; i < m.segs.length; i++) {
      if (acc + m.segs[i] >= target || i === m.segs.length - 1) {
        var t = m.segs[i] === 0 ? 0 : (target - acc) / m.segs[i];
        var a = pts[i], b = pts[i + 1];
        return {
          x: a[0] + (b[0] - a[0]) * t,
          y: a[1] + (b[1] - a[1]) * t,
          angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
        };
      }
      acc += m.segs[i];
    }
    var last = pts[pts.length - 1];
    return { x: last[0], y: last[1], angle: 0 };
  }
  function polyPath(pts) {
    return pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" ");
  }
  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
  /** 線分 a–b 上で (px,py) にいちばん近い点 */
  function nearestOnSeg(px, py, a, b) {
    var vx = b[0] - a[0], vy = b[1] - a[1];
    var len2 = vx * vx + vy * vy;
    var t = len2 === 0 ? 0 : ((px - a[0]) * vx + (py - a[1]) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    var x = a[0] + vx * t, y = a[1] + vy * t;
    return { x: x, y: y, d: dist(px, py, x, y) };
  }

  /* 受取先が決まったら、自分はそこへ向かって歩いて、着いたら止まる。
     決まる前だけ、行ったり来たりの「移動中」を続ける。 */
  var heading = null;   // { pts, t, dur, pointId, arrived }

  function personPos() {
    if (heading) return pointAt(heading.pts, heading.t);
    return pointAt(WALK, walkT);
  }

  /** いまいる場所から目的地までの徒歩ルートを引いて、歩き始める。 */
  function walkTo(x, y, pointId) {
    var p = personPos();
    if (heading && heading.pointId === pointId) return;   // 同じ行き先なら引き直さない
    var pts = [[p.x, p.y]];
    if (Math.abs(x - p.x) > 2) pts.push([x, p.y]);        // 通りに沿って横へ
    pts.push([x, y]);                                      // それから目的地へ
    var len = polyLength(pts).total;
    heading = {
      pts: pts, t: 0, pointId: pointId, arrived: false,
      dur: Math.max(5, len / 7)   // 実時間での所要（見やすさ優先）
    };
  }

  function stopWalking() { heading = null; }
  function hasArrived() { return !!(heading && heading.arrived); }
  function headingTo() { return heading ? heading.pointId : null; }

  /* 物流Hubから任意の座標までの走行ルート（大通りを経由して道なりに） */
  function routeToXY(x, y) {
    x = Math.round(x); y = Math.round(y);
    var corridor = y > 165 ? 200 : 130;
    var pts = [[20, 200]];
    if (corridor !== 200) pts.push([20, corridor]);
    pts.push([x, corridor]);
    pts.push([x, y]);
    return pts;
  }
  function etaForRoute(route) {
    return Math.max(4, Math.round(polyLength(route).total / 26) + 2);
  }

  /* ---------- ピンのスナップ ---------- */
  /** 画面上の座標を、実際に届けられる場所（既存の受取地点 or 道路上）へ寄せる */
  function snap(px, py) {
    var best = null;
    D.POINTS.forEach(function (pt) {
      if (pt.dynamic || !pt.xy) return;
      var d = dist(px, py, pt.xy[0], pt.xy[1]);
      if (d <= 15 && (!best || d < best.d)) {
        best = { x: pt.xy[0], y: pt.xy[1], d: d, kind: "point", pointId: pt.id, label: pt.label || pt.name };
      }
    });
    if (best) return best;

    var road = null;
    ROADS.forEach(function (r) {
      var c = nearestOnSeg(px, py, r.pts[0], r.pts[1]);
      if (!road || c.d < road.d) road = { x: c.x, y: c.y, d: c.d, name: r.name };
    });
    return {
      x: Math.round(road.x), y: Math.round(road.y), d: road.d,
      kind: "street", pointId: null, label: road.name
    };
  }

  /** ピンを (px,py) へ。mode を "fixed" にして追従を解除する。 */
  function movePinTo(px, py) {
    var s = snap(px, py);
    writePin({ x: s.x, y: s.y, mode: "fixed", kind: s.kind, pointId: s.pointId, label: s.label, committed: false });
  }

  /** ピンを既存の受取地点へ（一覧から選んだときなど） */
  function setPinToPoint(pointId) {
    var pt = D.pointById(pointId);
    if (!pt) return;
    if (pt.dynamic) { followMe(true); D.PIN.committed = true; return; }
    writePin({
      x: pt.xy[0], y: pt.xy[1], mode: "fixed", kind: "point",
      pointId: pt.id, label: pt.label || pt.name, committed: true
    });
  }

  /** 追従モードの ON / OFF */
  function followMe(on) {
    if (on) {
      var p = personPos();
      writePin({
        x: Math.round(p.x), y: Math.round(p.y), mode: "follow", kind: "me", pointId: null,
        label: { ja: "いまいる場所", en: "Where I am" }, committed: false
      });
    } else {
      movePinTo(D.PIN.x, D.PIN.y);
    }
  }

  function writePin(next) {
    var route = routeToXY(next.x, next.y);
    var p = personPos();
    next.etaMin = etaForRoute(route);
    next.walkM = Math.round(dist(p.x, p.y, next.x, next.y) * M_PER_PX / 5) * 5;
    D.setPin(next);
    if (hooks.onPin) hooks.onPin(D.PIN);
  }

  /** いまのピンが指している受取地点のid（路上ピンは動的地点 moving_me になる） */
  function resolvePin() { return D.PIN.pointId || "moving_me"; }

  /* ---------- build ---------- */
  function el(tag, attrs, text) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function clientToSvg(evt) {
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return { x: D.PIN.x, y: D.PIN.y };
    return {
      x: (evt.clientX - r.left) / r.width * W,
      y: (evt.clientY - r.top) / r.height * H
    };
  }

  function mount(target, h) {
    svg = target;
    hooks = h || {};
    svg.setAttribute("viewBox", "0 -95 " + W + " " + (H + 190));
    svg.innerHTML = "";

    var defs = el("defs");
    defs.innerHTML =
      '<linearGradient id="mapbg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--map-bg-1)"/><stop offset="1" stop-color="var(--map-bg-2)"/></linearGradient>' +
      '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg.appendChild(defs);

    svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#mapbg)" }));

    /* 街区（ブロック） */
    var blocks = el("g", { class: "m-blocks" });
    [
      /* 画面の上下が空かないよう、表示領域の外まで街区を続ける */
      [8, -76, 100, 40], [122, -76, 88, 40], [224, -76, 76, 40], [312, -76, 40, 40],
      [8, -22, 60, 22], [82, -22, 128, 22], [224, -22, 128, 22],
      [8, 8, 100, 36], [122, 8, 88, 36], [224, 8, 60, 36], [298, 8, 54, 36],
      [8, 76, 36, 40], [58, 76, 76, 40], [148, 76, 62, 40], [224, 76, 128, 40],
      [8, 144, 92, 46], [116, 144, 100, 46], [232, 144, 120, 46],
      [40, 212, 130, 22], [186, 212, 166, 22],
      [8, 250, 110, 34], [134, 250, 96, 34], [246, 250, 106, 34],
      [8, 296, 150, 24], [174, 296, 178, 24]
    ].forEach(function (b) {
      blocks.appendChild(el("rect", { x: b[0], y: b[1], width: b[2], height: b[3], rx: 3, class: "m-block" }));
    });
    svg.appendChild(blocks);

    /* 道路 */
    var roads = el("g", { class: "m-roads" });
    ROADS.forEach(function (r) {
      roads.appendChild(el("path", { d: polyPath(r.pts), class: r.major ? "m-road" : "m-road-minor" }));
    });
    svg.appendChild(roads);

    /* 徒歩ルート（自分） */
    svg.appendChild(el("path", { d: polyPath(WALK), class: "m-walk" }));

    layers.routes = el("g", { class: "m-routes" });
    svg.appendChild(layers.routes);

    /* 物流ハブ */
    var depot = el("g", { class: "m-depot" });
    depot.appendChild(el("rect", { x: 6, y: 188, width: 28, height: 24, rx: 4, class: "m-depot-box" }));
    depot.appendChild(el("text", { x: 20, y: 204, class: "m-depot-ico", "text-anchor": "middle" }, "🏭"));
    depot.appendChild(el("text", { x: 20, y: 222, class: "m-label", "text-anchor": "middle" },
      T({ ja: "物流Hub", en: "Depot" })));
    svg.appendChild(depot);

    /* 受取地点：タップするとピンがそこへ移動する（まだ確定はしない） */
    layers.points = el("g", { class: "m-points" });
    D.POINTS.forEach(function (pt) {
      if (pt.dynamic) return;
      var g = el("g", {
        class: "m-point", "data-id": pt.id, tabindex: "0", role: "button",
        "aria-label": T(pt.name)
      });
      g.appendChild(el("circle", { cx: pt.xy[0], cy: pt.xy[1], r: 12, class: "m-point-hit" }));
      g.appendChild(el("circle", { cx: pt.xy[0], cy: pt.xy[1], r: 8.4, class: "m-point-dot" }));
      g.appendChild(el("text", {
        x: pt.xy[0], y: pt.xy[1] + 3.4, class: "m-point-ico", "text-anchor": "middle"
      }, EMOJI[pt.icon] || "📦"));
      g.appendChild(el("text", {
        x: pt.xy[0],
        y: pt.xy[1] + (pt.labelAbove ? -13 : 20),
        class: "m-label",
        "text-anchor": "middle"
      }, T(pt.label || pt.name)));
      function choose(e) {
        if (!pickable) return;
        e.preventDefault();
        e.stopPropagation();
        picked = pt.id;
        paintPicked();
        if (hooks.onPick) hooks.onPick(pt.id);
      }
      g.addEventListener("click", choose);
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") choose(e);
      });
      layers.points.appendChild(g);
    });
    svg.appendChild(layers.points);

    /* 自分（GPS表示。半径は測位精度のつもりで、ずっと同じ大きさで出しておく） */
    layers.person = el("g", { class: "m-person" });
    layers.person.appendChild(el("circle", { cx: 0, cy: 0, r: 13, class: "m-person-acc" }));
    layers.person.appendChild(el("circle", { cx: 0, cy: 0, r: 7, class: "m-person-dot" }));
    layers.person.appendChild(el("text", { x: 0, y: 3, class: "m-point-ico", "text-anchor": "middle" }, "🧑"));
    layers.person.appendChild(el("text", { x: 0, y: 21, class: "m-label", "text-anchor": "middle" },
      T({ ja: "自分", en: "Me" })));
    svg.appendChild(layers.person);

    layers.vehicles = el("g", { class: "m-vehicles" });
    svg.appendChild(layers.vehicles);

    /* 受取ピン：常に1本だけ地図に立っている。消えたり点いたりしない。 */
    layers.pin = el("g", {
      class: "m-pin", tabindex: "0", role: "button",
      "aria-label": T({ ja: "受取ピン。ドラッグで移動、矢印キーでも動かせます", en: "Pickup pin. Drag it, or move it with the arrow keys" })
    });
    layers.pin.appendChild(el("ellipse", { cx: 0, cy: 1.2, rx: 5.4, ry: 2.1, class: "m-pin-shadow" }));
    layers.pin.appendChild(el("path", { d: "M 0 0 L -5.2 -9 A 6 6 0 1 1 5.2 -9 Z", class: "m-pin-body" }));
    layers.pin.appendChild(el("circle", { cx: 0, cy: -12, r: 2.5, class: "m-pin-hole" }));
    layers.pin.appendChild(el("path", {
      d: "M -2.5 -12 L -0.9 -10.3 L 2.6 -13.9", class: "m-pin-check"
    }));
    /* ラベルはピンの足元に置く。頭の上だと、そこにある地点名と必ず重なるため。 */
    layers.pinLabel = el("text", { x: 0, y: 10.5, class: "m-pin-label", "text-anchor": "middle" }, "");
    layers.pin.appendChild(layers.pinLabel);
    layers.pin.appendChild(el("circle", { cx: 0, cy: -10, r: 15, class: "m-pin-hit" }));
    svg.appendChild(layers.pin);

    bindPinInteraction();
    writePin({
      x: D.PIN.x, y: D.PIN.y, mode: D.PIN.mode, kind: D.PIN.kind,
      pointId: D.PIN.pointId, label: D.PIN.label, committed: D.PIN.committed
    });
  }

  /** 地点をタップしたとき：ピンをそこへ置くが、確定はユーザーのボタン操作に任せる */
  function setPinToPointPending(pointId) {
    var pt = D.pointById(pointId);
    if (!pt || !pt.xy) return;
    writePin({
      x: pt.xy[0], y: pt.xy[1], mode: "fixed", kind: "point",
      pointId: pt.id, label: pt.label || pt.name, committed: false
    });
  }

  /* ---------- ドラッグ / タップ ---------- */
  function bindPinInteraction() {
    var dragging = false;
    var downAt = null;

    /* ピンそのものをつかんで動かす（ページのスクロールは奪わない） */
    layers.pin.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      dragging = true;
      layers.pin.classList.add("is-dragging");
      if (layers.pin.setPointerCapture) layers.pin.setPointerCapture(e.pointerId);
    });
    layers.pin.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      e.preventDefault();
      var p = clientToSvg(e);
      movePinTo(p.x, p.y);
    });
    ["pointerup", "pointercancel"].forEach(function (evt) {
      layers.pin.addEventListener(evt, function () {
        if (!dragging) return;
        dragging = false;
        layers.pin.classList.remove("is-dragging");
      });
    });
    layers.pin.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 12 : 4;
      var dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      movePinTo(D.PIN.x + dx, D.PIN.y + dy);
    });

    /* 地図のどこかを「タップ」したらそこへピンを差す。
       指を滑らせた場合はページのスクロールなので無視する。 */
    svg.addEventListener("pointerdown", function (e) {
      if (dragging) return;
      downAt = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    svg.addEventListener("pointerup", function (e) {
      if (dragging || !downAt || downAt.id !== e.pointerId) return;
      var moved = dist(downAt.x, downAt.y, e.clientX, e.clientY);
      downAt = null;
      if (moved > 8) return;
      var p = clientToSvg(e);
      movePinTo(p.x, p.y);
    });
    svg.addEventListener("pointercancel", function () { downAt = null; });
  }

  /* ---------- update ---------- */
  function update(state, dtSec) {
    if (!svg) return;

    if (dtSec) {
      if (heading) {
        /* 受取先が決まっている：そこへ向かって歩き、着いたら止まる */
        if (!heading.arrived) {
          heading.t += dtSec / heading.dur;
          if (heading.t >= 1) {
            heading.t = 1;
            heading.arrived = true;
            if (hooks.onArrive) hooks.onArrive(heading.pointId);
          }
        }
      } else if (dwell > 0) {
        dwell -= dtSec;
      } else {
        /* まだ決まっていない：行ったり来たりで「移動中」を表す */
        walkT += (dtSec / WALK_SEC) * walkDir;
        if (walkT >= 1) { walkT = 1; walkDir = -1; dwell = DWELL_SEC; }
        else if (walkT <= 0) { walkT = 0; walkDir = 1; dwell = DWELL_SEC; }
      }
    }

    var p = personPos();
    layers.person.setAttribute("transform", "translate(" + p.x.toFixed(2) + " " + p.y.toFixed(2) + ")");
    /* 追従中はピンが自分の上に重なるので、自分側のラベルは引っ込める */
    layers.person.setAttribute("class", "m-person" + (D.PIN.mode === "follow" ? " is-pinned" : ""));

    /* 追従モードのあいだ、ピンは自分についてくる＝「いまいるここで受け取る」 */
    if (D.PIN.mode === "follow") {
      var moved = dist(D.PIN.x, D.PIN.y, p.x, p.y);
      D.PIN.x = p.x;
      D.PIN.y = p.y;
      D.PIN.walkM = 0;
      if (moved > 6) {
        var route = routeToXY(p.x, p.y);
        D.PIN.etaMin = etaForRoute(route);
        D.pointById("moving_me").eta_min = D.PIN.etaMin;
        if (hooks.onPin) hooks.onPin(D.PIN);
      }
    } else {
      D.PIN.walkM = Math.round(dist(p.x, p.y, D.PIN.x, D.PIN.y) * M_PER_PX / 5) * 5;
    }
    drawPin();

    /* 選択中の荷物が向かっている先をハイライト */
    var focusTracking = focusParcel ? state.parcels[focusParcel] : null;
    Array.prototype.forEach.call(layers.points.querySelectorAll(".m-point"), function (g) {
      var isSel = focusTracking && g.getAttribute("data-id") === focusTracking.pointId;
      g.setAttribute("class", "m-point" + (isSel ? " is-selected" : ""));
    });

    /* ルート線と配送車 */
    layers.routes.innerHTML = "";
    var order = Object.keys(state.parcels);
    var vehicleEls = {};
    Array.prototype.forEach.call(layers.vehicles.children, function (c) { vehicleEls[c.getAttribute("data-id")] = c; });

    order.forEach(function (id, idx) {
      var t = state.parcels[id];
      var parcel = D.parcelById(id);
      var color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
      var pt = D.pointById(t.pointId);
      var route = pt.dynamic ? routeToXY(D.PIN.x, D.PIN.y) : pt.route;
      var active = t.status === "in_transit" || t.status === "arrived" || t.status === "handing_over" || t.status === "blocked";

      var v = vehicleEls[id];
      if (!v) {
        v = el("g", { class: "m-van", "data-id": id });
        v.appendChild(el("circle", { cx: 0, cy: 0, r: 10, class: "m-van-halo" }));
        v.appendChild(el("rect", { x: -7, y: -5.5, width: 14, height: 11, rx: 2.6, class: "m-van-body" }));
        v.appendChild(el("text", { x: 0, y: 3.2, class: "m-van-ico", "text-anchor": "middle" }, parcel.icon));
        layers.vehicles.appendChild(v);
      }
      if (!active) { v.setAttribute("opacity", "0"); return; }

      v.setAttribute("opacity", "1");
      v.querySelector(".m-van-body").setAttribute("fill", color);
      v.querySelector(".m-van-halo").setAttribute("fill", color);

      var isFocus = focusParcel === id;
      layers.routes.appendChild(el("path", {
        d: polyPath(route),
        class: "m-route" + (isFocus ? " is-focus" : ""),
        stroke: color,
        "stroke-opacity": isFocus ? 0.85 : 0.3
      }));

      var pos = pointAt(route, t.progress);
      v.setAttribute("transform", "translate(" + pos.x.toFixed(2) + " " + pos.y.toFixed(2) + ")");
      v.setAttribute("class", "m-van" + (isFocus ? " is-focus" : "") + (t.status === "blocked" ? " is-blocked" : ""));
    });
  }

  function drawPin() {
    if (!layers.pin) return;
    /* 既存の地点や自分に重なるときは、少しずらして立てる。
       真上に重ねると、中のアイコンかラベルのどちらかを必ず隠してしまうため。 */
    var off = D.PIN.kind === "point" ? [9, 11] : D.PIN.kind === "me" ? [9, -2] : [0, 0];
    layers.pin.setAttribute("transform",
      "translate(" + (D.PIN.x + off[0]).toFixed(2) + " " + (D.PIN.y + off[1]).toFixed(2) + ")");
    layers.pin.setAttribute("data-kind", D.PIN.kind);
    layers.pin.setAttribute("data-mode", D.PIN.mode);
    layers.pin.setAttribute("data-state", D.PIN.committed ? "set" : "draft");
    /* 地点に刺さっているときは、その地点のラベルが既に出ているので重ねて書かない */
    var text = D.PIN.kind === "point" ? ""
      : D.PIN.kind === "me" ? T({ ja: "ここで受け取る", en: "Receive here" })
        : T(D.PIN.label);
    if (layers.pinLabel && layers.pinLabel.textContent !== text) layers.pinLabel.textContent = text;
  }

  /** ピンの見た目を「確定済み」に切り替える（受取先として採用されたとき） */
  function markCommitted(on) {
    D.PIN.committed = !!on;
    drawPin();
  }

  /** ポリシーエンジンの判定をピンの色に出す（allow / conditional / deny） */
  function setPinVerdict(v) {
    if (layers.pin) layers.pin.setAttribute("data-verdict", v || "allow");
  }

  function resetWalk() { walkT = 0; walkDir = 1; dwell = 0; heading = null; }

  return {
    mount: mount,
    update: update,
    setFocus: function (id) { focusParcel = id; },
    personProgress: function () { return walkT; },
    setPickable: setPickable,
    /* 言語が変わったら描き直す。ラベルがSVGのテキストなので作り直すのが早い */
    relabel: function () { if (svg) mount(svg, hooks); },
    resetWalk: resetWalk,
    walkTo: walkTo,
    stopWalking: stopWalking,
    hasArrived: hasArrived,
    headingTo: headingTo,
    movePinTo: movePinTo,
    setPinToPoint: setPinToPoint,
    followMe: followMe,
    resolvePin: resolvePin,
    markCommitted: markCommitted,
    setPinVerdict: setPinVerdict,
    pin: function () { return D.PIN; }
  };
})();
