/* ==========================================================================
   LAST METERS — デモアプリ UI / demo app UI (ja + en)
   ========================================================================== */
window.LM_UI = (function () {
  var D = window.LM_DATA;
  var E = window.LM_ENGINE;
  var M = window.LM_MAP;
  var I18N = window.LM_I18N;

  var focus = D.PARCELS[0].id;
  var lastVerdict = null;
  var refs = {};

  /* ---------- strings ---------- */
  var S = {
    temp: {
      ambient: { ja: "常温", en: "Ambient" },
      chilled: { ja: "冷蔵", en: "Chilled" },
      frozen: { ja: "冷凍", en: "Frozen" }
    },
    status: {
      planning: { ja: "受取先 未確定", en: "No destination yet" },
      in_transit: { ja: "配送中", en: "In transit" },
      arrived: { ja: "到着・受渡し待ち", en: "Arrived, awaiting handover" },
      handing_over: { ja: "受渡し中", en: "Handing over" },
      received: { ja: "受取完了", en: "Received" },
      blocked: { ja: "停止（要対応）", en: "Blocked — needs action" },
      returned: { ja: "返送", en: "Returned" }
    },
    verdict: {
      allow: { ja: "許可", en: "Allowed" },
      conditional: { ja: "条件付き許可", en: "Allowed with conditions" },
      deny: { ja: "拒否", en: "Denied" }
    },
    sev: {
      low: { ja: "軽", en: "Low" },
      medium: { ja: "中", en: "Med" },
      high: { ja: "重", en: "High" },
      critical: { ja: "重大", en: "Critical" }
    },
    agentOrder: { ja: "🤖 AI自動発注", en: "🤖 AI auto-order" },
    humanOrder: { ja: "👤 手動発注", en: "👤 Ordered by hand" },
    orderReason: { ja: "発注理由", en: "Why" },
    destination: { ja: "受取先", en: "Destination" },
    eta: { ja: "到着まで", en: "Arrives in" },
    etaUnit: { ja: " 分（シミュレーション）", en: " min (simulated)" },
    grant: { ja: "グラント", en: "Grant" },
    noGrant: { ja: "未発行", en: "Not issued" },
    approvalTitle: { ja: "👤 承認が必要です", en: "👤 Your approval is needed" },
    approvalBody: {
      ja: "の設定により、この変更はあなたの承認待ちです。",
      en: " means this change is waiting on you."
    },
    approve: { ja: "承認する", en: "Approve" },
    reject: { ja: "却下", en: "Reject" },
    autoRecovered: { ja: "🛠 自動復旧", en: "🛠 Auto-recovered" },
    escalated: { ja: "🚨 人間へエスカレーション", en: "🚨 Escalated to a human" },
    retry: { ja: "再試行", en: "Retry" },
    rerouteBtn: { ja: "別の地点へ", en: "Send elsewhere" },
    returnBtn: { ja: "返送する", en: "Return it" },
    changeDest: { ja: "受取先を変える", en: "Change destination" },
    doHandover: { ja: "受渡しを実行", en: "Run the handover" },
    aiSuggest: { ja: "AIの提案を見る", en: "See the AI's suggestion" },
    seeGrant: { ja: "グラントを見る", en: "See the grant" },
    noFindings: {
      ja: "制約に触れるルールはありません。そのまま受取地点として使えます。",
      en: "No rule is triggered. This point can be used as-is."
    },
    suggested: { ja: "AIの提案", en: "AI suggestion" },
    applySuggest: { ja: "この地点に決める", en: "Use this point" },
    pickTitle: { ja: "受取先を選ぶ", en: "Choose where it lands" },
    pickBody: {
      ja: "地点をタップすると、その場で<b>ポリシーエンジンが可否を判定</b>します。拒否された場合は理由が返ります（＝AIに委譲しても越えられない境界）。",
      en: "Tap a point and the <b>policy engine decides on the spot</b>. A denial comes back with its reason — the boundary that delegation to an AI cannot cross."
    },
    close: { ja: "閉じる", en: "Close" },
    holderNow: { ja: "いまの責任保持者", en: "Liability sits with" },
    mainRisk: { ja: "主なリスク", en: "main risk" },
    grantIntro: {
      ja: "AIエージェントにTool権限を渡すのと同じ発想で、<b>物理的な受取権限</b>を最小スコープ・時限付きで発行します。<code>not_granted</code> に「渡していない権限」を明示するのが要点です。",
      en: "Exactly like handing an AI agent a scoped tool permission, this issues a <b>physical right to receive</b> — least privilege, time boxed. The point is that <code>not_granted</code> spells out what was *not* handed over."
    },
    grantEmpty: {
      ja: "いまグラントは発行されていません。「配送」タブで受取先を決めると発行されます。",
      en: "No grant is active. Pick a destination on the Delivery tab and one is issued."
    },
    rulesTitle: { ja: "ポリシールール", en: "Policy rules" },
    rulesCount: { ja: "件", en: "" },
    rulesLead: { ja: "を受け取る場合の判定：", en: " — the verdict for this point:" },
    noHit: { ja: "該当なし", en: "Not triggered" },
    noHitAll: { ja: "（抵触するルールなし）", en: " (no rule triggered)" },
    logEmpty: { ja: "まだ記録がありません。", en: "Nothing recorded yet." },
    blockedTitle: {
      ja: "件が「自宅で受け取る」前提のままでは成立しません",
      en: " parcels cannot be delivered while “receive it at home” is the assumption"
    },
    blockedBody: {
      ja: "。AIは発注までを自動化できても、受取の制約（温度帯・本人確認・置き配不可）で止まります。荷物を選んで受取先を変えてみてください。",
      en: ". The AI can automate ordering, but receiving constraints — temperature, identity, no-unattended-drop — stop it dead. Pick a parcel and change where it lands."
    },

    /* ---- 受取ピン / the pickup pin ---- */
    pinHere: { ja: "ここで受け取る", en: "Receive here" },
    pinSet: { ja: "この場所に決定済み", en: "This is the destination" },
    pinDenied: { ja: "ここでは受け取れない", en: "Cannot receive here" },
    pinFollow: { ja: "自分に追従", en: "Follow me" },
    pinFollowOn: { ja: "追従中", en: "Following" },
    pinMe: { ja: "いまいる場所", en: "Where I am" },
    pinVan: { ja: "配送車 約", en: "Van ~" },
    pinVanUnit: { ja: "分", en: " min" },
    pinFollowingMeta: {
      ja: "歩いているあいだ、ピンが自分についてくる",
      en: "the pin keeps following you as you walk"
    },
    pinAway: { ja: "自分から", en: "" },
    pinAwayUnit: { ja: "m", en: " m from you" },
    pinLive: {
      ja: "この荷物はいまこのピンに向かっています。ピンを動かせば配送車もその場で向きを変えます。",
      en: "This parcel is heading to this pin right now — move the pin and the van re-routes on the spot."
    }
  };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function t(v) { return I18N ? I18N.t(v) : (v && (v.ja || v)) || ""; }
  function lang() { return I18N ? I18N.lang : "ja"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function yen(n) { return "¥" + Number(n).toLocaleString("en-US"); }
  var VERDICT_ICON = { allow: "✅", conditional: "⚠️", deny: "⛔" };
  var SEV_CLASS = { low: "pill-info", medium: "pill-warn", high: "pill-danger", critical: "pill-danger" };

  /* ---------- JSON highlighter（行単位なので壊れない） ---------- */
  function grantHtml(grant) {
    var lines = JSON.stringify(grant, null, 2).split("\n");
    var inNotGranted = false;
    return lines.map(function (line) {
      var isNo = false;
      if (/"not_granted"/.test(line)) { inNotGranted = true; isNo = true; }
      else if (inNotGranted) {
        isNo = true;
        if (/\]/.test(line)) inNotGranted = false;
      }
      var m = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.*)$/);
      var out = m
        ? esc(m[1]) + '<span class="k">' + esc(m[2]) + "</span>" + esc(m[3]) + value(m[4])
        : value(line, true);
      return isNo ? '<span class="no">' + out.replace(/<\/?span[^>]*>/g, "") + "</span>" : out;

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
    }).join("\n");
  }

  /* ---------- assignment ---------- */
  function tryAssign(parcelId, pointId) {
    var ev = E.assign(parcelId, pointId);
    lastVerdict = { ev: ev, pointId: pointId, parcelId: parcelId };
    // 一覧から選んだ場合も、地図のピンをその場所へ動かして見た目を一致させる
    if (ev.verdict !== "deny") {
      var pt = D.pointById(pointId);
      if (pt && !pt.dynamic && M.resolvePin() !== pointId) M.setPinToPoint(pointId);
    }
    renderAll();
    if (ev.verdict === "deny" || ev.needsApproval) {
      var box = $("verdictBox");
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ev;
  }

  /* ---------- 受取ピンのカード ----------
     配車アプリの「ここで乗る」に相当する確定操作。ドラッグ中もポリシー判定を
     出し続けるので、「その場所では受け取れない」理由がその場でわかる。       */
  var pinCardScheduled = false;
  function schedulePinCard() {
    if (pinCardScheduled) return;
    pinCardScheduled = true;
    requestAnimationFrame(function () {
      pinCardScheduled = false;
      renderPinCard();
    });
  }

  function renderPinCard() {
    var box = $("pinCard");
    if (!box) return;
    var pin = M.pin();
    var parcel = D.parcelById(focus);
    var pointId = M.resolvePin();
    var pt = D.pointById(pointId);
    var ev = E.evaluate(parcel, pt);
    var tr = E.tracking(focus);
    var isSet = tr.pointId === pointId;

    M.setPinVerdict(ev.verdict);
    M.markCommitted(isSet);

    var where = pin.kind === "me" ? t(S.pinMe) : t(pin.label);
    var meta = t(S.pinVan) + pin.etaMin + t(S.pinVanUnit) + " · " +
      (pin.mode === "follow"
        ? t(S.pinFollowingMeta)
        : t(S.pinAway) + pin.walkM + t(S.pinAwayUnit));

    var why = "";
    if (ev.verdict === "deny") {
      var deny = null;
      ev.findings.forEach(function (f) { if (!deny && f.verdict === "deny") deny = f; });
      why = "⛔ " + esc(t(deny.reason));
    } else if (isSet && pt.dynamic) {
      why = "🛰 " + t(S.pinLive);
    } else if (ev.conditions.length) {
      why = "⚠️ " + ev.conditions.map(function (c) { return esc(t(E.conditionLabel(c))); }).join(" · ");
    }

    box.className = "pin-card" + (ev.verdict === "deny" ? " is-deny" : isSet ? " is-set" : "");
    box.innerHTML =
      '<span class="pc-ico">' + (pin.mode === "follow" ? "🛰" : "📍") + "</span>" +
      '<span class="pc-main">' +
      '<span class="pc-where">' + esc(where) + "</span>" +
      '<span class="pc-meta">' + esc(meta) + "</span></span>" +
      '<span class="pc-actions">' +
      '<button class="btn btn-sm ' + (isSet || ev.verdict === "deny" ? "" : "btn-primary") +
      '" type="button" data-pin="set"' +
      (ev.verdict === "deny" || isSet ? " disabled" : "") + ">" +
      (ev.verdict === "deny" ? t(S.pinDenied) : isSet ? "✓ " + t(S.pinSet) : t(S.pinHere)) + "</button>" +
      '<button class="btn btn-sm btn-follow' + (pin.mode === "follow" ? " is-on" : "") +
      '" type="button" data-pin="follow" aria-pressed="' + (pin.mode === "follow") + '">⌖ ' +
      t(pin.mode === "follow" ? S.pinFollowOn : S.pinFollow) + "</button></span>" +
      (why ? '<p class="pc-why">' + why + "</p>" : "");

    box.querySelectorAll("[data-pin]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-pin") === "follow") {
          M.followMe(pin.mode !== "follow");
          schedulePinCard();
        } else {
          tryAssign(focus, M.resolvePin());
        }
      });
    });
  }

  /* ---------- flow view ---------- */
  function renderBlockedBanner() {
    var box = $("blockedBanner");
    if (!box) return;
    var stuck = D.PARCELS.filter(function (p) { return E.tracking(p.id).status === "planning"; });
    if (!stuck.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="banner" style="margin-bottom:16px">' +
      "<b>⛔ " + stuck.length + t(S.blockedTitle) + "</b><br>" +
      '<span class="small">' +
      stuck.map(function (p) { return esc(t(p.title)); }).join(" / ") +
      t(S.blockedBody) + "</span></div>";
  }

  function renderParcels() {
    var box = $("parcelList");
    if (!box) return;
    box.innerHTML = "";
    refs.bars = {};
    D.PARCELS.forEach(function (p) {
      var tr = E.tracking(p.id);
      var pt = D.pointById(tr.pointId);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "parcel" + (focus === p.id ? " is-focus" : "");
      btn.innerHTML =
        '<span class="parcel-ico">' + p.icon + "</span>" +
        '<span class="grow">' +
        "<b>" + esc(t(p.title)) + "</b>" +
        '<span class="meta">' +
        '<span class="agent-tag">' + t(p.orderedBy === "agent" ? S.agentOrder : S.humanOrder) + "</span> " +
        esc(t(S.temp[p.temp])) + " · " + yen(p.value) +
        "</span>" +
        '<span class="dest">' + statusDot(tr) + " " + esc(t(pt.name)) + "</span>" +
        '<span class="bar"><i style="width:' + Math.round(tr.progress * 100) + '%"></i></span>' +
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

  function statusDot(tr) {
    var color = {
      planning: "var(--text-faint)", in_transit: "var(--brand-1)", arrived: "var(--warn)",
      handing_over: "var(--brand-2)", received: "var(--ok)", blocked: "var(--danger)", returned: "var(--danger)"
    }[tr.status];
    return '<span style="color:' + color + '">● ' + esc(t(S.status[tr.status])) + "</span> ·";
  }

  function renderFocusPanel() {
    var box = $("focusPanel");
    if (!box) return;
    var p = D.parcelById(focus);
    var tr = E.tracking(focus);
    var pt = D.pointById(tr.pointId);
    var html = "";

    html += '<div class="row spread" style="margin-bottom:10px">' +
      "<div><b>" + p.icon + " " + esc(t(p.title)) + "</b>" +
      '<div class="tiny faint">' + esc(t(p.merchant)) +
      (p.orderedBy === "agent" ? " · " + t(S.orderReason) + ": " + esc(t(p.agentReason)) : "") + "</div></div>" +
      '<span class="pill">' + esc(t(S.status[tr.status])) + "</span></div>";

    html += '<dl class="kv" style="margin-bottom:12px">' +
      "<dt>" + t(S.destination) + "</dt><dd><b>" + esc(t(pt.name)) + "</b></dd>" +
      "<dt>" + t(S.eta) + "</dt><dd>" + (tr.status === "received" ? "—" :
        Math.max(0, Math.round((1 - tr.progress) * (tr.etaMin || 0))) + t(S.etaUnit)) + "</dd>" +
      "<dt>" + t(S.grant) + "</dt><dd>" + (tr.grant
        ? '<span class="mono">' + esc(tr.grant.grant_id) + "</span>（" + esc(tr.grant.window.from) + "–" + esc(tr.grant.window.to) + "）"
        : t(S.noGrant)) + "</dd>" +
      "</dl>";

    if (tr.pendingApproval) {
      html += '<div class="banner" style="margin-bottom:10px"><b>' + t(S.approvalTitle) + "</b><br>" +
        (lang() === "en" ? "Autonomy L" + E.state.autonomy : "自律レベル L" + E.state.autonomy) +
        t(S.approvalBody) +
        '<div class="row" style="margin-top:10px">' +
        '<button class="btn btn-sm btn-primary" data-act="approve">' + t(S.approve) + "</button>" +
        '<button class="btn btn-sm" data-act="reject">' + t(S.reject) + "</button></div></div>";
    }

    if (tr.exception) {
      var isAuto = tr.exception.resolvedBy === "auto";
      html += '<div class="banner ' + (isAuto ? "ok" : "danger") + '" style="margin-bottom:10px">' +
        "<b>" + t(isAuto ? S.autoRecovered : S.escalated) + "：" + esc(t(tr.exception.label)) + "</b><br>" +
        esc(t(tr.exception.note)) +
        (isAuto ? "" :
          '<div class="row row-wrap" style="margin-top:10px">' +
          '<button class="btn btn-sm" data-act="exc-retry">' + t(S.retry) + "</button>" +
          '<button class="btn btn-sm" data-act="exc-reroute">' + t(S.rerouteBtn) + "</button>" +
          '<button class="btn btn-sm" data-act="exc-return">' + t(S.returnBtn) + "</button></div>") +
        "</div>";
    }

    html += '<div class="row row-wrap">';
    html += '<button class="btn btn-sm btn-primary" data-act="pick">' + t(S.changeDest) + "</button>";
    if (tr.status === "arrived") html += '<button class="btn btn-sm" data-act="handover">' + t(S.doHandover) + "</button>";
    if (tr.status === "planning") html += '<button class="btn btn-sm" data-act="ai-suggest">' + t(S.aiSuggest) + "</button>";
    html += '<button class="btn btn-sm btn-ghost" data-act="tab-grant">' + t(S.seeGrant) + "</button>";
    html += "</div>";

    box.innerHTML = html;
    box.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () { action(b.getAttribute("data-act")); });
    });
  }

  function action(act) {
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
      var score = (pt.eta_min || 30) + (ev.verdict === "conditional" ? 6 : 0) +
        (pt.risk === "theft" ? 25 : 0) + (pt.risk === "intrusion" ? 60 : 0);
      if (!best || score < best.score) best = { pt: pt, ev: ev, score: score };
    });
    if (!best) return;
    lastVerdict = { ev: best.ev, pointId: best.pt.id, parcelId: focus, suggested: true };
    renderAll();
    var box = $("verdictBox");
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function verdictCard(ev, pt, suggested) {
    var html = '<div class="verdict ' + ev.verdict + '">' +
      "<h4>" + VERDICT_ICON[ev.verdict] + " " + esc(t(pt.name)) + "：" + t(S.verdict[ev.verdict]) +
      (suggested ? ' <span class="pill pill-info">' + t(S.suggested) + "</span>" : "") + "</h4>";
    if (!ev.findings.length) html += '<div class="finding">' + t(S.noFindings) + "</div>";
    ev.findings.forEach(function (f) {
      html += '<div class="finding"><b>' + VERDICT_ICON[f.verdict] + " " + esc(t(f.title)) + "</b><br>" +
        esc(t(f.reason)) + "</div>";
    });
    if (ev.conditions.length) {
      html += '<div class="cond-list">' + ev.conditions.map(function (c) {
        return '<span class="pill pill-warn">' + esc(t(E.conditionLabel(c))) + "</span>";
      }).join("") + "</div>";
    }
    return html + "</div>";
  }

  function renderVerdict() {
    var box = $("verdictBox");
    if (!box) return;
    if (!lastVerdict || lastVerdict.parcelId !== focus) { box.innerHTML = ""; return; }
    var ev = lastVerdict.ev;
    var pt = D.pointById(lastVerdict.pointId);
    var html = verdictCard(ev, pt, lastVerdict.suggested);
    if (lastVerdict.suggested && ev.verdict !== "deny") {
      html += '<div class="row" style="margin-top:10px"><button class="btn btn-sm btn-primary" id="applySuggest">' +
        t(S.applySuggest) + "</button></div>";
    }
    box.innerHTML = html;
    var apply = $("applySuggest");
    if (apply) apply.addEventListener("click", function () { tryAssign(focus, lastVerdict.pointId); });
  }

  function renderExceptions() {
    var box = $("excList");
    if (!box) return;
    box.innerHTML = D.EXCEPTIONS.map(function (x) {
      return '<button class="exc" type="button" data-exc="' + x.id + '">' +
        '<span class="sev pill ' + SEV_CLASS[x.severity] + '">' + t(S.sev[x.severity]) + "</span>" +
        "<b>" + esc(t(x.label)) + "</b>" +
        '<span class="ed">' + esc(t(x.teaches)) + "</span></button>";
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
    var tr = E.tracking(focus);
    var body = $("sheetBody");
    var html = '<div class="sheet-grip"></div>' +
      '<div class="eyebrow">' + t(S.pickTitle) + "</div>" +
      '<h3 style="font-size:17px;margin:6px 0 4px">' + p.icon + " " + esc(t(p.title)) + "</h3>" +
      '<p class="small muted" style="margin-bottom:14px">' + t(S.pickBody) + "</p>" +
      '<div class="points">';
    D.POINTS.forEach(function (pt) {
      var ev = E.evaluate(p, pt);
      var cls = ev.verdict === "deny" ? "pill-danger" : ev.verdict === "conditional" ? "pill-warn" : "pill-ok";
      html += '<button class="point-opt' + (tr.pointId === pt.id ? " is-current" : "") + '" type="button" data-pt="' + pt.id + '">' +
        '<span class="po-ico">' + iconFor(pt) + "</span>" +
        '<span class="grow"><b>' + esc(t(pt.name)) + "</b>" +
        '<span class="po-note">' + esc(t(pt.note)) + "</span></span>" +
        '<span class="po-verdict pill ' + cls + '">' + t(S.verdict[ev.verdict]) + "</span></button>";
    });
    html += "</div>" +
      '<div id="sheetVerdict" style="margin-top:14px"></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn btn-sm grow" id="sheetClose">' + t(S.close) + "</button></div>";
    body.innerHTML = html;

    body.querySelectorAll("[data-pt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var pointId = b.getAttribute("data-pt");
        var ev = tryAssign(focus, pointId);
        var sv = $("sheetVerdict");
        if (sv) sv.innerHTML = verdictCard(ev, D.pointById(pointId), false);
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
    var tr = E.tracking(focus);
    var p = D.parcelById(focus);
    var order = ["order", "fulfill", "transport", "handover", "store"];
    var nowIdx = order.indexOf(tr.holder);
    var html = "";

    html += '<div class="chain">' + D.CUSTODY_CHAIN.map(function (c) {
      var myIdx = order.indexOf(c.id);
      var cls = myIdx === nowIdx ? "is-now" : myIdx < nowIdx ? "is-done" : "";
      return '<div class="chain-step ' + cls + '"><b>' + esc(t(c.label)) + "</b>" + esc(t(c.holderShort)) + "</div>";
    }).join("") + "</div>";

    var holderObj = null;
    D.CUSTODY_CHAIN.forEach(function (c) { if (c.id === tr.holder) holderObj = c; });
    html += '<p class="small muted" style="margin-bottom:16px">' + t(S.holderNow) + "：<b>" +
      esc(holderObj ? t(holderObj.holder) : "—") + "</b>（" + t(S.mainRisk) + "：" +
      esc(holderObj ? t(holderObj.risk) : "—") + "）</p>";

    if (tr.grant) {
      html += '<div class="eyebrow">RECEIPT DELEGATION GRANT</div>' +
        '<p class="small muted" style="margin:6px 0 10px">' + t(S.grantIntro) + "</p>" +
        '<pre class="grant">' + grantHtml(tr.grant) + "</pre>";
    } else {
      html += '<div class="banner" style="margin-bottom:16px">' + t(S.grantEmpty) + "</div>";
    }

    var curPoint = D.pointById(tr.pointId);
    var ev = E.evaluate(p, curPoint);
    html += '<h3 style="font-size:15px;margin:20px 0 8px">' + t(S.rulesTitle) +
      "（" + D.RULES.length + t(S.rulesCount) + "）</h3>" +
      '<p class="small muted" style="margin-bottom:10px">「' + esc(t(p.title)) + "」→ <b>" +
      esc(t(curPoint.name)) + "</b>" + t(S.rulesLead) +
      '<span class="pill ' + (ev.verdict === "deny" ? "pill-danger" : ev.verdict === "conditional" ? "pill-warn" : "pill-ok") + '">' +
      VERDICT_ICON[ev.verdict] + " " + t(S.verdict[ev.verdict]) + "</span>" +
      (ev.findings.length ? "" : t(S.noHitAll)) + "</p>";

    html += "<div>" + D.RULES.map(function (r) {
      var hit = null;
      ev.findings.forEach(function (f) { if (f.ruleId === r.id) hit = f; });
      var cls = !hit ? "pill" : hit.verdict === "deny" ? "pill pill-danger" : "pill pill-warn";
      return '<div class="finding"><b>' + esc(t(r.title)) + '</b> <span class="' + cls + '">' +
        (hit ? t(S.verdict[hit.verdict]) : t(S.noHit)) + "</span>" +
        (hit ? "<br>" + esc(t(hit.reason)) : "") + "</div>";
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
        '<span class="grow"><span class="dn">' + esc(t(a.name)) +
        (a.recommended ? ' <span class="pill pill-ok">' + t(a.short) + "</span>" : "") +
        (a.tone === "danger" ? ' <span class="pill pill-danger">' + t(a.short) + "</span>" : "") + "</span>" +
        '<span class="dd">' + esc(t(a.desc)) + "</span></span></button>";
    }).join("");
    box.querySelectorAll("[data-lvl]").forEach(function (b) {
      b.addEventListener("click", function () {
        E.setAutonomy(parseInt(b.getAttribute("data-lvl"), 10));
        renderAll();
      });
    });
    var warn = D.AUTONOMY[E.state.autonomy].warning;
    var wbox = $("dialWarn");
    if (wbox) {
      wbox.innerHTML = warn
        ? '<div class="banner danger" style="margin-top:12px"><b>⚠️ ' +
          (lang() === "en" ? "Why L4 is a problem" : "L4の問題") + "</b><br>" + esc(t(warn)) + "</div>"
        : "";
    }
  }

  /* ---------- log view ---------- */
  function renderLog() {
    var box = $("logBox");
    if (!box) return;
    box.innerHTML = E.state.log.slice(0, 80).map(function (r) {
      return '<div class="log-row ' + r.level + '">' +
        '<span class="lt">' + esc(r.at) + "</span>" +
        '<span><span class="lk">' + esc(r.kind) + "</span>" +
        '<span class="lm">' + esc(t(r.message)) + "</span>" +
        (r.parcelId ? ' <span class="lsig">#' + esc(r.parcelId) + "</span>" : "") +
        ' <span class="lsig">sig:' + esc(r.sig) + "</span></span></div>";
    }).join("") || '<p class="muted small">' + t(S.logEmpty) + "</p>";
    var c = $("logCount");
    if (c) c.textContent = E.state.log.length;
  }

  /* ======================================================================
     配送エージェント
     ここがこのデモの主役。方針の内側は黙って実行し、外に出るときだけ聞く。
     ====================================================================== */
  var A = window.LM_AGENT;
  var POL = window.LM_POLICY;
  var PR = window.LM_PROVIDERS;

  var AG = {
    thinking: [
      { ja: "予定と現在地を確認しています", en: "Reading your calendar and location", tool: "calendar.busy_windows" },
      { ja: "配送ネットワークを確認しています", en: "Checking the delivery network", tool: "locker.availability" },
      { ja: "候補を評価しています", en: "Scoring the options", tool: "lastmeters.list_options" },
      { ja: "方針と権限を照合しています", en: "Checking your policy and permissions", tool: "lastmeters.check_permission" },
      { ja: "実行しています", en: "Executing", tool: "lastmeters.commit" }
    ],
    done: { ja: "変更しました", en: "Delivery updated" },
    noneTitle: { ja: "変更していません", en: "Nothing changed" },
    askTitle: { ja: "判断をお願いします", en: "Needs your decision" },
    selfTitle: { ja: "本人の承認が要ります", en: "This one needs you" },
    failTitle: { ja: "変更できませんでした", en: "The change did not go through" },
    blockedTitle: { ja: "受け取る方法がありません", en: "No way to receive this" },
    escalateTitle: { ja: "自分では決めません", en: "It will not keep deciding" },
    undo: { ja: "元に戻す", en: "Undo" },
    undone: { ja: "元に戻しました", en: "Undone" },
    settled: { ja: "確定しました", en: "Locked in" },
    keep: { ja: "今のままにする", en: "Keep current delivery" },
    accept: { ja: "変更する", en: "Switch to it" },
    approve: { ja: "承認して変更する", en: "Approve and switch" },
    why: { ja: "判断の内訳を見る", en: "See how it decided" },
    hide: { ja: "閉じる", en: "Hide" },
    cands: { ja: "評価した候補", en: "Options it scored" },
    chance: { ja: "受け取れる見込み", en: "Chance you receive it" },
    checks: { ja: "方針との照合", en: "Checked against your policy" },
    rejected: { ja: "候補から外したもの", en: "Ruled out before scoring" },
    emptyRun: {
      ja: "まだ何も任せていません。上の「4件を任せる」を押すと、エージェントが荷物ごとに判断します。",
      en: "Nothing handed over yet. Press “Hand over all four” and the agent decides for each parcel."
    },
    surgeOn: { ja: "例外モード：駅ロッカーが満杯", en: "Exception mode: the station locker is full" },
    surgeOff: { ja: "通常に戻す", en: "Back to normal" },
    autoNote: {
      ja: "方針の内側だったので、聞かずに実行して、あとから知らせています。取り消せるうちは聞きません。",
      en: "It was inside your policy, so it acted first and told you after. While it can be undone, it does not ask."
    },
    confirmNote: {
      ja: "方針の外に出るので、自動では決めません。",
      en: "This falls outside your policy, so the agent will not decide it."
    },
    explicitNote: {
      ja: "これは方針では上書きできません。本人の承認が要ります。",
      en: "Your policy cannot override this one. It needs you."
    }
  };

  var LEVEL_TONE = { auto: "ok", confirm: "warn", explicit: "danger", none: "info",
    failed: "danger", blocked: "danger", escalate: "warn" };

  var thinkingTimer = null;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** エージェントの「考え中」。2秒以内。何を呼んだかを併記する。 */
  function runAgent() {
    var box = $("agentThinking");
    if (!box) return;
    if (thinkingTimer) { clearInterval(thinkingTimer); thinkingTimer = null; }

    function finish() {
      box.innerHTML = "";
      A.runAll("user_action");
      renderAgentPanel();
      renderAll();
    }

    if (reducedMotion()) {
      box.innerHTML = '<div class="think">' + AG.thinking.map(function (s) {
        return '<div class="think-row is-done"><span class="think-tick">✓</span>' +
          '<span>' + esc(t(s)) + '</span><code class="think-tool">' + esc(s.tool) + "</code></div>";
      }).join("") + "</div>";
      finish();
      return;
    }

    var i = 0;
    function paint() {
      box.innerHTML = '<div class="think">' + AG.thinking.map(function (s, n) {
        var cls = n < i ? "is-done" : n === i ? "is-now" : "";
        return '<div class="think-row ' + cls + '">' +
          '<span class="think-tick">' + (n < i ? "✓" : n === i ? "•" : "") + "</span>" +
          '<span>' + esc(t(s)) + '</span><code class="think-tool">' + esc(s.tool) + "</code></div>";
      }).join("") + "</div>";
    }
    paint();
    thinkingTimer = setInterval(function () {
      i++;
      if (i >= AG.thinking.length) {
        clearInterval(thinkingTimer); thinkingTimer = null;
        finish();
        return;
      }
      paint();
    }, 320);
  }

  function pctText(p) { return Math.round(p * 100) + "%"; }

  /** 判断カード1枚。auto / confirm / explicit / none / failed を1つの形で出す。 */
  function decisionCard(d) {
    var tone = LEVEL_TONE[d.outcome === "failed" ? "failed" : d.action] || "info";
    var title, note = "";
    if (d.outcome === "failed") { title = AG.failTitle; }
    else if (d.action === "none") { title = AG.noneTitle; }
    else if (d.action === "blocked") { title = AG.blockedTitle; }
    else if (d.action === "escalate") { title = AG.escalateTitle; }
    else if (d.action === "auto") { title = AG.done; note = t(AG.autoNote); }
    else if (d.action === "confirm") { title = AG.askTitle; note = t(AG.confirmNote); }
    else { title = AG.selfTitle; note = t(AG.explicitNote); }

    var h = '<article class="dec dec-' + tone + '" data-dec="' + esc(d.id) + '">';
    h += '<header class="dec-head"><b>' + esc(t(title)) + "</b>" +
      '<span class="pill tiny">' + esc(t(d.parcel.title)) + "</span></header>";

    if (d.to && d.from && d.action !== "none") {
      h += '<div class="dec-move"><span class="dec-from">' + esc(t(d.from.name)) + " " + esc(d.from.at) + "</span>" +
        '<span class="dec-arrow">→</span>' +
        '<span class="dec-to">' + esc(t(d.to.name)) + " " + esc(d.to.at) + "</span></div>";
    }

    h += '<p class="dec-reason">' + esc(t(d.reason)) + "</p>";

    if (d.to && d.action !== "none") {
      h += '<div class="dec-facts">' +
        fact({ ja: "追加料金", en: "Extra" }, d.to.extraCost === 0 ? "¥0" : "¥" + d.to.extraCost) +
        fact({ ja: "徒歩", en: "On foot" }, "+" + d.to.walkMin + (I18N && I18N.lang === "ja" ? "分" : " min")) +
        fact(AG.chance, pctText(d.to.successP)) +
        "</div>";
    }

    if (note) h += '<p class="dec-note tiny faint">' + esc(note) + "</p>";

    /* 取り消し。残り時間を出し、0になったら「確定しました」に変わる。 */
    if (d.action === "auto" && d.outcome === "executed") {
      h += '<div class="row row-wrap dec-actions">' +
        '<button class="btn btn-sm" data-undo="' + esc(d.id) + '" type="button">' + esc(t(AG.undo)) + "</button>" +
        '<span class="tiny faint" data-countdown="' + esc(d.id) + '"></span></div>';
    } else if (d.outcome === "undone") {
      h += '<p class="tiny ok-text dec-actions">' + esc(t(AG.undone)) + "</p>";
    } else if ((d.action === "confirm" || d.action === "explicit") && d.outcome === "pending") {
      h += '<div class="row row-wrap dec-actions">' +
        '<button class="btn btn-sm btn-ghost" data-reject="' + esc(d.id) + '" type="button">' + esc(t(AG.keep)) + "</button>" +
        '<button class="btn btn-sm btn-primary" data-confirm="' + esc(d.id) + '" type="button">' +
        esc(t(d.action === "explicit" ? AG.approve : AG.accept)) + "</button></div>";
    } else if (d.outcome === "confirmed") {
      h += '<p class="tiny ok-text dec-actions">' + esc(t(AG.settled)) + "</p>";
    } else if (d.outcome === "rejected") {
      h += '<p class="tiny faint dec-actions">' + esc(t(AG.keep)) + "</p>";
    }

    /* 判断の内訳。数字だけでなく「なぜその数字か」まで開ける。 */
    if (d.candidates && d.candidates.length) {
      h += '<details class="dec-why"><summary>' + esc(t(AG.why)) + "</summary>";
      if (d.approval && d.approval.checks && d.approval.checks.length) {
        h += '<div class="why-block"><span class="why-h">' + esc(t(AG.checks)) + "</span>" +
          d.approval.checks.map(function (c) {
            return '<div class="why-row"><span>' + esc(t(c.label)) + "</span>" +
              '<span class="' + (c.ok ? "ok-text" : "warn-text") + '">' +
              (c.ok ? "✓ " : "✕ ") + esc(t(c.value)) + "</span></div>";
          }).join("") + "</div>";
      }
      h += '<div class="why-block"><span class="why-h">' + esc(t(AG.cands)) + "</span>" +
        d.candidates.slice(0, 4).map(function (c, n) {
          return '<div class="why-row"><span>' + (n === 0 ? "★ " : "") + esc(t(c.name)) +
            ' <span class="faint">' + esc(c.at) + "</span></span>" +
            '<span class="faint">¥' + c.extraCost + " · " + pctText(c.successP) + "</span></div>" +
            '<div class="why-sub">' + c.success.applied.map(function (f) {
              return esc(t(f.label)) + " " + (f.delta > 0 ? "+" : "") + Math.round(f.delta * 100) + "pt";
            }).join(" / ") + "</div>";
        }).join("") + "</div>";
      if (d.rejected && d.rejected.length) {
        h += '<div class="why-block"><span class="why-h">' + esc(t(AG.rejected)) + "</span>" +
          d.rejected.map(function (r) {
            return '<div class="why-row why-row--stack"><span>' + esc(t(r.option.label)) + "</span>" +
              '<span class="faint">' + esc(t(r.reason)) + "</span></div>";
          }).join("") + "</div>";
      }
      h += "</details>";
    }
    h += "</article>";
    return h;
  }

  function fact(label, value) {
    return '<div class="dec-fact"><span class="tiny faint">' + esc(t(label)) +
      '</span><b>' + esc(value) + "</b></div>";
  }

  var decSig = "";

  /** 荷物ごとに最新の判断を1枚だけ、荷物の並び順で出す。
      同じ荷物の古い判断を積み上げても読みづらいだけなので置き換える。 */
  function latestPerParcel() {
    var all = A.decisions();
    var seen = {};
    all.forEach(function (d) { if (!seen[d.parcelId]) seen[d.parcelId] = d; });
    var out = [];
    D.PARCELS.forEach(function (p) { if (seen[p.id]) out.push(seen[p.id]); });
    return out;
  }

  function renderAgentPanel(force) {
    var box = $("agentDecisions");
    if (!box) return;
    var list = latestPerParcel();
    var sig = list.map(function (d) { return d.id + ":" + d.outcome; }).join("|") +
      "|" + (I18N ? I18N.mode : "");
    if (!force && sig === decSig) return;   // 変わっていなければ触らない（開いた内訳を閉じないため）
    decSig = sig;

    if (!list.length) {
      box.innerHTML = '<p class="small muted agent-empty">' + esc(t(AG.emptyRun)) + "</p>";
      return;
    }
    box.innerHTML = list.map(decisionCard).join("");

    box.querySelectorAll("[data-undo]").forEach(function (b) {
      b.addEventListener("click", function () {
        A.undo(b.getAttribute("data-undo"));
        renderAgentPanel(); renderAll();
      });
    });
    box.querySelectorAll("[data-confirm]").forEach(function (b) {
      b.addEventListener("click", function () {
        A.confirm(b.getAttribute("data-confirm"));
        renderAgentPanel(); renderAll();
      });
    });
    box.querySelectorAll("[data-reject]").forEach(function (b) {
      b.addEventListener("click", function () {
        A.reject(b.getAttribute("data-reject"));
        renderAgentPanel(); renderAll();
      });
    });
  }

  /** 取り消しの残り時間。毎フレーム呼ばれるので、DOMは作り直さず文字だけ差し替える。 */
  function tickCountdowns() {
    var nodes = document.querySelectorAll("[data-countdown]");
    for (var i = 0; i < nodes.length; i++) {
      var d = A.byId(nodes[i].getAttribute("data-countdown"));
      if (!d) continue;
      var card = nodes[i].closest(".dec");
      if (A.canUndo(d)) {
        var s = A.undoSecondsLeft(d);
        nodes[i].textContent = (I18N && I18N.lang === "ja" ? "あと " : "")
          + Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2)
          + (I18N && I18N.lang === "ja" ? " で確定" : " left");
      } else if (d.outcome === "executed") {
        /* 取り消せなくなった瞬間に、確定したことを伝える */
        nodes[i].textContent = t(AG.settled);
        var btn = card && card.querySelector("[data-undo]");
        if (btn) btn.remove();
      }
    }
  }

  /* ---------- 方針 ---------- */
  function renderPolicy() {
    var box = $("policyForm");
    if (!box) return;
    /* 操作中のスライダーを作り直すと指が離れてしまう。触っている間は触らない。 */
    if (box.contains(document.activeElement) && box.innerHTML) return;
    var p = POL.get();
    var L = POL.LABELS;
    var ja = I18N && I18N.lang === "ja";

    function row(key, control) {
      return '<div class="pol-row"><div class="pol-label"><b>' + esc(t(L[key].title)) + "</b>" +
        '<span class="tiny faint">' + esc(t(L[key].note)) + "</span></div>" + control + "</div>";
    }
    function slider(name, min, max, step, val, fmt) {
      return '<div class="pol-ctl"><output id="out-' + name + '">' + esc(fmt(val)) + "</output>" +
        '<input type="range" id="pol-' + name + '" min="' + min + '" max="' + max +
        '" step="' + step + '" value="' + val + '" aria-label="' + esc(t(L[name] ? L[name].title : name)) + '"></div>';
    }
    function radios(name, opts, val) {
      return '<div class="pol-ctl"><div class="opts">' + opts.map(function (o) {
        return '<label class="opt' + (o.v === val ? " is-on" : "") + '">' +
          '<input type="radio" name="pol-' + name + '" value="' + esc(o.v) + '"' +
          (o.v === val ? " checked" : "") + "><span>" + esc(t(o.l)) + "</span></label>";
      }).join("") + "</div></div>";
    }

    var yen = function (v) { return "¥" + Number(v).toLocaleString(); };
    var mins = function (v) { return v + (ja ? "分" : " min"); };

    var h = "";
    h += row("maxExtraCostJpy", slider("maxExtraCostJpy", 0, 1500, 50, p.maxExtraCostJpy, yen));
    h += row("maxRouteDeviationMin", slider("maxRouteDeviationMin", 0, 60, 5, p.maxRouteDeviationMin, mins));
    h += row("optimize", radios("optimize", POL.OPTIMIZE_OPTS, p.optimize));
    h += row("shareLocation", radios("shareLocation", POL.SHARE_OPTS, p.shareLocation));
    h += row("explicitOverJpy", slider("explicitOverJpy", 0, 100000, 5000, p.explicitOverJpy, yen));
    h += '<div class="pol-row"><div class="pol-label"><b>' + esc(t(L.quiet.title)) + "</b>" +
      '<span class="tiny faint">' + esc(t(L.quiet.note)) + '</span></div>' +
      '<div class="pol-ctl"><b class="mono">' + POL.hhmm(p.quietFromMin) + " – " + POL.hhmm(p.quietToMin) + "</b></div></div>";
    h += '<div class="row" style="margin-top:6px"><button class="btn btn-sm btn-ghost" id="polReset" type="button">' +
      (ja ? "既定に戻す" : "Reset to defaults") + "</button></div>";
    box.innerHTML = h;

    function onPolicyChange(patch) {
      POL.set(patch);
      /* 方針が変われば判断もやり直す。上限を上げると confirm が auto に変わる。 */
      A.runAll("user_action");
      renderPolicy();
      renderPolicySummary();
      renderAgentPanel();
      renderAll();
    }

    [["maxExtraCostJpy", yen], ["maxRouteDeviationMin", mins], ["explicitOverJpy", yen]]
      .forEach(function (pair) {
        var name = pair[0], fmt = pair[1];
        var el = $("pol-" + name);
        if (!el) return;
        el.addEventListener("input", function () {
          var o = $("out-" + name);
          if (o) o.textContent = fmt(el.value);
        });
        el.addEventListener("change", function () {
          var patch = {}; patch[name] = Number(el.value);
          onPolicyChange(patch);
        });
      });
    box.querySelectorAll('input[type="radio"]').forEach(function (r) {
      r.addEventListener("change", function () {
        var patch = {};
        patch[r.name.replace("pol-", "")] = r.value;
        onPolicyChange(patch);
      });
    });
    var pr = $("polReset");
    if (pr) pr.addEventListener("click", function () {
      POL.reset(); A.runAll("user_action");
      renderPolicy(); renderPolicySummary(); renderAgentPanel(); renderAll();
    });
  }

  function renderPolicySummary() {
    var box = $("policySummary");
    if (!box) return;
    var s = POL.summary(POL.get());
    var ja = I18N && I18N.lang === "ja";
    function block(cls, head, items) {
      return '<div class="pol-sum ' + cls + '"><b>' + esc(head) + "</b><ul>" +
        items.map(function (i) { return "<li>" + esc(t(i)) + "</li>"; }).join("") + "</ul></div>";
    }
    box.innerHTML =
      block("ok", ja ? "黙ってやること" : "Done without asking", s.silent) +
      block("warn", ja ? "必ず確認すること" : "Always confirmed with you", s.confirm) +
      block("danger", ja ? "本人の承認が要ること" : "Needs you in person", s.explicit);
  }

  /* ---------- ツール呼び出し ---------- */
  function renderToolCalls() {
    var box = $("toolCalls");
    if (!box) return;
    var list = PR.calls(24);
    if (!list.length) {
      box.innerHTML = '<p class="muted small">' +
        (I18N && I18N.lang === "ja"
          ? "まだ呼び出しがありません。「配送」タブでエージェントに任せてください。"
          : "No calls yet. Hand the parcels to the agent on the Delivery tab.") + "</p>";
      return;
    }
    box.innerHTML = list.map(function (c) {
      var body = c.error ? "✕ " + c.error : JSON.stringify(c.result);
      if (body && body.length > 150) body = body.slice(0, 150) + "…";
      return '<div class="tc' + (c.error ? " tc-err" : "") + '">' +
        '<div class="tc-line">→ <b>' + esc(c.tool) + "</b>(" +
        esc(JSON.stringify(c.args).slice(1, -1).slice(0, 110)) + ")</div>" +
        '<div class="tc-line tc-res">← ' + esc(body) + '<span class="tc-ms">' + c.ms + "ms</span></div></div>";
    }).join("");
  }

  /* ---------- tabs ---------- */
  function setTab(name) {
    ["flow", "policy", "grant", "log", "survey"].forEach(function (x) {
      var v = $("view-" + x);
      if (v) v.classList.toggle("is-active", x === name);
      var b = $("tab-" + x);
      if (b) b.setAttribute("aria-selected", x === name ? "true" : "false");
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
      renderPinCard();
      renderBlockedBanner();
      renderParcels();
      renderFocusPanel();
      renderVerdict();
      renderExceptions();
      renderGrantView();
      renderDial();
      renderLog();
      renderPolicy();
      renderPolicySummary();
      renderAgentPanel();
      renderToolCalls();
      var lvl = $("lvlPill");
      if (lvl) {
        var a = D.AUTONOMY[E.state.autonomy];
        lvl.textContent = t(a.badge || a.name);
        lvl.className = "pill lvl " + (a.tone === "danger" ? "pill-danger" : a.tone === "ok" ? "pill-ok" : "pill-info");
      }
    });
  }

  function liveBits() {
    var c = $("clock");
    if (c) c.textContent = E.now().slice(0, 5);
    tickCountdowns();
    if (refs.bars) {
      Object.keys(refs.bars).forEach(function (id) {
        var el = refs.bars[id];
        if (el) el.style.width = Math.round(E.tracking(id).progress * 100) + "%";
      });
    }
  }

  /* ---------- init ---------- */
  function init() {
    M.mount($("map"), { onPin: schedulePinCard });
    M.setFocus(focus);
    E.subscribe(function () { renderAll(); });
    E.init();

    ["flow", "policy", "grant", "log", "survey"].forEach(function (x) {
      var b = $("tab-" + x);
      if (b) b.addEventListener("click", function () { setTab(x); });
    });

    /* ---- エージェント ---- */
    var run = $("agentRun");
    if (run) run.addEventListener("click", runAgent);

    var surge = $("agentSurge");
    if (surge) surge.addEventListener("click", function () {
      var on = PR.getMode() !== "surge";
      PR.setMode(on ? "surge" : "normal");
      surge.textContent = t(on ? AG.surgeOff : { ja: "例外を起こす", en: "Force an exception" });
      surge.classList.toggle("is-on", on);
      runAgent();
    });

    var pl = $("agentPolicyLink");
    if (pl) pl.addEventListener("click", function (e) { e.preventDefault(); setTab("policy"); });

    var fail = $("failBtn");
    if (fail) fail.addEventListener("click", function () {
      /* すでに全部決まっていると変更が起きず、失敗させる相手がいない。
         いったん巻き戻してから、次の配送先変更を失敗させる。 */
      E.reset();
      A.reset();
      PR.reset();
      PR.setFailNextReroute(true);
      fail.classList.add("is-on");
      setTab("flow");
      runAgent();
      setTimeout(function () { fail.classList.remove("is-on"); }, 2600);
    });
    $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

    var resetBtn = $("resetBtn");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      E.reset();
      A.reset();
      PR.reset();
      M.resetWalk();
      M.followMe(true);
      lastVerdict = null;
      var sg = $("agentSurge");
      if (sg) { sg.classList.remove("is-on"); sg.textContent = t({ ja: "例外を起こす", en: "Force an exception" }); }
      renderAgentPanel();
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
    if (I18N) {
      I18N.mountToggle("#langBtn");
      I18N.onChange(function () {
        M.mount($("map"), { onPin: schedulePinCard });
        closeSheet();
        renderAll();
        if (window.LM_SURVEY) window.LM_SURVEY.relang();
      });
    }

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
