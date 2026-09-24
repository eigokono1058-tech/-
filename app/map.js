/* ==========================================================================
   DELIVERY OS — 地図 / the map

   サンフランシスコのダウンタウンを、実際の街の形から自分で描く（`sf.js`）。
   外部の地図タイルもAPIキーも使わないので、会場の電波が死んでも出る。

   見え方は地図アプリに寄せている。陸・水・公園・街区・道路の順に重ね、
   道路は白い線に薄い縁取り。文字は小さく、色は落とす。
   点滅したり消えたりするものは置かない。

   画面の形に合わせて表示範囲を切り出すので、縦長の端末でも横長の画面でも
   「いつも見えていてほしい範囲（sf.js の FOCUS）」は必ず入る。
   ========================================================================== */
window.LM_MAP = (function () {
  var D = window.LM_DATA;
  var SF = window.LM_SF;

  var MAX_SCALE = 1.9;     // これ以上は寄らない（大きな画面で拡大しすぎないため）

  function T(v) { return window.LM_I18N ? window.LM_I18N.t(v) : (v && (v.ja || v)) || ""; }

  var svg = null;
  var layers = {};
  var hooks = {};          // { onPick: fn(pointId), onArrive: fn(pointId) }

  var pickable = false;
  var picked = null;
  var focusParcel = null;

  /* ---------- 幾何 ---------- */
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
    return pts.map(function (p, i) { return (i ? "L" : "M") + r2(p[0]) + " " + r2(p[1]); }).join(" ");
  }
  /** 線の上で (cx,cy) にいちばん近い点。t は lo〜hi に収める（端に寄せない） */
  function nearestOn(pts, cx, cy, lo, hi) {
    var best = null;
    for (var i = 0; i <= 40; i++) {
      var t = lo + (hi - lo) * (i / 40);
      var p = pointAt(pts, t);
      var d = dist(p.x, p.y, cx, cy);
      if (!best || d < best.d) { best = { x: p.x, y: p.y, angle: p.angle, d: d }; }
    }
    return best;
  }
  function closedPath(pts) { return polyPath(pts) + " Z"; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ---------- 人の移動 ---------- */
  var WALK = SF.WALK;
  var WALK_SEC = 95;
  var DWELL_SEC = 2.2;
  var walkT = 0;
  var walkDir = 1;
  var dwell = 0;
  var heading = null;      // 受取先が決まったら、そこへ向かって歩く

  function personPos() {
    if (heading) return pointAt(heading.pts, heading.t);
    return pointAt(WALK, walkT);
  }

  /** いまいる場所から目的地まで、通りに沿って歩く道を引く */
  function walkTo(x, y, pointId) {
    var p = personPos();
    if (heading && heading.pointId === pointId) return;
    var a = SF.toGrid([p.x, p.y]), b = SF.toGrid([x, y]);
    var pts = [[p.x, p.y], SF.grid(b.along, a.cross), [x, y]];
    var len = polyLength(pts).total;
    heading = { pts: pts, t: 0, pointId: pointId, arrived: false, dur: Math.max(5, len / 9) };
  }
  function stopWalking() { heading = null; }
  function hasArrived() { return !!(heading && heading.arrived); }
  function headingTo() { return heading ? heading.pointId : null; }
  function resetWalk() { walkT = 0; walkDir = 1; dwell = 0; heading = null; }

  /* ---------- 受取ピン（いまは画面に出していないが、
                「いまいる場所まで配達」の所要時間の計算に使う） ---------- */
  function etaForRoute(route) {
    return Math.max(4, Math.round(polyLength(route).total / 22) + 2);
  }
  function writePin(next) {
    next.etaMin = etaForRoute(SF.vanRoute([next.x, next.y]));
    next.walkM = 0;
    D.setPin(next);
    if (hooks.onPin) hooks.onPin(D.PIN);
  }
  function followMe() {
    var p = personPos();
    writePin({
      x: p.x, y: p.y, mode: "follow", kind: "me", pointId: null,
      label: { ja: "いまいる場所", en: "Where I am" }, committed: false
    });
  }
  function movePinTo(x, y) {
    writePin({
      x: x, y: y, mode: "fixed", kind: "street", pointId: null,
      label: { ja: "差したピンの場所", en: "The pin you dropped" }, committed: false
    });
  }
  function setPinToPoint(pointId) {
    var pt = D.pointById(pointId);
    if (!pt) return;
    if (pt.dynamic) { followMe(); D.PIN.committed = true; return; }
    writePin({
      x: pt.xy[0], y: pt.xy[1], mode: "fixed", kind: "point",
      pointId: pt.id, label: pt.label || pt.name, committed: true
    });
  }
  function resolvePin() { return D.PIN.pointId || "moving_me"; }

  /* ---------- 選べる状態 ---------- */
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
  /** 一覧の候補から選んだときも、地図の上で同じ場所が光るようにする */
  function pick(pointId) {
    picked = pointId || null;
    paintPicked();
  }

  /* ======================================================================
     描画
     ====================================================================== */
  function el(tag, attrs, text) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function g(cls) { return el("g", { class: cls }); }

  var EMOJI = {
    home: "🏠", locker: "🔐", store: "🏪", office: "🏢",
    person: "🧑", delegate: "🤝", robot: "🤖"
  };
  var VEHICLE_COLORS = ["#1a73e8", "#0f9d58", "#a142f4", "#f9ab00"];

  /** 画面の形に合わせて表示範囲を決める。FOCUS は必ず入る。
      倍率は画面いっぱいの大きさから決める。下のシートが伸び縮みするたびに
      地図の縮尺が変わると、そのたびに街が読めなくなるため。
      代わりに、シートで隠れるぶんだけ中身を上にずらす。 */
  function fit() {
    if (!svg) return;
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var F = SF.FOCUS;
    var scale = Math.min(r.width / F.w, r.height / F.h);
    if (scale > MAX_SCALE) scale = MAX_SCALE;
    var w = r.width / scale, h = r.height / scale;

    var sheet = document.getElementById("sheet2");
    var hidden = sheet ? Math.min(sheet.getBoundingClientRect().height, r.height * 0.7) : 0;
    var shift = (hidden / 2) / scale;

    var x = F.x + (F.w - w) / 2;
    var y = F.y + (F.h - h) / 2 + shift;
    svg.setAttribute("viewBox", r2(x) + " " + r2(y) + " " + r2(w) + " " + r2(h));
  }

  function mount(target, h) {
    svg = target;
    hooks = h || {};
    svg.innerHTML = "";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    var E = SF.EXTENT;

    /* 陸 */
    svg.appendChild(el("rect", {
      x: E.x0, y: E.y0, width: E.x1 - E.x0, height: E.y1 - E.y0, class: "m-land"
    }));

    /* 公園 */
    var parks = g("m-parks");
    SF.PARKS.forEach(function (p) {
      parks.appendChild(el("rect", {
        x: p.c[0] - p.r[0], y: p.c[1] - p.r[1],
        width: p.r[0] * 2, height: p.r[1] * 2, rx: 2, class: "m-park"
      }));
    });
    svg.appendChild(parks);

    /* 道路：縁取りを敷いてから本体を重ねる（地図アプリの見え方） */
    var streets = SF.streets();
    var casing = g("m-casing");
    var road = g("m-roads");
    streets.forEach(function (s) {
      var d = polyPath(s.pts);
      casing.appendChild(el("path", { d: d, class: "m-casing m-" + s.w }));
      road.appendChild(el("path", { d: d, class: "m-road m-" + s.w }));
    });
    var emb = polyPath(SF.embarcadero());
    casing.appendChild(el("path", { d: emb, class: "m-casing m-arterial" }));
    road.appendChild(el("path", { d: emb, class: "m-road m-arterial" }));
    svg.appendChild(casing);
    svg.appendChild(road);

    /* 海と埠頭。通りは湾の手前で終わるので、道路の上から海をかぶせて切る。 */
    var water = g("m-water-layer");
    water.appendChild(el("path", { d: closedPath(SF.water()), class: "m-water" }));
    SF.piers().forEach(function (p) {
      water.appendChild(el("path", { d: closedPath(p), class: "m-pier" }));
    });
    svg.appendChild(water);

    /* 高速道路。ベイブリッジは海の上を渡るので、海より後に描く。 */
    var hwy = g("m-hwys");
    SF.freeways().forEach(function (f) {
      hwy.appendChild(el("path", { d: polyPath(f.pts), class: "m-hwy-casing" }));
      hwy.appendChild(el("path", { d: polyPath(f.pts), class: "m-hwy" }));
    });
    svg.appendChild(hwy);

    /* 通りの名前。主要な通りだけ、通りに沿って寝かせて置く。
       置く場所は「いつも見えている範囲の中心にいちばん近いところ」。
       線の真ん中に置くと、画面の外に出てしまう通りが多いため。 */
    var names = g("m-street-names");
    var cx = SF.FOCUS.x + SF.FOCUS.w / 2, cy = SF.FOCUS.y + SF.FOCUS.h / 2;
    streets.forEach(function (s) {
      if (s.w !== "arterial" && s.w !== "market") return;
      var at = nearestOn(s.pts, cx, cy, 0.08, 0.92);
      var ang = at.angle;
      if (ang > 90) ang -= 180;
      if (ang < -90) ang += 180;
      names.appendChild(el("text", {
        x: 0, y: 0, class: "m-street-name" + (s.w === "market" ? " is-major" : ""),
        "text-anchor": "middle",
        transform: "translate(" + r2(at.x) + " " + r2(at.y) + ") rotate(" + r2(ang) + ")"
      }, T(s.name)));
    });
    svg.appendChild(names);

    /* 地区名 */
    var districts = g("m-districts");
    SF.DISTRICTS.forEach(function (d) {
      districts.appendChild(el("text", {
        x: d.at[0], y: d.at[1], class: "m-district", "text-anchor": "middle"
      }, T(d)));
    });
    districts.appendChild(el("text", {
      x: SF.BAY.at[0], y: SF.BAY.at[1], class: "m-district is-water", "text-anchor": "middle"
    }, T(SF.BAY)));
    svg.appendChild(districts);

    /* 目印。絵文字は端末によって出ない字があるので、小さな丸と名前だけにする。 */
    var marks = g("m-landmarks");
    SF.LANDMARKS.forEach(function (m) {
      var lm = g("m-landmark");
      lm.appendChild(el("circle", { cx: m.at[0], cy: m.at[1], r: 2.2, class: "m-landmark-dot" }));
      lm.appendChild(el("text", {
        x: m.at[0], y: m.at[1] + 10, class: "m-landmark-name", "text-anchor": "middle"
      }, T(m)));
      marks.appendChild(lm);
    });
    svg.appendChild(marks);

    layers.routes = g("m-routes");
    svg.appendChild(layers.routes);

    /* 受取地点 */
    layers.points = g("m-points");
    D.POINTS.forEach(function (pt) {
      if (pt.dynamic || !pt.xy) return;
      var node = el("g", {
        class: "m-point", "data-id": pt.id, tabindex: "0", role: "button",
        "aria-label": T(pt.name)
      });
      node.appendChild(el("circle", { cx: pt.xy[0], cy: pt.xy[1], r: 17, class: "m-point-hit" }));
      node.appendChild(el("circle", { cx: pt.xy[0], cy: pt.xy[1], r: 10.5, class: "m-point-dot" }));
      node.appendChild(el("text", {
        x: pt.xy[0], y: pt.xy[1] + 4.2, class: "m-point-ico", "text-anchor": "middle"
      }, EMOJI[pt.icon] || "📦"));
      node.appendChild(el("text", {
        x: pt.xy[0], y: pt.xy[1] + (pt.labelAbove ? -16 : 25),
        class: "m-point-label", "text-anchor": "middle"
      }, T(pt.label || pt.name)));
      function choose(e) {
        if (!pickable) return;
        e.preventDefault();
        e.stopPropagation();
        picked = pt.id;
        paintPicked();
        if (hooks.onPick) hooks.onPick(pt.id);
      }
      node.addEventListener("click", choose);
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") choose(e);
      });
      layers.points.appendChild(node);
    });
    svg.appendChild(layers.points);

    /* 自分 */
    layers.person = g("m-person");
    layers.person.appendChild(el("circle", { cx: 0, cy: 0, r: 19, class: "m-person-acc" }));
    layers.person.appendChild(el("circle", { cx: 0, cy: 0, r: 7.5, class: "m-person-dot" }));
    layers.person.appendChild(el("text", {
      x: 0, y: 24, class: "m-point-label is-me", "text-anchor": "middle"
    }, T({ ja: "自分", en: "Me" })));
    svg.appendChild(layers.person);

    layers.vehicles = g("m-vehicles");
    svg.appendChild(layers.vehicles);

    fit();
    if (!mount.bound) {
      window.addEventListener("resize", fit);
      window.addEventListener("orientationchange", fit);
      mount.bound = true;
    }
    followMe();
    paintPicked();
  }

  /* ---------- 毎フレーム ---------- */
  function update(state, dtSec) {
    if (!svg) return;

    if (dtSec) {
      if (heading) {
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
        walkT += (dtSec / WALK_SEC) * walkDir;
        if (walkT >= 1) { walkT = 1; walkDir = -1; dwell = DWELL_SEC; }
        else if (walkT <= 0) { walkT = 0; walkDir = 1; dwell = DWELL_SEC; }
      }
    }

    var p = personPos();
    layers.person.setAttribute("transform", "translate(" + r2(p.x) + " " + r2(p.y) + ")");

    /* 「いまいる場所まで配達」は、歩いている自分についてくる */
    if (D.PIN.mode === "follow" && dist(D.PIN.x, D.PIN.y, p.x, p.y) > 6) {
      D.PIN.x = p.x; D.PIN.y = p.y;
      D.PIN.etaMin = etaForRoute(SF.vanRoute([p.x, p.y]));
      D.pointById("moving_me").eta_min = D.PIN.etaMin;
      if (hooks.onPin) hooks.onPin(D.PIN);
    }

    var focusTracking = focusParcel ? state.parcels[focusParcel] : null;
    Array.prototype.forEach.call(layers.points.querySelectorAll(".m-point"), function (node) {
      var id = node.getAttribute("data-id");
      node.setAttribute("class", "m-point" +
        (focusTracking && id === focusTracking.pointId ? " is-selected" : "") +
        (picked === id ? " is-picked" : ""));
    });

    /* 配送車と、その走行ルート */
    layers.routes.innerHTML = "";
    var order = Object.keys(state.parcels);
    var vehicleEls = {};
    Array.prototype.forEach.call(layers.vehicles.children, function (c) {
      vehicleEls[c.getAttribute("data-id")] = c;
    });

    order.forEach(function (id, idx) {
      var t = state.parcels[id];
      var parcel = D.parcelById(id);
      var color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
      var pt = D.pointById(t.pointId);
      var route = SF.vanRoute(pt.dynamic ? [D.PIN.x, D.PIN.y] : pt.xy);
      var active = t.status === "in_transit" || t.status === "arrived" ||
        t.status === "handing_over" || t.status === "blocked";

      var v = vehicleEls[id];
      if (!v) {
        v = el("g", { class: "m-van", "data-id": id });
        v.appendChild(el("circle", { cx: 0, cy: 0, r: 12, class: "m-van-halo" }));
        v.appendChild(el("rect", { x: -8.5, y: -6.5, width: 17, height: 13, rx: 3, class: "m-van-body" }));
        v.appendChild(el("text", { x: 0, y: 3.8, class: "m-van-ico", "text-anchor": "middle" }, parcel.icon));
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
        "stroke-opacity": isFocus ? 0.9 : 0.25
      }));

      var pos = pointAt(route, t.progress);
      v.setAttribute("transform", "translate(" + r2(pos.x) + " " + r2(pos.y) + ")");
      v.setAttribute("class", "m-van" + (isFocus ? " is-focus" : "") +
        (t.status === "blocked" ? " is-blocked" : ""));
    });
  }

  return {
    mount: mount,
    update: update,
    fit: fit,
    icons: EMOJI,
    setFocus: function (id) { focusParcel = id; },
    personProgress: function () { return walkT; },
    setPickable: setPickable,
    pick: pick,
    /* 言語が変わったら描き直す。地図の文字はSVGなので作り直すのが早い */
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
    markCommitted: function (on) { D.PIN.committed = !!on; },
    setPinVerdict: function () { /* ピンは画面に出していない */ },
    pin: function () { return D.PIN; }
  };
})();
