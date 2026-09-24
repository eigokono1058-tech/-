/* ==========================================================================
   DELIVERY OS — デモアプリ UI / demo app UI (ja + en)

   伝えたいのは2つだけ。
     A. 自分で受け取る場所を選べる
     B. 方針を決めておけば、エージェントが代わりに決めてくれる

   なので画面は「地図」と「下のシート」しかない。
   シートは状態ごとに中身が入れ替わる。一覧も長い説明も出さない。
   1画面に主要な操作はひとつだけ置く。
   ========================================================================== */
window.LM_UI = (function () {
  var D = window.LM_DATA;
  var E = window.LM_ENGINE;
  var M = window.LM_MAP;
  var A = window.LM_AGENT;
  var POL = window.LM_POLICY;
  var PR = window.LM_PROVIDERS;
  var I18N = window.LM_I18N;

  /* この荷物1つで話を通す。他の3件は裏で同じ仕組みが動いている。 */
  var HERO = "ord_0031";

  var ST = {
    idle: "idle",             // 配送中。どちらのモードか選ぶ
    picking: "picking",       // 自分で選ぶ：地図から選べる
    confirming: "confirming", // 選んだ地点でいいか
    thinking: "thinking",     // エージェントが考えている
    proposed: "proposed",     // エージェントの結果
    enroute: "enroute",       // 受取先が決まって、そこへ向かっている
    done: "done"              // 受け取った
  };

  var state = ST.idle;
  var pickedId = null;
  var decision = null;
  var thinkTimer = null;

  function $(id) { return document.getElementById(id); }
  function t(v) { return I18N ? I18N.t(v) : (v && (v.ja || v)) || ""; }
  function ja() { return I18N && I18N.lang === "ja"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* サンフランシスコの想定なのでドル。端数があるときだけ小数を出す */
  function yen(n) {
    var v = Number(n);
    return "$" + (v % 1 === 0 ? v.toLocaleString() : v.toFixed(2));
  }
  function parcel() { return D.parcelById(HERO); }
  function tracking() { return E.tracking(HERO); }
  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- 文言。短く。 ---------- */
  var S = {
    inTransit: { ja: "配送中", en: "On its way" },
    changed: { ja: "受取先を変更しました", en: "Delivery updated" },
    ask: { ja: "変更しますか？", en: "Switch to it?" },
    waiting: { ja: "受け取りに向かっています", en: "Heading to pickup" },
    completed: { ja: "受け取り完了", en: "Delivery completed" },
    pickMode: { ja: "自分で選ぶ", en: "I'll choose" },
    agentMode: { ja: "エージェントに任せる", en: "Let the agent" },
    pickHint: { ja: "受け取る場所を選ぶ", en: "Pick a spot" },
    cancel: { ja: "やめる", en: "Cancel" },
    receiveHere: { ja: "ここで受け取る", en: "Receive here" },
    policyHead: { ja: "平日の方針", en: "Weekday policy" },
    thinking: { ja: "考えています", en: "Thinking" },
    apply: { ja: "変更する", en: "Switch" },
    keep: { ja: "今のまま", en: "Keep current" },
    undo: { ja: "元に戻す", en: "Undo" },
    settled: { ja: "確定", en: "Locked in" },
    again: { ja: "もう一度", en: "Run again" },
    others: { ja: "他の3件も同じ方針で判断しました", en: "It handled the other three the same way" },
    walk: { ja: "徒歩", en: "walk" },
    free: { ja: "追加料金なし", en: "No extra cost" },
    earlier: { ja: "早い", en: "earlier" },
    noNeed: { ja: "いまの予定のままで受け取れます", en: "The current plan already works" },
    blocked: { ja: "ここでは受け取れません", en: "Not possible here" },
    failed: { ja: "変更できませんでした", en: "The change did not go through" },
    rolledBack: { ja: "進んだ手続きは戻しました", en: "Everything already done was rolled back" },
    fee: { ja: "配送料", en: "Delivery" },
    chargedNote: {
      ja: "配送料は登録のカードから自動で引き落とされます",
      en: "The fee is charged to your card automatically"
    }
  };

  var STATUS = {
    idle:       { key: "inTransit", tone: "" },
    picking:    { key: "pickHint",  tone: "pick" },
    confirming: { key: "pickHint",  tone: "pick" },
    thinking:   { key: "thinking",  tone: "agent" },
    proposed:   { key: "changed",   tone: "agent" },
    enroute:    { key: "waiting",   tone: "ok" },
    done:       { key: "completed", tone: "ok" }
  };

  function renderStatus() {
    var box = $("status");
    if (!box) return;
    var s = STATUS[state] || STATUS.idle;
    var head = t(S[s.key]);
    if (state === ST.proposed && decision) {
      if (decision.action === "none") head = t(S.noNeed);
      else if (decision.outcome === "failed") head = t(S.failed);
      else if (decision.action !== "auto") head = t(S.ask);
    }
    var tr = tracking();
    var pt = D.pointById(tr.pointId);
    var sub = "";
    if (state === ST.idle || state === ST.enroute) sub = t(pt.name) + " · " + destTime();
    else if (state === ST.done) sub = t(pt.name);
    box.className = "status" + (s.tone ? " is-" + s.tone : "");
    box.innerHTML = "<b>" + esc(head) + "</b>" + (sub ? "<span>" + esc(sub) + "</span>" : "");
  }

  function destTime() {
    var tr = tracking();
    var opts = PR.options(parcel());
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].pointId === tr.pointId) return POL.hhmm(opts[i].receivableAtMin);
    }
    return E.now().slice(0, 5);
  }

  function sheet(html) {
    var el = $("sheet2");
    el.innerHTML = '<div class="grip" aria-hidden="true"></div>' + html;
    el.classList.remove("is-in");
    void el.offsetWidth;                 // アニメーションを毎回やり直す
    if (!reduced()) el.classList.add("is-in");
  }

  function fact(v) { return '<span class="fact">' + esc(v) + "</span>"; }

  function optionFor(pointId) {
    var opts = PR.options(parcel());
    for (var i = 0; i < opts.length; i++) if (opts[i].pointId === pointId) return opts[i];
    return null;
  }

  /* ---------- 状態ごとの描画 ---------- */
  function render() {
    renderStatus();
    if (state === ST.idle) return renderIdle();
    if (state === ST.picking) return renderPicking();
    if (state === ST.confirming) return renderConfirming();
    if (state === ST.thinking) return renderThinking();
    if (state === ST.proposed) return renderProposed();
    if (state === ST.enroute) return renderEnroute();
    if (state === ST.done) return renderDone();
  }

  /* --- 配送中。このアプリの分岐点 --- */
  function renderIdle() {
    var p = parcel();
    sheet(
      '<div class="prow"><span class="pico">' + p.icon + "</span>" +
      '<span class="pname">' + esc(t(p.title)) + "</span></div>" +
      '<div class="modes">' +
      '<button class="mode" id="mPick" type="button">' +
      '<span class="mico" aria-hidden="true">📍</span><b>' + esc(t(S.pickMode)) + "</b></button>" +
      '<button class="mode is-primary" id="mAgent" type="button">' +
      '<span class="mico" aria-hidden="true">✦</span><b>' + esc(t(S.agentMode)) + "</b></button>" +
      "</div>"
    );
    $("mPick").addEventListener("click", startPicking);
    $("mAgent").addEventListener("click", startAgent);
  }

  /* --- 自分で選ぶ --- */
  function startPicking() {
    state = ST.picking;
    pickedId = null;
    M.setPickable(true);
    render();
  }

  function renderPicking() {
    sheet(
      '<div class="row sheet-cta" style="margin-top:4px"><button class="btn btn-ghost grow" id="mCancel" type="button">' +
      esc(t(S.cancel)) + "</button></div>"
    );
    $("mCancel").addEventListener("click", backToIdle);
  }

  function onPickPoint(pointId) {
    if (state !== ST.picking && state !== ST.confirming) return;
    pickedId = pointId;
    state = ST.confirming;
    render();
  }

  function renderConfirming() {
    var pt = D.pointById(pickedId);
    var opt = optionFor(pickedId);
    var ev = E.evaluate(parcel(), pt);
    var ok = ev.verdict !== "deny";
    var why = "";
    if (!ok) ev.findings.forEach(function (f) { if (!why && f.verdict === "deny") why = t(f.reason); });

    sheet(
      '<div class="pick-card' + (ok ? "" : " is-no") + '">' +
      '<b class="pick-name">' + esc(t(pt.name)) + "</b>" +
      (ok && opt
        ? '<div class="facts">' + fact(POL.hhmm(opt.receivableAtMin)) +
          fact(opt.extraCost === 0 ? t(S.free) : "+" + yen(opt.extraCost)) +
          fact(t(S.walk) + " " + opt.walkMin + (ja() ? "分" : "m")) + "</div>"
        : '<p class="pick-no">' + esc(t(S.blocked)) + (why ? " — " + esc(why) : "") + "</p>") +
      "</div>" +
      '<div class="row row-wrap sheet-cta">' +
      '<button class="btn btn-ghost" id="mBack" type="button">' + esc(t(S.cancel)) + "</button>" +
      (ok ? '<button class="btn btn-primary grow" id="mGo" type="button">' +
        esc(t(S.receiveHere)) + "</button>" : "") +
      "</div>"
    );
    $("mBack").addEventListener("click", backToIdle);
    var go = $("mGo");
    if (go) go.addEventListener("click", function () { commit(pickedId); });
  }

  function backToIdle() {
    state = ST.idle;
    pickedId = null;
    decision = null;
    M.setPickable(false);
    render();
  }

  function commit(pointId) {
    var ev = E.assign(HERO, pointId, { approved: true });
    if (ev.verdict === "deny") return;
    M.setPickable(false);
    headTo(pointId);
    state = ST.enroute;
    render();
  }

  function headTo(pointId) {
    var pt = D.pointById(pointId);
    if (pt && pt.xy && !pt.dynamic) M.walkTo(pt.xy[0], pt.xy[1], pt.id);
    else M.stopWalking();
    M.setFocus(HERO);
  }

  /* --- エージェントに任せる --- */
  var THINK_STEPS = [
    { ja: "予定と現在地", en: "Schedule and area", tool: "calendar.busy_windows" },
    { ja: "使える受け取り方", en: "What is available", tool: "locker.availability" },
    { ja: "方針と照らし合わせ", en: "Against your policy", tool: "deliveryos.check_permission" }
  ];

  function startAgent() {
    state = ST.thinking;
    M.setPickable(false);
    render();
    if (thinkTimer) clearTimeout(thinkTimer);
    thinkTimer = setTimeout(function () {
      var all = A.runAll("user_action");
      decision = null;
      all.forEach(function (d) { if (d.parcelId === HERO) decision = d; });
      if (!decision) { backToIdle(); return; }
      if (decision.action === "auto" && decision.outcome === "executed") headTo(tracking().pointId);
      state = ST.proposed;
      render();
    }, reduced() ? 0 : 1500);
  }

  function renderThinking() {
    var p = POL.get();
    sheet(policyCard(p) +
      '<div class="think2">' + THINK_STEPS.map(function (s, i) {
        return '<div class="t2row" style="animation-delay:' + (i * 0.34) + 's">' +
          '<span class="t2dot" aria-hidden="true"></span><span>' + esc(t(s)) + "</span>" +
          "<code>" + esc(s.tool) + "</code></div>";
      }).join("") + "</div>");
  }

  function policyCard(p) {
    return '<div class="pol-card"><span class="pol-h">' + esc(t(S.policyHead)) + "</span><ul>" +
      "<li>" + esc(ja() ? "帰り道から " + p.maxRouteDeviationMin + "分以内"
        : "Within " + p.maxRouteDeviationMin + " min of my route") + "</li>" +
      "<li>" + esc(ja() ? "追加料金 " + yen(p.maxExtraCostJpy) + " まで"
        : "Up to " + yen(p.maxExtraCostJpy) + " extra") + "</li>" +
      "<li>" + esc(ja() ? "できるだけ早く受け取れる方法"
        : "Whatever gets it to me soonest") + "</li></ul></div>";
  }

  /* --- エージェントの結果 --- */
  function renderProposed() {
    var d = decision;
    if (!d) return renderIdle();

    if (d.action === "none") {
      sheet(resCard("none", "✓", t(S.noNeed), "") + againRow());
      bindAgain();
      return;
    }
    if (d.outcome === "failed") {
      sheet(resCard("no", "!", t(S.failed), t(S.rolledBack)) + againRow());
      bindAgain();
      return;
    }

    var auto = d.action === "auto";
    var saved = savedMinutes(d);

    sheet(
      resCard(auto ? "ok" : "ask", auto ? "✓" : "?", auto ? t(S.changed) : t(S.ask), "") +
      '<div class="swap">' +
      '<div class="swap-side is-from"><span>' + esc(t(d.from.name)) + "</span><b>" + esc(d.from.at) + "</b></div>" +
      '<span class="swap-arrow" aria-hidden="true">→</span>' +
      '<div class="swap-side is-to"><span>' + esc(t(d.to.name)) + "</span><b>" + esc(d.to.at) + "</b></div>" +
      "</div>" +
      '<div class="facts">' +
      fact(d.to.extraCost === 0 ? t(S.free) : "+" + yen(d.to.extraCost)) +
      fact(t(S.walk) + " " + d.to.walkMin + (ja() ? "分" : "m")) +
      (saved ? fact(saved + " " + t(S.earlier)) : "") + "</div>" +
      (auto
        ? '<div class="row row-wrap sheet-cta">' +
          '<button class="btn btn-ghost" id="mUndo" type="button">' + esc(t(S.undo)) + "</button>" +
          '<span class="countdown" id="mCount"></span></div>'
        : '<div class="row row-wrap sheet-cta">' +
          '<button class="btn btn-ghost" id="mKeep" type="button">' + esc(t(S.keep)) + "</button>" +
          '<button class="btn btn-primary grow" id="mApply" type="button">' + esc(t(S.apply)) + "</button></div>") +
      othersRow()
    );

    var undo = $("mUndo");
    if (undo) undo.addEventListener("click", function () {
      A.undo(d.id);
      M.stopWalking();
      backToIdle();
    });
    var apply = $("mApply");
    if (apply) apply.addEventListener("click", function () {
      A.confirm(d.id);
      headTo(tracking().pointId);
      state = ST.enroute;
      render();
    });
    var keep = $("mKeep");
    if (keep) keep.addEventListener("click", function () { A.reject(d.id); backToIdle(); });
  }

  function resCard(tone, ico, head, sub) {
    return '<div class="res is-' + tone + '">' +
      '<span class="res-ico" aria-hidden="true">' + ico + "</span>" +
      "<b>" + esc(head) + "</b>" +
      (sub ? '<span class="res-sub">' + esc(sub) + "</span>" : "") + "</div>";
  }

  function savedMinutes(d) {
    var from = null;
    PR.options(parcel()).forEach(function (o) {
      if (o.pointId === d.from.pointId) from = o.receivableAtMin;
    });
    if (from == null || from <= d.to.atMin) return "";
    var m = from - d.to.atMin, h = Math.floor(m / 60), mm = m % 60;
    return ja() ? (h ? h + "時間" : "") + (mm ? mm + "分" : "")
      : (h ? h + "h " : "") + (mm ? mm + "m" : "");
  }

  function othersRow() {
    var n = A.decisions().filter(function (d) { return d.parcelId !== HERO; }).length;
    return n ? '<p class="others">' + esc(t(S.others)) + "</p>" : "";
  }

  function againRow() {
    return '<div class="row sheet-cta"><button class="btn btn-ghost grow" id="mAgain" type="button">' +
      esc(t(S.again)) + "</button></div>";
  }
  function bindAgain() {
    var b = $("mAgain");
    if (b) b.addEventListener("click", restart);
  }

  function restart() {
    E.reset(); A.reset(); PR.reset(); M.resetWalk();
    state = ST.idle; decision = null; pickedId = null;
    M.setPickable(false);
    M.setFocus(HERO);
    render();
  }

  function renderEnroute() {
    var pt = D.pointById(tracking().pointId);
    sheet(resCard("ok", "→", t(S.waiting), t(pt.name) + " · " + destTime()));
  }

  function renderDone() {
    var pt = D.pointById(tracking().pointId);
    var extra = decision && decision.to ? decision.to.extraCost : 0;
    sheet(
      '<div class="done-card">' +
      '<div class="done-check" aria-hidden="true">✓</div>' +
      "<b>" + esc(t(S.completed)) + "</b>" +
      '<span class="done-where">' + esc(t(pt.name)) + " · " + esc(destTime()) + "</span>" +
      '<div class="facts">' + fact(t(S.fee) + " " + yen(4.8 + extra)) +
      (extra ? fact("+" + yen(extra)) : fact(t(S.free))) + "</div>" +
      '<p class="done-note">' + esc(t(S.chargedNote)) + "</p></div>" + againRow()
    );
    bindAgain();
  }

  /* ---------- エンジンからの通知 ---------- */
  function onArrive() {
    if (tracking().status === "arrived") E.startHandover(HERO);
  }

  function onEngine() {
    var tr = tracking();
    if (tr.status === "arrived" && (M.hasArrived() || D.pointById(tr.pointId).dynamic)) {
      E.startHandover(HERO);
    }
    if (tr.status === "received" && state !== ST.done) {
      state = ST.done;
      render();
    } else {
      renderStatus();
    }
    renderLog();
    renderToolCalls();
  }

  /* ---------- 記録 ---------- */
  function renderLog() {
    var box = $("logBox");
    if (!box) return;
    box.innerHTML = E.state.log.slice(0, 40).map(function (r) {
      return '<div class="log-row ' + r.level + '"><span class="lt">' + esc(r.at) + "</span>" +
        '<span><span class="lk">' + esc(r.kind) + "</span>" +
        '<span class="lm">' + esc(t(r.message)) + "</span></span></div>";
    }).join("") || '<p class="muted small">—</p>';
  }

  function renderToolCalls() {
    var box = $("toolCalls");
    if (!box) return;
    var list = PR.calls(18);
    if (!list.length) { box.innerHTML = '<p class="muted small">—</p>'; return; }
    box.innerHTML = list.map(function (c) {
      var body = c.error ? "✕ " + c.error : JSON.stringify(c.result);
      if (body && body.length > 120) body = body.slice(0, 120) + "…";
      return '<div class="tc' + (c.error ? " tc-err" : "") + '">' +
        '<div class="tc-line">→ <b>' + esc(c.tool) + "</b>(" +
        esc(JSON.stringify(c.args).slice(1, -1).slice(0, 90)) + ")</div>" +
        '<div class="tc-line tc-res">← ' + esc(body) + "</div></div>";
    }).join("");
  }

  /* ---------- タブ ---------- */
  function setTab(name) {
    ["map", "log"].forEach(function (x) {
      var v = $("view-" + x);
      if (v) v.classList.toggle("is-active", x === name);
      var b = $("tab-" + x);
      if (b) b.setAttribute("aria-selected", x === name ? "true" : "false");
    });
    if (name !== "map") window.scrollTo({ top: 0 });
  }

  function tickUndo() {
    var el = $("mCount");
    if (!el || !decision) return;
    if (A.canUndo(decision)) {
      var s = A.undoSecondsLeft(decision);
      el.textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
    } else {
      el.textContent = t(S.settled);
      var b = $("mUndo");
      if (b) b.remove();
    }
  }

  /* ---------- init ---------- */
  function init() {
    M.mount($("map"), { onPick: onPickPoint, onArrive: onArrive });
    M.setFocus(HERO);
    M.setPickable(false);
    E.subscribe(onEngine);
    E.init();

    ["map", "log"].forEach(function (x) {
      var b = $("tab-" + x);
      if (b) b.addEventListener("click", function () { setTab(x); });
    });

    var reset = $("resetBtn");
    if (reset) reset.addEventListener("click", function () { restart(); setTab("map"); });

    var fail = $("failBtn");
    if (fail) fail.addEventListener("click", function () {
      restart();
      PR.setFailNextReroute(true);
      setTab("map");
      startAgent();
    });

    var ob = $("onboard");
    var seen = null;
    try { seen = localStorage.getItem("lm-onboard-v2"); } catch (e) { /* ignore */ }
    if (seen === "1" && ob) ob.hidden = true;
    var start = $("obStart");
    if (start) start.addEventListener("click", function () {
      if (ob) ob.hidden = true;
      try { localStorage.setItem("lm-onboard-v2", "1"); } catch (e) { /* ignore */ }
    });

    if (window.LMTheme) window.LMTheme.bind("#themeBtn");
    if (I18N) {
      I18N.mountToggle("#langBtn");
      I18N.onChange(function () {
        M.relabel();
        render();
        renderLog();
        renderToolCalls();
      });
    }

    render();

    var last = performance.now();
    (function frame(now) {
      var dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      E.tick(dt);
      M.update(E.state, dt);
      var c = $("clock");
      if (c) c.textContent = E.now().slice(0, 5);
      tickUndo();
      requestAnimationFrame(frame);
    })(last);
  }

  return { init: init, setTab: setTab };
})();
