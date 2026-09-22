/* ==========================================================================
   LAST METERS — デモアプリ UI
   ========================================================================== */
window.LM_UI = (function () {
  var D = window.LM_DATA;
  var E = window.LM_ENGINE;
  var M = window.LM_MAP;

  var focus = D.PARCELS[0].id;
  var tab = "flow";
  var lastVerdict = null;
  var refs = {};

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }
  var TEMP_LABEL = { ambient: "常温", chilled: "冷蔵", frozen: "冷凍" };
  var STATUS_LABEL = {
    planning: "受取先 未確定", in_transit: "配送中", arrived: "到着・受渡し待ち",
    handing_over: "受渡し中", received: "受取完了", blocked: "停止（要対応）", returned: "返送"
  };
  var VERDICT_LABEL = { allow: "許可", conditional: "条件付き許可", deny: "拒否" };
  var VERDICT_ICON = { allow: "✅", conditional: "⚠️", deny: "⛔" };
  var SEV_LABEL = { low: "軽", medium: "中", high: "重", critical: "重大" };
  var SEV_CLASS = { low: "pill-info", medium: "pill-warn", high: "pill-danger", critical: "pill-danger" };

  /* ---------- JSON highlighter（行単位なので壊れない） ---------- */
  function grantHtml(grant) {
    var json = JSON.stringify(grant, null, 2);
    var lines = json.split("\n");
    var inNotGranted = false;
    return lines.map(function (line) {
      var isNo = false;
      if (/"not_granted"/.test(line)) { inNotGranted = true; isNo = true; }
      else if (inNotGranted) {
        isNo = true;
        if (/\]/.test(line)) inNotGranted = false;
      }
      var m = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.*)$/);
      var out;
      if (m) {
        out = esc(m[1]) + '<span class="k">' + esc(m[2]) + "</span>" + esc(m[3]) + value(m[4]);
      } else {
        out = value(line, true);
      }
      return isNo ? '<span class="no">' + stripSpans(out) + "</span>" : out;

      function value(v, keepIndent) {
        var lead = "";
        if (keepIndent) {
          var im = v.match(/^(\s*)([\s\S]*)$/);
          lead = esc(im[1]);
          v = im[2];
        }
        var trail = "";
        var tm = v.match(/^([\s\S]*?)(,?)$/);
        if (tm) { v = tm[1]; trail = tm[2]; }
        var cls = null;
        if (/^".*"$/.test(v)) cls = "s";
        else if (/^(true|false)$/.test(v)) cls = "b";
        else if (/^-?\d+(\.\d+)?$/.test(v)) cls = "n";
        return lead + (cls ? '<span class="' + cls + '">' + esc(v) + "</span>" : esc(v)) + trail;
      }
      function stripSpans(s) { return s.replace(/<\/?span[^>]*>/g, ""); }
    }).join("\n");
  }

  /* ---------- assignment ---------- */
  function tryAssign(parcelId, pointId) {
    var ev = E.assign(parcelId, pointId);
    lastVerdict = { ev: ev, pointId: pointId, parcelId: parcelId };
    renderAll();
    if (ev.verdict === "deny" || ev.needsApproval) {
      var box = $("verdictBox");
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ev;
  }

  /* ---------- flow view ---------- */
  function renderParcels() {
    var box = $("parcelList");
    if (!box) return;
    box.innerHTML = "";
    refs.bars = {};
    D.PARCELS.forEach(function (p) {
      var t = E.tracking(p.id);
      var pt = D.pointById(t.pointId);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "parcel" + (focus === p.id ? " is-focus" : "");
      btn.innerHTML =
        '<span class="parcel-ico">' + p.icon + "</span>" +
        '<span class="grow">' +
        "<b>" + esc(p.title) + "</b>" +
        '<span class="meta">' +
        (p.orderedBy === "agent" ? '<span class="agent-tag">🤖 AI自動発注</span> ' : "👤 手動発注 ") +
        esc(TEMP_LABEL[p.temp]) + " · " + yen(p.value) +
        "</span>" +
        '<span class="dest">' + statusDot(t) + " " + esc(pt.name) + "</span>" +
        '<span class="bar"><i style="width:' + Math.round(t.progress * 100) + '%"></i></span>' +
        "</span>";
      btn.addEventListener("click", function () {
        focus = p.id;
        M.setFocus(p.id);
        lastVerdict = null;
        renderAll();
      });
      box.appendChild(btn);
      refs.bars[p.id] = btn.querySelector(".bar i");
    });
  }

  function statusDot(t) {
    var color = {
      planning: "var(--text-faint)", in_transit: "var(--brand-1)", arrived: "var(--warn)",
      handing_over: "var(--brand-2)", received: "var(--ok)", blocked: "var(--danger)", returned: "var(--danger)"
    }[t.status];
    return '<span style="color:' + color + '">● ' + esc(STATUS_LABEL[t.status]) + "</span> ·";
  }

  /* 既定の受取先（＝いまの宅配のやり方）では受け取れない荷物を先頭で可視化する */
  function renderBlockedBanner() {
    var box = $("blockedBanner");
    if (!box) return;
    var stuck = D.PARCELS.filter(function (p) {
      return E.tracking(p.id).status === "planning";
    });
    if (!stuck.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="banner" style="margin-bottom:16px">' +
      "<b>⛔ " + stuck.length + "件が「自宅で受け取る」前提のままでは成立しません</b><br>" +
      '<span class="small">' +
      stuck.map(function (p) { return esc(p.title); }).join(" / ") +
      "。AIは発注までを自動化できても、受取の制約（温度帯・本人確認・置き配不可）で止まります。" +
      "荷物を選んで受取先を変えてみてください。</span></div>";
  }

  function renderFocusPanel() {
    var box = $("focusPanel");
    if (!box) return;
    var p = D.parcelById(focus);
    var t = E.tracking(focus);
    var pt = D.pointById(t.pointId);
    var html = "";

    html += '<div class="row spread" style="margin-bottom:10px">' +
      "<div><b>" + p.icon + " " + esc(p.title) + "</b>" +
      '<div class="tiny faint">' + esc(p.merchant) +
      (p.orderedBy === "agent" ? " · 発注理由: " + esc(p.agentReason) : "") + "</div></div>" +
      '<span class="pill">' + esc(STATUS_LABEL[t.status]) + "</span></div>";

    html += '<dl class="kv" style="margin-bottom:12px">' +
      "<dt>受取先</dt><dd><b>" + esc(pt.name) + "</b></dd>" +
      "<dt>到着まで</dt><dd>" + (t.status === "received" ? "—" :
        Math.max(0, Math.round((1 - t.progress) * (t.etaMin || 0))) + " 分（シミュレーション）") + "</dd>" +
      "<dt>グラント</dt><dd>" + (t.grant
        ? '<span class="mono">' + esc(t.grant.grant_id) + "</span>（" + esc(t.grant.window.from) + "–" + esc(t.grant.window.to) + "）"
        : "未発行") + "</dd>" +
      "</dl>";

    if (t.pendingApproval) {
      html += '<div class="banner" style="margin-bottom:10px"><b>👤 承認が必要です</b><br>' +
        "自律レベル L" + E.state.autonomy + " の設定により、この変更はあなたの承認待ちです。" +
        '<div class="row" style="margin-top:10px">' +
        '<button class="btn btn-sm btn-primary" data-act="approve">承認する</button>' +
        '<button class="btn btn-sm" data-act="reject">却下</button></div></div>';
    }

    if (t.exception) {
      var isAuto = t.exception.resolvedBy === "auto";
      html += '<div class="banner ' + (isAuto ? "ok" : "danger") + '" style="margin-bottom:10px">' +
        "<b>" + (isAuto ? "🛠 自動復旧" : "🚨 人間へエスカレーション") + "：" + esc(t.exception.label) + "</b><br>" +
        esc(t.exception.note || "") +
        (isAuto ? "" :
          '<div class="row row-wrap" style="margin-top:10px">' +
          '<button class="btn btn-sm" data-act="exc-retry">再試行</button>' +
          '<button class="btn btn-sm" data-act="exc-reroute">別の地点へ</button>' +
          '<button class="btn btn-sm" data-act="exc-return">返送する</button></div>') +
        "</div>";
    }

    html += '<div class="row row-wrap">';
    html += '<button class="btn btn-sm btn-primary" data-act="pick">受取先を変える</button>';
    if (t.status === "arrived") {
      html += '<button class="btn btn-sm" data-act="handover">受渡しを実行</button>';
    }
    if (t.status === "planning") {
      html += '<button class="btn btn-sm" data-act="ai-suggest">AIの提案を見る</button>';
    }
    html += '<button class="btn btn-sm btn-ghost" data-act="tab-grant">グラントを見る</button>';
    html += "</div>";

    box.innerHTML = html;
    box.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () { action(b.getAttribute("data-act")); });
    });
  }

  function action(act) {
    var t = E.tracking(focus);
    if (act === "pick") openPicker();
    else if (act === "handover") E.startHandover(focus);
    else if (act === "approve") { E.approve(focus); renderAll(); }
    else if (act === "reject") { E.rejectApproval(focus); renderAll(); }
    else if (act === "exc-retry") E.resolveException(focus, "retry");
    else if (act === "exc-reroute") E.resolveException(focus, "reroute");
    else if (act === "exc-return") E.resolveException(focus, "return");
    else if (act === "tab-grant") setTab("grant");
    else if (act === "ai-suggest") aiSuggest();
  }

  function aiSuggest() {
    var p = D.parcelById(focus);
    var best = null;
    D.POINTS.forEach(function (pt) {
      var ev = E.evaluate(p, pt);
      if (ev.verdict === "deny") return;
      var score = (pt.eta_min || 30) + (ev.verdict === "conditional" ? 6 : 0) + (pt.risk === "theft" ? 25 : 0) + (pt.risk === "intrusion" ? 60 : 0);
      if (!best || score < best.score) best = { pt: pt, ev: ev, score: score };
    });
    if (!best) return;
    lastVerdict = { ev: best.ev, pointId: best.pt.id, parcelId: focus, suggested: true };
    renderAll();
    var box = $("verdictBox");
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderVerdict() {
    var box = $("verdictBox");
    if (!box) return;
    if (!lastVerdict || lastVerdict.parcelId !== focus) { box.innerHTML = ""; return; }
    var ev = lastVerdict.ev;
    var pt = D.pointById(lastVerdict.pointId);
    var html = '<div class="verdict ' + ev.verdict + '">' +
      "<h4>" + VERDICT_ICON[ev.verdict] + " " + esc(pt.name) + "：" + VERDICT_LABEL[ev.verdict] +
      (lastVerdict.suggested ? '<span class="pill pill-info">AIの提案</span>' : "") + "</h4>";
    if (!ev.findings.length) {
      html += '<div class="finding">制約に触れるルールはありません。そのまま受取地点として使えます。</div>';
    }
    ev.findings.forEach(function (f) {
      html += '<div class="finding"><b>' + VERDICT_ICON[f.verdict] + " " + esc(f.title) + "</b><br>" + esc(f.reason) + "</div>";
    });
    if (ev.conditions.length) {
      html += '<div class="cond-list">' + ev.conditions.map(function (c) {
        return '<span class="pill pill-warn">' + esc(E.conditionLabel(c)) + "</span>";
      }).join("") + "</div>";
    }
    if (lastVerdict.suggested && ev.verdict !== "deny") {
      html += '<div class="row" style="margin-top:12px"><button class="btn btn-sm btn-primary" id="applySuggest">この地点に決める</button></div>';
    }
    html += "</div>";
    box.innerHTML = html;
    var apply = $("applySuggest");
    if (apply) apply.addEventListener("click", function () { tryAssign(focus, lastVerdict.pointId); });
  }

  function renderExceptions() {
    var box = $("excList");
    if (!box) return;
    box.innerHTML = D.EXCEPTIONS.map(function (x) {
      return '<button class="exc" type="button" data-exc="' + x.id + '">' +
        '<span class="sev pill ' + SEV_CLASS[x.severity] + '">' + SEV_LABEL[x.severity] + "</span>" +
        "<b>" + esc(x.label) + "</b>" +
        '<span class="ed">' + esc(x.teaches) + "</span></button>";
    }).join("");
    box.querySelectorAll("[data-exc]").forEach(function (b) {
      b.addEventListener("click", function () {
        E.injectException(focus, b.getAttribute("data-exc"));
        renderAll();
        var fp = $("focusPanel");
        if (fp && fp.scrollIntoView) fp.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  /* ---------- picker sheet ---------- */
  function openPicker() {
    var p = D.parcelById(focus);
    var t = E.tracking(focus);
    var body = $("sheetBody");
    var html = '<div class="sheet-grip"></div>' +
      '<div class="eyebrow">受取先を選ぶ</div>' +
      '<h3 style="font-size:17px;margin:6px 0 4px">' + p.icon + " " + esc(p.title) + "</h3>" +
      '<p class="small muted" style="margin-bottom:14px">' +
      "地点をタップすると、その場で<b>ポリシーエンジンが可否を判定</b>します。" +
      "拒否された場合は理由が返ります（＝AIに委譲しても越えられない境界）。</p>" +
      '<div class="points">';
    D.POINTS.forEach(function (pt) {
      var ev = E.evaluate(p, pt);
      var cls = ev.verdict === "deny" ? "pill-danger" : ev.verdict === "conditional" ? "pill-warn" : "pill-ok";
      html += '<button class="point-opt' + (t.pointId === pt.id ? " is-current" : "") + '" type="button" data-pt="' + pt.id + '">' +
        '<span class="po-ico">' + iconFor(pt) + "</span>" +
        "<span class=\"grow\"><b>" + esc(pt.name) + "</b>" +
        '<span class="po-note">' + esc(pt.note) + "</span></span>" +
        '<span class="po-verdict pill ' + cls + '">' + VERDICT_LABEL[ev.verdict] + "</span></button>";
    });
    html += "</div>" +
      '<div id="sheetVerdict" style="margin-top:14px"></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn btn-sm grow" id="sheetClose">閉じる</button></div>';
    body.innerHTML = html;

    body.querySelectorAll("[data-pt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var pointId = b.getAttribute("data-pt");
        var ev = tryAssign(focus, pointId);
        var sv = $("sheetVerdict");
        if (sv) {
          var pt = D.pointById(pointId);
          sv.innerHTML = '<div class="verdict ' + ev.verdict + '"><h4>' + VERDICT_ICON[ev.verdict] + " " +
            esc(pt.name) + "：" + VERDICT_LABEL[ev.verdict] + "</h4>" +
            ev.findings.map(function (f) {
              return '<div class="finding"><b>' + VERDICT_ICON[f.verdict] + " " + esc(f.title) + "</b><br>" + esc(f.reason) + "</div>";
            }).join("") +
            (ev.conditions.length ? '<div class="cond-list">' + ev.conditions.map(function (c) {
              return '<span class="pill pill-warn">' + esc(E.conditionLabel(c)) + "</span>";
            }).join("") + "</div>" : "") + "</div>";
        }
        // 選択状態を反映
        body.querySelectorAll("[data-pt]").forEach(function (o) {
          o.className = "point-opt" + (o.getAttribute("data-pt") === E.tracking(focus).pointId ? " is-current" : "");
        });
      });
    });
    $("sheetClose").addEventListener("click", closeSheet);
    $("sheet").setAttribute("data-open", "true");
  }
  function closeSheet() { $("sheet").setAttribute("data-open", "false"); }

  function iconFor(pt) {
    return { home: "🏠", locker: "🔐", store: "🏪", office: "🏢", person: "🧑", delegate: "🤝", robot: "🤖" }[pt.icon] || "📦";
  }

  /* ---------- grant view ---------- */
  function renderGrantView() {
    var box = $("grantBox");
    if (!box) return;
    var t = E.tracking(focus);
    var p = D.parcelById(focus);
    var html = "";

    html += '<div class="chain">' + D.CUSTODY_CHAIN.map(function (c) {
      var order = ["order", "fulfill", "transport", "handover", "store"];
      var nowIdx = order.indexOf(t.holder);
      var myIdx = order.indexOf(c.id);
      var cls = myIdx === nowIdx ? "is-now" : myIdx < nowIdx ? "is-done" : "";
      return '<div class="chain-step ' + cls + '"><b>' + esc(c.label) + "</b>" + esc(c.holder.split(" / ")[0]) + "</div>";
    }).join("") + "</div>";
    var holderObj = null;
    D.CUSTODY_CHAIN.forEach(function (c) { if (c.id === t.holder) holderObj = c; });
    html += '<p class="small muted" style="margin-bottom:16px">いまの責任保持者：<b>' +
      esc(holderObj ? holderObj.holder : "—") + "</b>（主なリスク：" + esc(holderObj ? holderObj.risk : "—") + "）</p>";

    if (t.grant) {
      html += '<div class="eyebrow">RECEIPT DELEGATION GRANT</div>' +
        '<p class="small muted" style="margin:6px 0 10px">' +
        "AIエージェントにTool権限を渡すのと同じ発想で、<b>物理的な受取権限</b>を最小スコープ・時限付きで発行します。" +
        "<code>not_granted</code> に「渡していない権限」を明示するのが要点です。</p>" +
        '<pre class="grant">' + grantHtml(t.grant) + "</pre>";
    } else {
      html += '<div class="banner" style="margin-bottom:16px">いまグラントは発行されていません。' +
        "「配送」タブで受取先を決めると発行されます。</div>";
    }

    var curPoint = D.pointById(t.pointId);
    var ev = E.evaluate(p, curPoint);
    html += '<h3 style="font-size:15px;margin:20px 0 8px">ポリシールール（' + D.RULES.length + "件）</h3>" +
      '<p class="small muted" style="margin-bottom:10px">' +
      "「" + esc(p.title) + "」を<b>" + esc(curPoint.name) + "</b>で受け取る場合の判定：" +
      '<span class="pill ' + (ev.verdict === "deny" ? "pill-danger" : ev.verdict === "conditional" ? "pill-warn" : "pill-ok") + '">' +
      VERDICT_ICON[ev.verdict] + " " + VERDICT_LABEL[ev.verdict] + "</span>" +
      (ev.findings.length ? "" : "（抵触するルールなし）") + "</p>";
    html += "<div>" + D.RULES.map(function (r) {
      var hit = null;
      ev.findings.forEach(function (f) { if (f.ruleId === r.id) hit = f; });
      var cls = !hit ? "pill" : hit.verdict === "deny" ? "pill pill-danger" : "pill pill-warn";
      return '<div class="finding"><b>' + esc(r.title) + '</b> <span class="' + cls + '">' +
        (hit ? VERDICT_LABEL[hit.verdict] : "該当なし") + "</span>" +
        (hit ? "<br>" + esc(hit.reason) : "") + "</div>";
    }).join("") + "</div>";

    box.innerHTML = html;
  }

  function renderDial() {
    var box = $("dialBox");
    if (!box) return;
    box.innerHTML = D.AUTONOMY.map(function (a) {
      var on = E.state.autonomy === a.level;
      return '<button class="dial-opt' + (on ? " is-on" : "") + (a.tone === "danger" ? " danger" : "") +
        '" type="button" data-lvl="' + a.level + '">' +
        '<span class="dial-radio"></span>' +
        '<span class="grow"><span class="dn">' + esc(a.name) +
        (a.recommended ? ' <span class="pill pill-ok">推奨</span>' : "") +
        (a.tone === "danger" ? ' <span class="pill pill-danger">非推奨</span>' : "") + "</span>" +
        '<span class="dd">' + esc(a.desc) + "</span></span></button>";
    }).join("");
    var warn = D.AUTONOMY[E.state.autonomy].warning;
    box.querySelectorAll("[data-lvl]").forEach(function (b) {
      b.addEventListener("click", function () {
        E.setAutonomy(parseInt(b.getAttribute("data-lvl"), 10));
        renderAll();
      });
    });
    var wbox = $("dialWarn");
    if (wbox) {
      wbox.innerHTML = warn ? '<div class="banner danger" style="margin-top:12px"><b>⚠️ L4の問題</b><br>' + esc(warn) + "</div>" : "";
    }
  }

  /* ---------- log view ---------- */
  function renderLog() {
    var box = $("logBox");
    if (!box) return;
    var rows = E.state.log.slice(0, 80);
    box.innerHTML = rows.map(function (r) {
      return '<div class="log-row ' + r.level + '">' +
        '<span class="lt">' + esc(r.at) + "</span>" +
        '<span><span class="lk">' + esc(r.kind) + "</span>" +
        '<span class="lm">' + esc(r.message) + "</span>" +
        (r.parcelId ? ' <span class="lsig">#' + esc(r.parcelId) + "</span>" : "") +
        ' <span class="lsig">sig:' + esc(r.sig) + "</span></span></div>";
    }).join("") || '<p class="muted small">まだ記録がありません。</p>';
    var c = $("logCount");
    if (c) c.textContent = E.state.log.length;
  }

  /* ---------- tabs ---------- */
  function setTab(name) {
    tab = name;
    ["flow", "grant", "log", "survey"].forEach(function (t) {
      var v = $("view-" + t);
      if (v) v.classList.toggle("is-active", t === name);
      var b = $("tab-" + t);
      if (b) b.setAttribute("aria-selected", t === name ? "true" : "false");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "survey" && window.LM_SURVEY) window.LM_SURVEY.refresh();
    renderAll();
  }

  /* ---------- render ---------- */
  var renderScheduled = false;
  function renderAll() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(function () {
      renderScheduled = false;
      renderBlockedBanner();
      renderParcels();
      renderFocusPanel();
      renderVerdict();
      renderExceptions();
      renderGrantView();
      renderDial();
      renderLog();
      var lvl = $("lvlPill");
      if (lvl) {
        var a = D.AUTONOMY[E.state.autonomy];
        lvl.textContent = a.name;
        lvl.className = "pill lvl " + (a.tone === "danger" ? "pill-danger" : a.tone === "ok" ? "pill-ok" : "pill-info");
      }
    });
  }

  /* ---------- live loop ---------- */
  function liveBits() {
    var c = $("clock");
    if (c) c.textContent = E.now().slice(0, 5);
    if (refs.bars) {
      Object.keys(refs.bars).forEach(function (id) {
        var t = E.tracking(id);
        var el = refs.bars[id];
        if (el) el.style.width = Math.round(t.progress * 100) + "%";
      });
    }
  }

  /* ---------- init ---------- */
  function init() {
    M.mount($("map"), function (pointId) {
      tryAssign(focus, pointId);
    });
    M.setFocus(focus);
    E.subscribe(function () { renderAll(); });
    E.init();

    ["flow", "grant", "log", "survey"].forEach(function (t) {
      var b = $("tab-" + t);
      if (b) b.addEventListener("click", function () { setTab(t); });
    });
    $("sheet").addEventListener("click", function (e) {
      if (e.target === $("sheet")) closeSheet();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

    var resetBtn = $("resetBtn");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      E.reset();
      M.resetWalk();
      lastVerdict = null;
      renderAll();
    });

    var ob = $("onboard");
    var seen = null;
    try { seen = localStorage.getItem("lm-onboard"); } catch (e) { /* ignore */ }
    if (seen === "1" && ob) ob.hidden = true;
    var start = $("obStart");
    if (start) start.addEventListener("click", function () {
      if (ob) ob.hidden = true;
      try { localStorage.setItem("lm-onboard", "1"); } catch (e) { /* ignore */ }
    });

    if (window.LMTheme) window.LMTheme.bind("#themeBtn");

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      E.tick(dt);
      M.update(E.state, dt);
      liveBits();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    renderAll();
  }

  return { init: init, setTab: setTab };
})();
