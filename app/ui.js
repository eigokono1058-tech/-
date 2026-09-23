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
  /* DADS Chip Label の色。色だけに意味を持たせないよう、必ず文言も併記する */
  var VERDICT_COLOR = { allow: "green", conditional: "yellow", deny: "red" };
  var SEV_COLOR = { low: "blue", medium: "yellow", high: "orange", critical: "red" };

  /** DADS Chip Label を1つ作る */
  function chip(text, color, style) {
    return '<span class="dads-chip-label" data-style="' + (style || "outlined") +
      '" data-color="' + (color || "gray") + '">' + esc(text) + "</span>";
  }

  /** DADS Notification Banner を1つ作る */
  var BANNER_ICON = {
    "info-1": '<circle cx="12" cy="12" r="10" fill="currentcolor"/><circle cx="12" cy="8" r="1" fill="Canvas"/><path d="M11 11h2v6h-2z" fill="Canvas"/>',
    success: '<circle cx="12" cy="12" r="10" fill="currentcolor"/><path d="m10.6 16.6-4.2-4.2 1.4-1.4 2.8 2.8 5.6-5.6 1.4 1.4-7 7Z" fill="Canvas"/>',
    warning: '<path d="M12 2 1.5 20.5h21L12 2Zm0 5 7 12.5H5L12 7Zm-1 3.5v4h2v-4h-2Zm0 5.5v2h2v-2h-2Z" fill="currentcolor"/>',
    error: '<circle cx="12" cy="12" r="10" fill="currentcolor"/><path d="M11 6h2v8h-2z" fill="Canvas"/><circle cx="12" cy="17" r="1.2" fill="Canvas"/>'
  };
  var BANNER_LABEL = {
    "info-1": { ja: "インフォメーション", en: "Information" },
    success: { ja: "成功", en: "Success" },
    warning: { ja: "警告", en: "Warning" },
    error: { ja: "エラー", en: "Error" }
  };
  function banner(type, title, bodyHtml, actionsHtml, level) {
    return '<div class="dads-notification-banner" data-style="standard" data-type="' + type + '">' +
      "<" + (level || "h3") + ' class="dads-notification-banner__heading">' +
      '<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="' +
      esc(t(BANNER_LABEL[type])) + '">' + BANNER_ICON[type] + "</svg>" +
      '<span class="dads-notification-banner__heading-text">' + title + "</span></" + (level || "h3") + ">" +
      '<div class="dads-notification-banner__body">' + bodyHtml + "</div>" +
      (actionsHtml ? '<div class="dads-notification-banner__actions">' + actionsHtml + "</div>" : "") +
      "</div>";
  }

  /** DADS Button を1つ作る */
  function button(label, act, type, size) {
    return '<button class="dads-button" data-type="' + (type || "outline") + '" data-size="' + (size || "md") +
      '" type="button" data-act="' + act + '">' + label + "</button>";
  }

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
    /* ドラッグ中も読み上げが追従するよう、状態をライブリージョンとして出す */
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    box.innerHTML =
      '<span class="pc-ico" aria-hidden="true">' + (pin.mode === "follow" ? "🛰" : "📍") + "</span>" +
      '<span class="pc-main">' +
      '<span class="pc-where">' + esc(where) + "</span>" +
      '<span class="pc-meta">' + esc(meta) + "</span></span>" +
      '<span class="pc-actions">' +
      '<button class="dads-button" data-type="' + (isSet || ev.verdict === "deny" ? "outline" : "solid-fill") +
      '" data-size="sm" type="button" data-pin="set"' +
      (ev.verdict === "deny" || isSet ? ' aria-disabled="true"' : "") + ">" +
      (ev.verdict === "deny" ? t(S.pinDenied) : isSet ? "✓ " + t(S.pinSet) : t(S.pinHere)) + "</button>" +
      '<button class="dads-button btn-follow' + (pin.mode === "follow" ? " is-on" : "") +
      '" data-type="outline" data-size="sm" type="button" data-pin="follow" aria-pressed="' +
      (pin.mode === "follow") + '">⌖ ' +
      t(pin.mode === "follow" ? S.pinFollowOn : S.pinFollow) + "</button></span>" +
      (why ? '<p class="pc-why">' + why + "</p>" : "");

    box.querySelectorAll("[data-pin]").forEach(function (b) {
      b.addEventListener("click", function () {
        // DADSのButtonは aria-disabled で無効を表すので、押下側で止める
        if (b.getAttribute("aria-disabled") === "true") return;
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
    box.innerHTML = banner(
      "error",
      esc(stuck.length + t(S.blockedTitle)),
      "<p>" + stuck.map(function (p) { return esc(t(p.title)); }).join(" / ") + t(S.blockedBody) + "</p>"
    );
  }

  function renderParcels() {
    var box = $("parcelList");
    if (!box) return;
    box.innerHTML = "";
    refs.bars = {};
    D.PARCELS.forEach(function (p) {
      var tr = E.tracking(p.id);
      var pt = D.pointById(tr.pointId);
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "parcel" + (focus === p.id ? " is-focus" : "");
      btn.setAttribute("aria-pressed", focus === p.id ? "true" : "false");
      btn.innerHTML =
        '<span class="parcel-ico" aria-hidden="true">' + p.icon + "</span>" +
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
      li.appendChild(btn);
      box.appendChild(li);
      refs.bars[p.id] = btn.querySelector(".bar i");
    });
  }

  /* 状態は色ではなくチップの文言で読ませる（色覚に依存させない） */
  function statusDot(tr) {
    var color = {
      planning: "gray", in_transit: "blue", arrived: "yellow",
      handing_over: "light-blue", received: "green", blocked: "red", returned: "red"
    }[tr.status];
    return chip(t(S.status[tr.status]), color, "filled-1") + " ";
  }

  function renderFocusPanel() {
    var box = $("focusPanel");
    if (!box) return;
    var p = D.parcelById(focus);
    var tr = E.tracking(focus);
    var pt = D.pointById(tr.pointId);
    var html = "";

    html += '<div class="l-cluster" data-justify="between" data-align="start">' +
      '<div class="l-grow"><h4 class="dads-u-std-18B-160 u-no-margin">' + p.icon + " " + esc(t(p.title)) + "</h4>" +
      '<p class="u-text-note u-no-margin">' + esc(t(p.merchant)) +
      (p.orderedBy === "agent" ? " · " + t(S.orderReason) + ": " + esc(t(p.agentReason)) : "") + "</p></div>" +
      chip(t(S.status[tr.status]), "gray") + "</div>";

    html += '<dl class="kv u-mt-16 u-mb-16">' +
      "<dt>" + t(S.destination) + "</dt><dd><b>" + esc(t(pt.name)) + "</b></dd>" +
      "<dt>" + t(S.eta) + "</dt><dd>" + (tr.status === "received" ? "—" :
        Math.max(0, Math.round((1 - tr.progress) * (tr.etaMin || 0))) + t(S.etaUnit)) + "</dd>" +
      "<dt>" + t(S.grant) + "</dt><dd>" + (tr.grant
        ? '<span class="mono">' + esc(tr.grant.grant_id) + "</span>（" + esc(tr.grant.window.from) + "–" + esc(tr.grant.window.to) + "）"
        : t(S.noGrant)) + "</dd>" +
      "</dl>";

    if (tr.pendingApproval) {
      html += banner(
        "warning",
        t(S.approvalTitle),
        "<p>" + (lang() === "en" ? "Autonomy L" + E.state.autonomy : "自律レベル L" + E.state.autonomy) +
          t(S.approvalBody) + "</p>",
        button(t(S.approve), "approve", "solid-fill", "md") + button(t(S.reject), "reject", "outline", "md")
      );
    }

    if (tr.exception) {
      var isAuto = tr.exception.resolvedBy === "auto";
      html += banner(
        isAuto ? "success" : "error",
        t(isAuto ? S.autoRecovered : S.escalated) + "：" + esc(t(tr.exception.label)),
        "<p>" + esc(t(tr.exception.note)) + "</p>",
        isAuto ? "" :
          button(t(S.retry), "exc-retry", "outline", "md") +
          button(t(S.rerouteBtn), "exc-reroute", "outline", "md") +
          button(t(S.returnBtn), "exc-return", "outline", "md")
      );
    }

    html += '<div class="l-cluster u-mt-16">';
    html += button(t(S.changeDest), "pick", "solid-fill", "md");
    if (tr.status === "arrived") html += button(t(S.doHandover), "handover", "outline", "md");
    if (tr.status === "planning") html += button(t(S.aiSuggest), "ai-suggest", "outline", "md");
    html += button(t(S.seeGrant), "tab-grant", "text", "md");
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
      (suggested ? " " + chip(t(S.suggested), "blue", "filled-1") : "") + "</h4>";
    if (!ev.findings.length) html += '<p class="finding">' + t(S.noFindings) + "</p>";
    ev.findings.forEach(function (f) {
      html += '<p class="finding"><b>' + VERDICT_ICON[f.verdict] + " " + esc(t(f.title)) + "</b><br>" +
        esc(t(f.reason)) + "</p>";
    });
    if (ev.conditions.length) {
      html += '<div class="cond-list">' + ev.conditions.map(function (c) {
        return chip(t(E.conditionLabel(c)), "yellow", "filled-2");
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
      html += '<div class="l-cluster u-mt-16">' +
        '<button class="dads-button" data-type="solid-fill" data-size="md" id="applySuggest" type="button">' +
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
      return '<li><button class="exc" type="button" data-exc="' + x.id + '">' +
        '<span class="sev">' + chip(t(S.sev[x.severity]), SEV_COLOR[x.severity], "filled-1") + "</span>" +
        "<b>" + esc(t(x.label)) + "</b>" +
        '<span class="ed">' + esc(t(x.teaches)) + "</span></button></li>";
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
    var html = '<div class="sheet-grip" aria-hidden="true"></div>' +
      '<div class="dads-heading" data-size="20" data-chip style="margin-block-end: calc(8 / 16 * 1rem);">' +
      '<p class="dads-heading__shoulder">' + t(S.pickTitle) + "</p>" +
      '<h2 class="dads-heading__heading">' + p.icon + " " + esc(t(p.title)) + "</h2></div>" +
      '<p class="u-text-support u-mb-16">' + t(S.pickBody) + "</p>" +
      '<div class="points">';
    D.POINTS.forEach(function (pt) {
      var ev = E.evaluate(p, pt);
      html += '<button class="point-opt' + (tr.pointId === pt.id ? " is-current" : "") + '" type="button" data-pt="' + pt.id + '"' +
        (tr.pointId === pt.id ? ' aria-current="true"' : "") + ">" +
        '<span class="po-ico" aria-hidden="true">' + iconFor(pt) + "</span>" +
        '<span class="l-grow"><b>' + esc(t(pt.name)) + "</b>" +
        '<span class="po-note">' + esc(t(pt.note)) + "</span></span>" +
        '<span class="po-verdict">' + chip(t(S.verdict[ev.verdict]), VERDICT_COLOR[ev.verdict], "filled-1") + "</span></button>";
    });
    html += "</div>" +
      '<div id="sheetVerdict" class="u-mt-16"></div>' +
      '<div class="l-cluster u-mt-16"><button class="dads-button" data-type="outline" data-size="lg" id="sheetClose" type="button" style="width:100%">' +
      t(S.close) + "</button></div>";
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

    html += '<ol class="chain">' + D.CUSTODY_CHAIN.map(function (c) {
      var myIdx = order.indexOf(c.id);
      var cls = myIdx === nowIdx ? "is-now" : myIdx < nowIdx ? "is-done" : "";
      return '<li class="chain-step ' + cls + '"' + (myIdx === nowIdx ? ' aria-current="step"' : "") + "><b>" +
        esc(t(c.label)) + "</b>" + esc(t(c.holderShort)) + "</li>";
    }).join("") + "</ol>";

    var holderObj = null;
    D.CUSTODY_CHAIN.forEach(function (c) { if (c.id === tr.holder) holderObj = c; });
    html += '<p class="u-text-support u-mb-24">' + t(S.holderNow) + "：<b>" +
      esc(holderObj ? t(holderObj.holder) : "—") + "</b>（" + t(S.mainRisk) + "：" +
      esc(holderObj ? t(holderObj.risk) : "—") + "）</p>";

    if (tr.grant) {
      html += '<div class="dads-heading" data-size="18"><h3 class="dads-heading__heading">RECEIPT DELEGATION GRANT</h3></div>' +
        '<p class="u-text-support u-mt-8 u-mb-16">' + t(S.grantIntro) + "</p>" +
        '<pre class="grant" tabindex="0" role="region" aria-label="Receipt delegation grant (JSON)">' +
        grantHtml(tr.grant) + "</pre>";
    } else {
      html += banner("info-1", t(S.grantEmpty), "");
    }

    var curPoint = D.pointById(tr.pointId);
    var ev = E.evaluate(p, curPoint);
    html += '<div class="dads-heading u-mt-32" data-size="20" data-chip style="margin-block-end: calc(8 / 16 * 1rem);">' +
      '<h3 class="dads-heading__heading">' + t(S.rulesTitle) + "（" + D.RULES.length + t(S.rulesCount) + "）</h3></div>" +
      '<p class="u-text-support u-mb-16">「' + esc(t(p.title)) + "」→ <b>" +
      esc(t(curPoint.name)) + "</b>" + t(S.rulesLead) + " " +
      chip(VERDICT_ICON[ev.verdict] + " " + t(S.verdict[ev.verdict]), VERDICT_COLOR[ev.verdict], "filled-1") +
      (ev.findings.length ? "" : t(S.noHitAll)) + "</p>";

    /* ルールの判定はDADSのTableで出す（見出しセルと対応がスクリーンリーダーで辿れる） */
    html += '<div class="dads-table" data-row-hover-highlight tabindex="0" role="region" aria-label="' +
      esc(t(S.rulesTitle)) + '"><table class="dads-table__table" data-border="hidden" data-cell-border>' +
      "<tbody>" + D.RULES.map(function (r) {
        var hit = null;
        ev.findings.forEach(function (f) { if (f.ruleId === r.id) hit = f; });
        return '<tr><th class="dads-table__row-header" scope="row">' + esc(t(r.title)) + "</th>" +
          "<td>" + (hit
            ? chip(t(S.verdict[hit.verdict]), VERDICT_COLOR[hit.verdict], "filled-1")
            : chip(t(S.noHit), "gray")) +
          (hit ? "<br>" + esc(t(hit.reason)) : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    box.innerHTML = html;
  }

  function renderDial() {
    var box = $("dialBox");
    if (!box) return;
    /* 自律レベルはDADSのRadioで組む（ラジオグループとして操作・読み上げできる） */
    box.innerHTML = '<fieldset class="dads-form-control-label" data-size="md">' +
      '<legend class="dads-u-visually-hidden">' +
      (lang() === "en" ? "Autonomy level" : "自律レベル") + "</legend>" +
      D.AUTONOMY.map(function (a) {
        var on = E.state.autonomy === a.level;
        return '<label class="dads-radio" data-size="md">' +
          '<span class="dads-radio__radio">' +
          '<input class="dads-radio__input" type="radio" name="autonomy" value="' + a.level + '"' +
          (on ? " checked" : "") + "></span>" +
          '<span class="dads-radio__label"><b>' + esc(t(a.name)) + "</b>" +
          (a.recommended ? " " + chip(t(a.short), "green", "filled-1") : "") +
          (a.tone === "danger" ? " " + chip(t(a.short), "red", "filled-1") : "") +
          '<span class="exc ed" style="border:0;padding:0;background:none;display:block">' +
          esc(t(a.desc)) + "</span></span></label>";
      }).join("") + "</fieldset>";
    box.querySelectorAll('input[name="autonomy"]').forEach(function (b) {
      b.addEventListener("change", function () {
        E.setAutonomy(parseInt(b.value, 10));
        renderAll();
      });
    });
    var warn = D.AUTONOMY[E.state.autonomy].warning;
    var wbox = $("dialWarn");
    if (wbox) {
      wbox.innerHTML = warn
        ? '<div class="u-mt-16">' + banner(
          "error",
          (lang() === "en" ? "Why L4 is a problem" : "L4の問題"),
          "<p>" + esc(t(warn)) + "</p>"
        ) + "</div>"
        : "";
    }
  }

  /* ---------- log view ---------- */
  function renderLog() {
    var box = $("logBox");
    if (!box) return;
    box.innerHTML = E.state.log.slice(0, 80).map(function (r) {
      return '<li class="log-row ' + r.level + '">' +
        '<span class="lt">' + esc(r.at) + "</span>" +
        '<span><span class="lk">' + esc(r.kind) + "</span>" +
        '<span class="lm">' + esc(t(r.message)) + "</span>" +
        (r.parcelId ? ' <span class="lsig">#' + esc(r.parcelId) + "</span>" : "") +
        ' <span class="lsig">sig:' + esc(r.sig) + "</span></span></li>";
    }).join("") || '<li><p class="u-text-support">' + t(S.logEmpty) + "</p></li>";
    var c = $("logCount");
    if (c) c.textContent = E.state.log.length;
  }

  /* ---------- tabs ---------- */
  var TABS = ["flow", "grant", "log", "survey"];
  function setTab(name, focusPanel) {
    TABS.forEach(function (x) {
      var on = x === name;
      var v = $("view-" + x);
      if (v) {
        v.classList.toggle("is-active", on);
        v.hidden = !on;
      }
      var b = $("tab-" + x);
      if (b) {
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.setAttribute("aria-current", on ? "page" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (focusPanel) {
      var panel = $("view-" + name);
      if (panel) panel.focus();
    }
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
      var lvl = $("lvlPill");
      if (lvl) {
        var a = D.AUTONOMY[E.state.autonomy];
        lvl.textContent = t(a.badge || a.name);
        lvl.setAttribute("data-color", a.tone === "danger" ? "red" : a.tone === "ok" ? "green" : "blue");
      }
    });
  }

  function liveBits() {
    var c = $("clock");
    if (c) c.textContent = E.now().slice(0, 5);
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

    /* DADSのTabはアンカー。キーボードは ← → Home End で移動できるようにする */
    TABS.forEach(function (x, i) {
      var b = $("tab-" + x);
      if (!b) return;
      b.setAttribute("tabindex", i === 0 ? "0" : "-1");
      b.addEventListener("click", function (e) {
        e.preventDefault();
        setTab(x);
        history.replaceState(null, "", "#view-" + x);
      });
      b.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = TABS[(i + 1) % TABS.length];
        else if (e.key === "ArrowLeft") next = TABS[(i - 1 + TABS.length) % TABS.length];
        else if (e.key === "Home") next = TABS[0];
        else if (e.key === "End") next = TABS[TABS.length - 1];
        else return;
        e.preventDefault();
        setTab(next);
        var el = $("tab-" + next);
        if (el) el.focus();
      });
    });
    $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

    var resetBtn = $("resetBtn");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      E.reset();
      M.resetWalk();
      M.followMe(true);
      lastVerdict = null;
      renderAll();
    });

    var ob = $("onboard");
    var seen = null;
    try { seen = localStorage.getItem("lm-onboard"); } catch (e) { /* ignore */ }
    if (seen === "1" && ob) ob.hidden = true;
    var start = $("obStart");
    if (start) {
      if (ob && !ob.hidden) start.focus();
      start.addEventListener("click", function () {
        if (ob) ob.hidden = true;
        try { localStorage.setItem("lm-onboard", "1"); } catch (e) { /* ignore */ }
        var first = $("tab-flow");
        if (first) first.focus();
      });
    }

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
