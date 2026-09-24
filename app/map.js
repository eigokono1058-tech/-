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
  var TAP_SLOP = 14;       // これ以内の指の動きは「タップ」とみなす（px）

  function T(v) { return window.LM_I18N ? window.LM_I18N.t(v) : (v && (v.ja || v)) || ""; }

  var svg = null;
  var layers = {};
  var hooks = {};          // { onPick: fn(pointId), onArrive: fn(pointId) }

  var pickable = false;
  var picked = null;
  var focusParcel = null;
  var vanPos = null;              // いま配送車がいる場所
  var routeOverride = {};         // 途中から引き直した道（寄り道）

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
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  /** 線分 a–b の上で (px,py) にいちばん近い点 */
  function nearestOnSeg(px, py, a, b) {
    var vx = b[0] - a[0], vy = b[1] - a[1];
    var len2 = vx * vx + vy * vy;
    var t = len2 === 0 ? 0 : ((px - a[0]) * vx + (py - a[1]) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    var x = a[0] + vx * t, y = a[1] + vy * t;
    return { x: x, y: y, d: dist(px, py, x, y) };
  }

  /* ---------- 人の移動 --------------------------------------------------
     歩く速さは実際の人の速さ（1.35m/秒 ＝ 時速4.9km）で持つ。
     画面の中でそれが何秒に見えるかは、再生の速さ（ui.js）が決める。 */
  var WALK = SF.WALK;
  var WALK_MPS = 1.35;
  var DWELL_SEC = 2.2;
  var walkT = 0;
  var walkDir = 1;
  var dwell = 0;
  var heading = null;      // 受取先が決まったら、そこへ向かって歩く

  /** 距離（単位）を、この時間軸での所要秒数に直す */
  function walkDur(lenUnits) {
    var simPerSec = (window.LM_ENGINE && LM_ENGINE.state.speed) || 30;
    return (lenUnits * SF.UNIT_M / WALK_MPS) / simPerSec;
  }
  function idleDur() { return Math.max(8, walkDur(polyLength(WALK).total)); }

  function personPos() {
    if (heading) return pointAt(heading.pts, heading.t);
    return pointAt(WALK, walkT);
  }

  /** いまいる場所から目的地まで、通りに沿って歩く道を引く */
  function walkTo(x, y, pointId) {
    var p = personPos();
    if (heading && heading.pointId === pointId) return;
    var pts = SF.route([p.x, p.y], [x, y]);
    var d = Math.max(1.5, walkDur(polyLength(pts).total));
    heading = {
      pts: pts, t: 0, pointId: pointId, arrived: false,
      dur: d,
      naturalDur: d          // ふつうに歩いた場合。調整してもこれは変えない
    };
  }
  function stopWalking() { heading = null; }
  function hasArrived() { return !!(heading && heading.arrived); }
  function headingTo() { return heading ? heading.pointId : null; }

  function simPerSec() { return (window.LM_ENGINE && LM_ENGINE.state.speed) || 30; }

  /** 受取人があと何分で着くか（いまの歩く速さで） */
  function walkMinutesLeft() {
    if (!heading || heading.arrived) return 0;
    return (1 - heading.t) * heading.dur * simPerSec() / 60;
  }

  /** ふつうに歩いたら、あと何分で着くか（落ち合う時刻の下限になる） */
  function naturalMinutesLeft() {
    if (!heading || heading.arrived) return 0;
    return (1 - heading.t) * (heading.naturalDur || heading.dur) * simPerSec() / 60;
  }

  /** まだ歩き出す前に、そこまで何分かかるかを見る */
  function walkEtaTo(xy) {
    var p = personPos();
    return walkDur(polyLength(SF.route([p.x, p.y], xy)).total) * simPerSec() / 60;
  }

  /** 残りの道のりを、ちょうどこの分数で歩くように速さを変える。
      早く着きすぎないための調整。位置（t）は動かさない。 */
  function paceWalk(simMinutes) {
    if (!heading || heading.arrived || heading.t >= 1) return false;
    var sec = Math.max(0.2, simMinutes * 60 / simPerSec());
    heading.dur = sec / (1 - heading.t);
    return true;
  }

  /** 寄り道して遅れる。ふつうに歩いた場合の到着も、そのぶん後ろへ動く。 */
  function delayWalk(simMinutes) {
    if (!heading || heading.arrived || heading.t >= 1) return false;
    var add = (simMinutes * 60 / simPerSec()) / (1 - heading.t);
    heading.naturalDur = (heading.naturalDur || heading.dur) + add;
    heading.dur += add;
    return true;
  }
  function resetWalk() { walkT = 0; walkDir = 1; dwell = 0; heading = null; routeOverride = {}; }

  /* ---------- 受取ピン（いまは画面に出していないが、
                「いまいる場所まで配達」の所要時間の計算に使う） ---------- */
  /* 通りに沿った経路を出すのは毎コマやるには重いので、行き先ごとに覚えておく。
     16m 刻みで丸めるので、人が歩いても引き直しは時々で済む。 */
  var routeCache = {};
  function vanRouteTo(xy) {
    var k = Math.round(xy[0] / 4) + "," + Math.round(xy[1] / 4);
    if (!routeCache[k]) {
      var keys = Object.keys(routeCache);
      if (keys.length > 60) routeCache = {};
      routeCache[k] = SF.vanRoute(xy);
    }
    return routeCache[k];
  }

  /* 市街地の配送車は平均15km/hほど（＝1分に250m、単位では62.5）。
     最後に停めて渡す2分を足す。 */
  function etaForRoute(route) {
    return Math.max(3, Math.round(polyLength(route).total / 62.5) + 2);
  }
  function writePin(next) {
    var p = personPos();
    /* 配送車はもう荷物を積んで走っている。拠点からではなく、
       いまいる場所からそのピンまで何分か、で出す。 */
    var from = vanPos || SF.DEPOT;
    next.etaMin = etaForRoute(SF.route(from, [next.x, next.y]));
    next.walkM = Math.round(dist(p.x, p.y, next.x, next.y) * SF.UNIT_M / 10) * 10;
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
    drawPin();
  }
  function paintPicked() {
    if (!layers.points) return;
    Array.prototype.forEach.call(layers.points.querySelectorAll(".m-point"), function (g) {
      g.classList.toggle("is-picked", picked === g.getAttribute("data-id"));
    });
  }
  /** エージェントに「道の上」の案を出させるための下ごしらえ。
      帰り道の少し先にある通りを1点選んで、ピンとして置く。
      これをしておくと、駅や店と並べて道の上の案も点数がつく。 */
  function proposeStreet() {
    var p = personPos();
    var ahead = pointAt(WALK, Math.min(1, walkT + 0.22 * (walkDir > 0 ? 1 : -1)));
    var s = snap(ahead.x, ahead.y);
    if (!s || s.pointId) s = snap(p.x + 18, p.y + 18);
    if (!s || s.pointId) return false;
    writePin({
      x: s.x, y: s.y, mode: "fixed", kind: "street",
      pointId: null, label: s.label, committed: false
    });
    drawPin();
    return true;
  }

  /** 配送中の車を、いまいる場所から新しい目的地へ向け直す */
  function divert(parcelId, to) {
    if (!vanPos) return false;
    routeOverride[parcelId] = SF.route(vanPos, to);
    return true;
  }
  function clearDivert(parcelId) { delete routeOverride[parcelId]; }

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

  /* ---------- 文字が重ならないように置く ------------------------------------
     地図の文字は、重なった時点で両方とも読めなくなる。
     だから置く前に場所を確かめて、空いていなければ別の場所を試し、
     どこも空いていなければその文字は出さない。 */
  var taken = [];

  /** 傾いた長方形を、4隅の座標で表す */
  function boxAt(cx, cy, w, h, deg) {
    var a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    var hw = w / 2 + 2.8, hh = h / 2 + 2.2;   // 縁取りのぶんも見込む
    var pts = [];
    [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(function (p) {
      pts.push([cx + p[0] * co - p[1] * si, cy + p[0] * si + p[1] * co]);
    });
    return pts;
  }
  /** 分離軸で、2つの長方形が重なるかを見る */
  function hits(A, B) {
    var boxes = [A, B];
    for (var b = 0; b < 2; b++) {
      var box = boxes[b];
      for (var i = 0; i < 4; i++) {
        var p1 = box[i], p2 = box[(i + 1) % 4];
        var nx = -(p2[1] - p1[1]), ny = p2[0] - p1[0];
        var a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, k;
        for (k = 0; k < 4; k++) {
          var va = A[k][0] * nx + A[k][1] * ny;
          if (va < a0) a0 = va; if (va > a1) a1 = va;
          var vb = B[k][0] * nx + B[k][1] * ny;
          if (vb < b0) b0 = vb; if (vb > b1) b1 = vb;
        }
        if (a1 < b0 || b1 < a0) return false;
      }
    }
    return true;
  }
  function reserve(box) { taken.push(box); }
  function free(box) {
    for (var i = 0; i < taken.length; i++) if (hits(box, taken[i])) return false;
    return true;
  }

  /** 文字を置く。置けたら true。置けなければ何も残さない。 */
  function putLabel(parent, text, cls, x, y, deg, size) {
    if (!text) return false;
    var node = el("text", { class: cls, "text-anchor": "middle", x: 0, y: 0 }, text);
    parent.appendChild(node);
    var w;
    try { w = node.getComputedTextLength(); } catch (e) { w = 0; }
    if (!w) w = text.length * size * 0.62;
    var box = boxAt(x, y, w, size * 1.4, deg);
    if (!free(box)) { parent.removeChild(node); return false; }
    reserve(box);
    node.setAttribute("transform",
      "translate(" + r2(x) + " " + r2(y) + ")" + (deg ? " rotate(" + r2(deg) + ")" : ""));
    return true;
  }

  var EMOJI = {
    home: "🏠", locker: "🔐", store: "🏪", office: "🏢",
    person: "🧑", delegate: "🤝", robot: "🤖"
  };
  var VEHICLE_COLORS = ["#1a73e8", "#0f9d58", "#a142f4", "#f9ab00"];

  /* ---------- 見ている範囲 ------------------------------------------------
     基準の枠は画面の形から決める（FOCUS は必ず入る）。倍率をシートの高さから
     決めないのは、シートが伸びるたびに縮尺が変わると街が読めなくなるため。
     そのうえで、指で動かした分（view）を重ねる。 */
  var base = null;
  var view = { zoom: 1, dx: 0, dy: 0, moved: false };
  var pxPerUnit = 1;

  function fit() {
    if (!svg) return;
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var F = SF.FOCUS;
    var scale = Math.min(r.width / F.w, r.height / F.h);
    if (scale > MAX_SCALE) scale = MAX_SCALE;
    var w = r.width / scale, h = r.height / scale;

    /* 指で動かしていない間だけ、シートで隠れるぶんを上にずらしておく。
       シートは下げられるので、隠れている高さは「実際に地図に被っている分」で測る。 */
    var shift = 0;
    if (!view.moved) {
      var sheet = document.getElementById("sheet2");
      var hidden = 0;
      if (sheet) {
        var sr = sheet.getBoundingClientRect();
        hidden = Math.max(0, Math.min(r.bottom - sr.top, r.height * 0.7));
      }
      shift = (hidden / 2) / scale;
    }
    base = { x: F.x + (F.w - w) / 2, y: F.y + (F.h - h) / 2 + shift, w: w, h: h };
    applyView();
  }

  function applyView() {
    if (!base || !svg) return;
    var w = base.w / view.zoom, h = base.h / view.zoom;
    var cx = base.x + base.w / 2 + view.dx;
    var cy = base.y + base.h / 2 + view.dy;
    /* 描いてある街の外まで出ていかないように */
    var E = SF.EXTENT;
    cx = clamp(cx, E.x0 + w * 0.3, E.x1 - w * 0.3);
    cy = clamp(cy, E.y0 + h * 0.3, E.y1 - h * 0.3);
    view.dx = cx - (base.x + base.w / 2);
    view.dy = cy - (base.y + base.h / 2);
    svg.setAttribute("viewBox",
      r2(cx - w / 2) + " " + r2(cy - h / 2) + " " + r2(w) + " " + r2(h));
    var r = svg.getBoundingClientRect();
    pxPerUnit = r.width ? r.width / w : 1;
    if (hooks.onView) hooks.onView(view.moved);
  }

  /** 地図をはじめの位置に戻す */
  function recenter() {
    view.zoom = 1; view.dx = 0; view.dy = 0; view.moved = false;
    fit();
  }
  function isMoved() { return view.moved; }

  function clientToSvg(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    return {
      x: vb.x + (clientX - r.left) / r.width * vb.width,
      y: vb.y + (clientY - r.top) / r.height * vb.height
    };
  }

  /* ---------- 指の操作：動かす・つまんで拡大・タップ ---------- */
  function bindGestures() {
    var pts = {};                 // pointerId -> {x, y}
    var pinch = null;             // {d, zoom, cx, cy}
    var down = null;              // タップかどうかを見るための記録
    var panning = false;

    function ids() { return Object.keys(pts); }

    svg.addEventListener("pointerdown", function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (svg.setPointerCapture) { try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      var k = ids();
      if (k.length === 1) {
        down = { x: e.clientX, y: e.clientY, t: Date.now(), moved: 0 };
        panning = false;
      } else if (k.length === 2) {
        var a = pts[k[0]], b = pts[k[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom };
        down = null;
      }
    });

    svg.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      var prev = pts[e.pointerId];
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var k = ids();

      if (k.length >= 2 && pinch) {
        var a = pts[k[0]], b = pts[k[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        var next = clamp(pinch.zoom * (d / pinch.d), 0.55, 5);
        var mid = clientToSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomAround(next, mid.x, mid.y);
        return;
      }

      if (k.length === 1) {
        if (down) {
          /* 指がどれだけ「離れたか」で見る。途中の細かい揺れを足し上げると、
             実機では軽く触っただけでも動かした扱いになってしまう。 */
          down.moved = Math.max(down.moved,
            Math.hypot(e.clientX - down.x, e.clientY - down.y));
          if (down.moved > TAP_SLOP) panning = true;
        }
        if (!panning) return;
        e.preventDefault();
        view.moved = true;
        view.dx -= dx / pxPerUnit;
        view.dy -= dy / pxPerUnit;
        applyView();
      }
    });

    function release(e) {
      var wasDown = down;
      delete pts[e.pointerId];
      if (!ids().length) pinch = null;
      if (wasDown && !panning && wasDown.moved <= TAP_SLOP && Date.now() - wasDown.t < 900) {
        var p = clientToSvg(e.clientX, e.clientY);
        tapAt(p.x, p.y);
      }
      down = null;
      panning = false;
    }
    svg.addEventListener("pointerup", release);
    svg.addEventListener("pointercancel", function (e) {
      delete pts[e.pointerId];
      if (!ids().length) pinch = null;
      down = null; panning = false;
    });

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var p = clientToSvg(e.clientX, e.clientY);
      zoomAround(clamp(view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.55, 5), p.x, p.y);
    }, { passive: false });
  }

  /** (ax,ay) を動かさずに倍率を変える */
  function zoomAround(next, ax, ay) {
    if (!base) return;
    var cx = base.x + base.w / 2 + view.dx;
    var cy = base.y + base.h / 2 + view.dy;
    var k = view.zoom / next;
    view.dx = (ax + (cx - ax) * k) - (base.x + base.w / 2);
    view.dy = (ay + (cy - ay) * k) - (base.y + base.h / 2);
    view.zoom = next;
    view.moved = true;
    applyView();
  }

  /* ---------- 道の上で受け取る -------------------------------------------
     このアプリの肝。駅でも店でも自宅でもない、ただの道の上を指定できる。
     タップした場所を、いちばん近い受取地点か、いちばん近い通りに寄せる。 */
  var SNAP_POINT_R = 24;
  var lines = [];               // スナップ用に持っておく通りの形

  function snap(px, py) {
    var best = null;
    D.POINTS.forEach(function (pt) {
      if (pt.dynamic || !pt.xy) return;
      var d = dist(px, py, pt.xy[0], pt.xy[1]);
      if (d <= SNAP_POINT_R && (!best || d < best.d)) {
        best = { x: pt.xy[0], y: pt.xy[1], d: d, pointId: pt.id, label: pt.label || pt.name };
      }
    });
    if (best) return best;

    var road = null;
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i];
      for (var j = 1; j < s.pts.length; j++) {
        var c = nearestOnSeg(px, py, s.pts[j - 1], s.pts[j]);
        if (!road || c.d < road.d) road = { x: c.x, y: c.y, d: c.d, label: s.name };
      }
    }
    if (!road) return null;
    return { x: road.x, y: road.y, d: road.d, pointId: null, label: road.label };
  }

  function tapAt(x, y) {
    if (!pickable) return;
    var s = snap(x, y);
    if (!s) return;
    if (s.pointId) {
      picked = s.pointId;
      D.PIN.kind = "none";                 // 地点を選んだので路上のピンは消す
    } else {
      picked = "moving_me";
      writePin({
        x: s.x, y: s.y, mode: "fixed", kind: "street",
        pointId: null, label: s.label, committed: false
      });
    }
    paintPicked();
    drawPin();
    if (hooks.onPick) hooks.onPick(picked);
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

    /* ---- ここから文字。重ならない順に置いていく ----
       1. 受取地点の名前（このアプリの主役なので、先に場所を取っておく）
       2. 地区名  3. 目印  4. マーケット通り  5. 主要な通り                */
    taken = [];
    var cx = SF.FOCUS.x + SF.FOCUS.w / 2, cy = SF.FOCUS.y + SF.FOCUS.h / 2;

    D.POINTS.forEach(function (pt) {
      if (pt.dynamic || !pt.xy) return;
      var label = T(pt.label || pt.name);
      reserve(boxAt(pt.xy[0], pt.xy[1] + (pt.labelAbove ? -16 : 25),
        label.length * 6.2, 11, 0));
      reserve(boxAt(pt.xy[0], pt.xy[1], 24, 24, 0));   // 印そのもの
    });

    var districts = g("m-districts");
    svg.appendChild(districts);
    putLabel(districts, T(SF.BAY), "m-district is-water", SF.BAY.at[0], SF.BAY.at[1], 0, 9);
    SF.DISTRICTS.forEach(function (d) {
      putLabel(districts, T(d), "m-district", d.at[0], d.at[1], 0, 9);
    });

    /* 目印。絵文字は端末によって出ない字があるので、小さな丸と名前だけにする。 */
    var marks = g("m-landmarks");
    svg.appendChild(marks);
    SF.LANDMARKS.forEach(function (m) {
      if (!putLabel(marks, T(m), "m-landmark-name", m.at[0], m.at[1] + 10, 0, 6.2)) return;
      marks.insertBefore(el("circle", { cx: m.at[0], cy: m.at[1], r: 2.2, class: "m-landmark-dot" }),
        marks.lastChild);
    });

    /* 通りの名前。中心に近いところから順に、空いている場所を探して置く。 */
    var names = g("m-street-names");
    svg.appendChild(names);
    var ordered = streets.filter(function (s) { return s.w === "market"; })
      .concat(streets.filter(function (s) { return s.w === "arterial"; }));
    ordered.forEach(function (s) {
      var major = s.w === "market";
      var size = major ? 7.4 : 6.2;
      var spots = [];
      for (var i = 0; i <= 14; i++) {
        var tt = 0.08 + 0.84 * (i / 14);
        var at = pointAt(s.pts, tt);
        spots.push({ at: at, d: dist(at.x, at.y, cx, cy) });
      }
      spots.sort(function (a, b) { return a.d - b.d; });
      for (var k = 0; k < spots.length; k++) {
        var a = spots[k].at, ang = a.angle;
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        if (putLabel(names, T(s.name), "m-street-name" + (major ? " is-major" : ""),
          a.x, a.y, ang, size)) break;
      }
    });

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

    /* 道の上に差すピン。受取地点ではない場所を指すときだけ出る。 */
    layers.pin = g("m-pin");
    layers.pin.appendChild(el("ellipse", { cx: 0, cy: 2, rx: 6, ry: 2.4, class: "m-pin-shadow" }));
    layers.pin.appendChild(el("path", {
      d: "M 0 0 C -7 -10 -10 -14 -10 -19 A 10 10 0 1 1 10 -19 C 10 -14 7 -10 0 0 Z",
      class: "m-pin-body"
    }));
    layers.pin.appendChild(el("circle", { cx: 0, cy: -19, r: 4, class: "m-pin-hole" }));
    layers.pinLabel = el("text", { x: 0, y: 15, class: "m-point-label is-pin", "text-anchor": "middle" }, "");
    layers.pin.appendChild(layers.pinLabel);
    svg.appendChild(layers.pin);

    /* スナップに使う通りの形を覚えておく */
    lines = streets.map(function (s) { return { pts: s.pts, name: s.name }; });
    lines.push({ pts: SF.embarcadero(), name: { ja: "エンバカデロ", en: "The Embarcadero" } });

    fit();
    bindGestures();
    if (!mount.bound) {
      window.addEventListener("resize", fit);
      window.addEventListener("orientationchange", fit);
      mount.bound = true;
    }
    if (D.PIN.kind === "street") drawPin(); else followMe();
    paintPicked();
    drawPin();
  }

  /** 路上ピンの見た目。受取地点を選んでいるときは出さない。 */
  function drawPin() {
    if (!layers.pin) return;
    var on = D.PIN.kind === "street";
    layers.pin.setAttribute("opacity", on ? "1" : "0");
    if (!on) return;
    layers.pin.setAttribute("transform", "translate(" + r2(D.PIN.x) + " " + r2(D.PIN.y) + ")");
    layers.pin.setAttribute("data-state", D.PIN.committed ? "set" : "draft");
    var text = T(D.PIN.label);
    if (layers.pinLabel.textContent !== text) layers.pinLabel.textContent = text;
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
        /* 折り返しの小休止は「端に着いたとき」だけ。
           出発点も walkT が 0 なので、向きも見ないと開始直後に止まってしまう。 */
        walkT += (dtSec / idleDur()) * walkDir;
        if (walkDir > 0 && walkT >= 1) { walkT = 1; walkDir = -1; dwell = DWELL_SEC; }
        else if (walkDir < 0 && walkT <= 0) { walkT = 0; walkDir = 1; dwell = DWELL_SEC; }
      }
    }

    var p = personPos();
    layers.person.setAttribute("transform", "translate(" + r2(p.x) + " " + r2(p.y) + ")");

    /* 「いまいる場所まで配達」は、歩いている自分についてくる */
    if (D.PIN.mode === "follow" && dist(D.PIN.x, D.PIN.y, p.x, p.y) > 6) {
      D.PIN.x = p.x; D.PIN.y = p.y;
      D.PIN.etaMin = etaForRoute(vanRouteTo([p.x, p.y]));
      D.pointById("moving_me").eta_min = D.PIN.etaMin;
      if (hooks.onPin) hooks.onPin(D.PIN);
    } else if (D.PIN.kind === "street") {
      /* 路上ピンまでの徒歩距離は、歩くにつれて縮む */
      D.PIN.walkM = Math.round(dist(p.x, p.y, D.PIN.x, D.PIN.y) * SF.UNIT_M / 10) * 10;
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
      var route = routeOverride[id] || vanRouteTo(pt.dynamic ? [D.PIN.x, D.PIN.y] : pt.xy);
      var active = t.status === "planning" || t.status === "in_transit" ||
        t.status === "arrived" || t.status === "handing_over" || t.status === "blocked";

      var v = vehicleEls[id];
      if (!v) {
        /* 受取地点のマーカーと同じ形にそろえる（淡い円 + 細い輪 + 絵文字）。
           配送車だけ別の形にすると地図の上で浮く。輪の色で荷物を見分ける。 */
        v = el("g", { class: "m-van", "data-id": id });
        v.appendChild(el("circle", { cx: 0, cy: 0, r: 16, class: "m-van-halo" }));
        v.appendChild(el("circle", { cx: 0, cy: 0, r: 10.5, class: "m-van-dot" }));
        v.appendChild(el("text", { x: 0, y: 4.2, class: "m-van-ico", "text-anchor": "middle" }, "🚚"));
        layers.vehicles.appendChild(v);
      }
      if (!active) { v.setAttribute("opacity", "0"); return; }

      v.setAttribute("opacity", "1");
      v.querySelector(".m-van-dot").setAttribute("stroke", color);
      v.querySelector(".m-van-halo").setAttribute("fill", color);

      var isFocus = focusParcel === id;
      layers.routes.appendChild(el("path", {
        d: polyPath(route),
        class: "m-route" + (isFocus ? " is-focus" : ""),
        stroke: color,
        "stroke-opacity": isFocus ? 0.5 : 0.16
      }));

      var pos = pointAt(route, t.progress);
      if (id === focusParcel) vanPos = [pos.x, pos.y];
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
    recenter: recenter,
    isMoved: isMoved,
    snap: snap,
    drawPin: drawPin,
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
    walkMinutesLeft: walkMinutesLeft,
    naturalMinutesLeft: naturalMinutesLeft,
    walkEtaTo: walkEtaTo,
    paceWalk: paceWalk,
    delayWalk: delayWalk,
    divert: divert,
    proposeStreet: proposeStreet,
    clearDivert: clearDivert,
    vanAt: function () { return vanPos; },
    movePinTo: movePinTo,
    setPinToPoint: setPinToPoint,
    followMe: followMe,
    resolvePin: resolvePin,
    markCommitted: function (on) { D.PIN.committed = !!on; },
    setPinVerdict: function () { /* ピンは画面に出していない */ },
    pin: function () { return D.PIN; }
  };
})();
