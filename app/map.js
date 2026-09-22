/* ==========================================================================
   LAST METERS — 街区マップ（自前SVG・外部タイル不要／オフラインでも動く）
   受取地点、配送車の走行、移動中の受取人、ランデブー地点を描画する。
   ========================================================================== */
window.LM_MAP = (function () {
  var D = window.LM_DATA;
  var W = 360, H = 240;

  var svg = null;
  var layers = {};
  var onPick = null;
  var focusParcel = null;

  /* 受取人（自分）の徒歩ルート：駅 → 自宅 */
  var WALK = [[304, 96], [240, 96], [162, 96], [150, 110], [150, 122]];
  var walkT = 0; // 0..1
  var WALK_SEC = 150; // 実時間で歩き切るまで

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

  function personPos() { return pointAt(WALK, walkT); }

  /* 移動中の自分に届ける場合のランデブー地点（少し先の路上） */
  function rendezvous() {
    var p = pointAt(WALK, Math.min(1, walkT + 0.14));
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }
  function dynamicRoute() {
    var r = rendezvous();
    return [[20, 200], [20, 130], [r.x, 130], [r.x, r.y]];
  }

  /* ---------- build ---------- */
  function el(tag, attrs, text) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function mount(target, pickHandler) {
    svg = target;
    onPick = pickHandler;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
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
      [8, 8, 100, 36], [122, 8, 88, 36], [224, 8, 60, 36], [298, 8, 54, 36],
      [8, 76, 36, 40], [58, 76, 76, 40], [148, 76, 62, 40], [224, 76, 128, 40],
      [8, 144, 92, 46], [116, 144, 100, 46], [232, 144, 120, 46],
      [40, 212, 130, 22], [186, 212, 166, 22]
    ].forEach(function (b) {
      blocks.appendChild(el("rect", { x: b[0], y: b[1], width: b[2], height: b[3], rx: 3, class: "m-block" }));
    });
    svg.appendChild(blocks);

    /* 道路 */
    var roads = el("g", { class: "m-roads" });
    [
      [[0, 62], [360, 62]], [[0, 130], [360, 130]], [[0, 200], [360, 200]],
      [[20, 0], [20, 240]], [[58, 0], [58, 240]], [[150, 0], [150, 240]],
      [[252, 0], [252, 240]], [[318, 0], [318, 240]]
    ].forEach(function (r) {
      roads.appendChild(el("path", { d: polyPath(r), class: "m-road" }));
    });
    [110, 200, 285].forEach(function (x) {
      roads.appendChild(el("path", { d: polyPath([[x, 0], [x, 240]]), class: "m-road-minor" }));
    });
    [96, 165].forEach(function (y) {
      roads.appendChild(el("path", { d: polyPath([[0, y], [360, y]]), class: "m-road-minor" }));
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
    depot.appendChild(el("text", { x: 20, y: 222, class: "m-label", "text-anchor": "middle" }, "物流Hub"));
    svg.appendChild(depot);

    /* 受取地点 */
    layers.points = el("g", { class: "m-points" });
    D.POINTS.forEach(function (pt) {
      if (pt.dynamic) return;
      var g = el("g", { class: "m-point", "data-id": pt.id, tabindex: "0", role: "button" });
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
      }, shortName(pt)));
      g.addEventListener("click", function () { if (onPick) onPick(pt.id); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onPick) onPick(pt.id); }
      });
      layers.points.appendChild(g);
    });
    svg.appendChild(layers.points);

    /* 動的レイヤ */
    layers.rdv = el("g", { class: "m-rdv" });
    layers.rdv.appendChild(el("circle", { cx: 0, cy: 0, r: 9, class: "m-rdv-ring" }));
    layers.rdv.appendChild(el("circle", { cx: 0, cy: 0, r: 3, class: "m-rdv-dot" }));
    layers.rdv.appendChild(el("text", { x: 0, y: -14, class: "m-label m-label-accent", "text-anchor": "middle" }, "ランデブー"));
    layers.rdv.setAttribute("opacity", "0");
    svg.appendChild(layers.rdv);

    layers.person = el("g", { class: "m-person" });
    layers.person.appendChild(el("circle", { cx: 0, cy: 0, r: 11, class: "m-person-halo" }));
    layers.person.appendChild(el("circle", { cx: 0, cy: 0, r: 7, class: "m-person-dot" }));
    layers.person.appendChild(el("text", { x: 0, y: 3, class: "m-point-ico", "text-anchor": "middle" }, "🧑"));
    layers.person.appendChild(el("text", { x: 0, y: 19, class: "m-label", "text-anchor": "middle" }, "自分"));
    svg.appendChild(layers.person);

    layers.vehicles = el("g", { class: "m-vehicles" });
    svg.appendChild(layers.vehicles);
  }

  function shortName(pt) {
    var map = {
      home_door: "自宅ドア前", home_locker: "宅配ロッカー", konbini: "コンビニ",
      station_locker: "駅ロッカー", office: "勤務先", friend: "友人宅", indoor: "屋内搬入"
    };
    return map[pt.id] || pt.name;
  }

  /* ---------- update ---------- */
  function update(state, dtSec) {
    if (!svg) return;
    if (dtSec) walkT = Math.min(1, walkT + dtSec / WALK_SEC);

    var p = personPos();
    layers.person.setAttribute("transform", "translate(" + p.x + " " + p.y + ")");

    var needRdv = false;
    Object.keys(state.parcels).forEach(function (id) {
      var t = state.parcels[id];
      if (t.pointId === "moving_me" && (t.status === "in_transit" || t.status === "arrived")) needRdv = true;
    });
    if (needRdv) {
      var r = rendezvous();
      layers.rdv.setAttribute("transform", "translate(" + r.x + " " + r.y + ")");
      layers.rdv.setAttribute("opacity", "1");
    } else {
      layers.rdv.setAttribute("opacity", "0");
    }

    /* 選択中の受取地点をハイライト */
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
      var route = pt.dynamic ? dynamicRoute() : pt.route;
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

  return {
    mount: mount,
    update: update,
    setFocus: function (id) { focusParcel = id; },
    personProgress: function () { return walkT; },
    resetWalk: function () { walkT = 0; }
  };
})();
