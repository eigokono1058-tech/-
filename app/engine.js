/* ==========================================================================
   LAST METERS — ポリシーエンジン / 受取グラント / 受渡し状態機械
   UIから独立。状態が変わるたびに subscribe() したコールバックを呼ぶ。
   ========================================================================== */
window.LM_ENGINE = (function () {
  var D = window.LM_DATA;

  var listeners = [];
  var state = {
    autonomy: 3,
    simMinutes: 18 * 60 + 2, // 18:02 start
    speed: 30, // 実時間1秒 = シミュレーション30秒
    parcels: {}, // parcelId -> tracking
    log: [], // chain of custody
    lastEval: null,
    running: true
  };

  /* ---------- utils ---------- */
  function hash8(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  function rid(prefix) {
    return prefix + "_" + hash8(prefix + Math.random() + Date.now()).slice(0, 6);
  }
  function clock(min) {
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = Math.floor(m % 60);
    var ss = Math.floor((m % 1) * 60);
    return (
      ("0" + h).slice(-2) + ":" + ("0" + mm).slice(-2) + ":" + ("0" + ss).slice(-2)
    );
  }
  function emit() {
    for (var i = 0; i < listeners.length; i++) listeners[i](state);
  }

  /* ---------- chain of custody log ---------- */
  function log(kind, parcelId, message, extra) {
    var entry = {
      at: clock(state.simMinutes),
      kind: kind,
      parcelId: parcelId,
      message: message,
      holder: extra && extra.holder,
      level: (extra && extra.level) || "info",
      evidence: (extra && extra.evidence) || null
    };
    entry.sig = hash8(entry.at + kind + parcelId + message).slice(0, 6);
    state.log.unshift(entry);
    if (state.log.length > 220) state.log.pop();
    return entry;
  }

  /* ---------- policy engine ---------- */
  function evaluate(parcel, point) {
    var ctx = { autonomy: state.autonomy };
    var findings = [];
    var conditions = [];
    var verdict = "allow";

    for (var i = 0; i < D.RULES.length; i++) {
      var rule = D.RULES[i];
      var r = rule.test(parcel, point, ctx);
      if (!r) continue;
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        verdict: r.verdict,
        reason: r.reason
      });
      if (r.adds) conditions = conditions.concat(r.adds);
      if (r.verdict === "deny") verdict = "deny";
      else if (r.verdict === "conditional" && verdict !== "deny") verdict = "conditional";
    }

    // 自律レベルによる承認要求の上乗せ
    var lowRisk = parcel.temp === "ambient" && parcel.value < 50000 && !parcel.requiresIdentity;
    if (verdict !== "deny") {
      if (state.autonomy === 0) {
        conditions.push("user_approval");
        findings.push({
          ruleId: "autonomy",
          title: "自律レベル",
          verdict: "conditional",
          reason: "L0（手動）：受取地点の変更も受渡しも人間が実行します"
        });
        verdict = "conditional";
      } else if (state.autonomy === 1) {
        conditions.push("user_approval");
        findings.push({
          ruleId: "autonomy",
          title: "自律レベル",
          verdict: "conditional",
          reason: "L1（提案のみ）：AIの提案に対してユーザー承認が必要です"
        });
        verdict = "conditional";
      } else if (state.autonomy === 2 && !lowRisk) {
        conditions.push("user_approval");
        findings.push({
          ruleId: "autonomy",
          title: "自律レベル",
          verdict: "conditional",
          reason: "L2（低リスク自動）：冷蔵冷凍・高額・本人確認が必要な荷物は承認が必要です"
        });
        verdict = "conditional";
      }
    }

    var result = {
      parcelId: parcel.id,
      pointId: point.id,
      verdict: verdict,
      findings: findings,
      conditions: dedupe(conditions),
      needsApproval: conditions.indexOf("user_approval") !== -1
    };
    state.lastEval = result;
    return result;
  }

  function dedupe(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) if (out.indexOf(arr[i]) === -1) out.push(arr[i]);
    return out;
  }

  /* ---------- receipt delegation grant ---------- */
  var CONDITION_LABELS = {
    identity_check: "本人確認（顔認証 or 身分証）",
    one_time_code: "ワンタイム暗証番号",
    photo_evidence: "写真証跡",
    video_evidence: "動画証跡",
    signature: "受領署名",
    delegate_record: "被委任者の記録",
    auto_reroute: "満杯時の自動再ルート",
    geofence_indoor: "屋内ジオフェンス（玄関〜冷蔵庫のみ）",
    time_boxed_5min: "5分間の時限アクセス",
    ephemeral_location: "一時的な位置共有（10分）",
    cold_bag_handover: "保冷バッグでの手渡し",
    user_approval: "ユーザー承認"
  };

  function buildGrant(parcel, point, evalResult) {
    var from = state.simMinutes + 1;
    var to = from + Math.max(12, Math.round((point.eta_min || 15) * 0.9));
    var scope = [];
    if (point.caps.indexOf("secure") !== -1 && point.id !== "home_door") scope.push("open:bay_" + hash8(point.id).slice(0, 2).toUpperCase());
    if (point.caps.indexOf("indoor") !== -1) scope.push("unlock:entrance", "traverse:entrance→fridge");
    if (point.dynamic) scope.push("locate:subject_while_active");
    if (!scope.length) scope.push("place:doorstep");

    return {
      grant_id: rid("rdg"),
      version: "0.3-draft",
      issued_at: clock(state.simMinutes),
      issuer: { subject: "user:me", via: "policy_engine@lastmeters", autonomy_level: "L" + state.autonomy },
      grantee: {
        type: point.dynamic ? "delivery_vehicle" : "delivery_robot",
        id: "wm-tky-" + hash8(parcel.id + point.id).slice(0, 4),
        operator: "carrier.example",
        attestation: "mTLS + device_cert(verified)"
      },
      order: {
        id: parcel.id,
        temp_class: parcel.temp,
        value_jpy: parcel.value,
        ordered_by: parcel.orderedBy === "agent" ? "ai_agent(delegated)" : "human"
      },
      place: {
        type: point.dynamic ? "rendezvous" : point.kind,
        id: point.id,
        radius_m: point.dynamic ? 30 : 8
      },
      window: { from: clock(from).slice(0, 5), to: clock(to).slice(0, 5) },
      conditions: evalResult.conditions.map(function (c) { return c; }),
      scope: scope,
      not_granted: ["unlock:entrance", "read:order_history", "locate:subject_after_handover"].filter(function (x) {
        return scope.indexOf(x) === -1;
      }),
      revocable: true,
      audit_sink: "chain_of_custody@lastmeters"
    };
  }

  /* ---------- tracking ---------- */
  function tracking(parcelId) {
    if (!state.parcels[parcelId]) {
      var parcel = D.parcelById(parcelId);
      state.parcels[parcelId] = {
        parcelId: parcelId,
        pointId: parcel.defaultPoint,
        status: "planning",
        progress: 0,
        grant: null,
        etaMin: D.pointById(parcel.defaultPoint).eta_min,
        holder: "transport",
        steps: null,
        stepIndex: 0,
        exception: null,
        pendingApproval: null
      };
    }
    return state.parcels[parcelId];
  }

  function initAll() {
    D.PARCELS.forEach(function (p) {
      var t = tracking(p.id);
      t.status = "planning";
      log("ORDER_PLACED", p.id, p.orderedBy === "agent"
        ? "AIエージェントが自動発注（" + p.agentReason + "）"
        : "ユーザーが手動で発注", { holder: "order", level: "info" });
    });
    log("SYSTEM", null, "受取オーケストレーション開始（自律レベル L" + state.autonomy + "）", { level: "info" });
    // 既定の受取先（＝いまの宅配のやり方）を試す。通らない荷物がそのまま論点になる。
    D.PARCELS.forEach(function (p) {
      assign(p.id, p.defaultPoint);
    });
    emit();
  }

  /* ---------- actions ---------- */
  function assign(parcelId, pointId, opts) {
    opts = opts || {};
    var parcel = D.parcelById(parcelId);
    var point = D.pointById(pointId);
    var t = tracking(parcelId);
    var ev = evaluate(parcel, point);

    if (ev.verdict === "deny") {
      log("POLICY_DENY", parcelId, "受取地点「" + point.name + "」を拒否：" + ev.findings.filter(function (f) {
        return f.verdict === "deny";
      })[0].reason, { level: "danger", holder: t.holder });
      emit();
      return ev;
    }

    if (ev.needsApproval && !opts.approved) {
      t.pendingApproval = { pointId: pointId, evalResult: ev };
      log("APPROVAL_REQUIRED", parcelId, "自律レベルの設定により、ユーザー承認を要求", { level: "warn", holder: t.holder });
      emit();
      return ev;
    }

    if (t.grant) {
      log("GRANT_REVOKED", parcelId, "受取地点の変更に伴い旧グラント " + t.grant.grant_id + " を失効", { level: "warn", holder: t.holder });
    }

    t.pendingApproval = null;
    t.pointId = pointId;
    t.grant = buildGrant(parcel, point, ev);
    t.etaMin = point.eta_min;
    t.progress = t.status === "planning" ? 0 : Math.min(t.progress, 0.35);
    t.status = "in_transit";
    t.holder = "transport";
    t.steps = null;
    t.stepIndex = 0;
    t.exception = null;
    t.evalResult = ev;

    log("GRANT_ISSUED", parcelId,
      "受取グラント " + t.grant.grant_id + " を発行（" + point.name + " / 有効 " +
      t.grant.window.from + "–" + t.grant.window.to + "）",
      { level: "ok", holder: "transport", evidence: t.grant.conditions.slice(0, 3) });
    emit();
    return ev;
  }

  function approve(parcelId) {
    var t = tracking(parcelId);
    if (!t.pendingApproval) return null;
    log("USER_APPROVED", parcelId, "ユーザーが受取地点の変更を承認", { level: "ok", holder: t.holder });
    return assign(parcelId, t.pendingApproval.pointId, { approved: true });
  }

  function rejectApproval(parcelId) {
    var t = tracking(parcelId);
    if (!t.pendingApproval) return;
    log("USER_REJECTED", parcelId, "ユーザーが変更を却下。現在の受取地点を維持", { level: "warn", holder: t.holder });
    t.pendingApproval = null;
    emit();
  }

  /* ---------- handover state machine ---------- */
  function buildSteps(parcel, point, grant) {
    var steps = [
      { k: "DEVICE_AUTH", m: "機体認証：mTLSと端末証明書を検証（" + grant.grantee.id + "）" },
      { k: "GRANT_CHECK", m: "グラント照合：" + grant.grant_id + " の時刻・場所・スコープを検証" }
    ];
    var c = grant.conditions;
    if (c.indexOf("ephemeral_location") !== -1) steps.push({ k: "RENDEZVOUS", m: "ランデブー確立：受取人の位置を10分間だけ開示" });
    if (c.indexOf("identity_check") !== -1) steps.push({ k: "IDENTITY", m: "本人確認：受取人の顔認証に成功", needsTap: true });
    if (c.indexOf("one_time_code") !== -1) steps.push({ k: "OTP", m: "ワンタイム暗証番号を照合", needsTap: true });
    if (c.indexOf("delegate_record") !== -1) steps.push({ k: "DELEGATE", m: "被委任者を記録（誰に渡したかを台帳へ）" });
    if (parcel.temp !== "ambient") steps.push({ k: "TEMP_EVIDENCE", m: "温度証跡：庫内 " + (parcel.temp === "frozen" ? "-19.2℃" : "3.4℃") + " を記録" });
    if (c.indexOf("geofence_indoor") !== -1) steps.push({ k: "INDOOR", m: "屋内ジオフェンス内で搬入（録画中・5分の時限）" });
    steps.push({ k: "UNLOCK", m: "スコープ内の庫室のみ解錠：" + grant.scope.join(", ") });
    if (c.indexOf("signature") !== -1) steps.push({ k: "SIGNATURE", m: "受領署名を取得", needsTap: true });
    if (c.indexOf("photo_evidence") !== -1) steps.push({ k: "PHOTO", m: "写真証跡を保存" });
    steps.push({ k: "CUSTODY_TRANSFER", m: "占有移転：配送事業者 → 受取地点／受取人" });
    steps.push({ k: "GRANT_EXPIRED", m: "グラントを即時失効（受取完了で権限は消える）" });
    return steps;
  }

  function startHandover(parcelId) {
    var t = tracking(parcelId);
    if (t.status !== "arrived") return;
    var parcel = D.parcelById(parcelId);
    var point = D.pointById(t.pointId);
    t.steps = buildSteps(parcel, point, t.grant);
    t.stepIndex = 0;
    t.status = "handing_over";
    t.holder = "handover";
    log("HANDOVER_START", parcelId, "受渡しシーケンス開始（" + t.steps.length + "ステップ）", { level: "info", holder: "handover" });
    emit();
    advanceHandover(parcelId);
  }

  function advanceHandover(parcelId) {
    var t = tracking(parcelId);
    if (t.status !== "handing_over" || !t.steps) return;
    if (t.stepIndex >= t.steps.length) {
      t.status = "received";
      t.holder = "store";
      t.grant = null;
      log("RECEIVED", parcelId, "受取完了。以降の保管責任は利用者に移転", { level: "ok", holder: "store" });
      var point = D.pointById(t.pointId);
      if (point && point.capacity) point.capacity.used = Math.min(point.capacity.total, point.capacity.used + 1);
      emit();
      return;
    }
    var step = t.steps[t.stepIndex];
    log(step.k, parcelId, step.m, { level: "info", holder: "handover" });
    t.stepIndex++;
    emit();
    if (t.stepIndex < t.steps.length) {
      setTimeout(function () { advanceHandover(parcelId); }, 620);
    } else {
      setTimeout(function () { advanceHandover(parcelId); }, 500);
    }
  }

  /* ---------- exceptions ---------- */
  function injectException(parcelId, exceptionId) {
    var t = tracking(parcelId);
    var parcel = D.parcelById(parcelId);
    var exc = null;
    for (var i = 0; i < D.EXCEPTIONS.length; i++) if (D.EXCEPTIONS[i].id === exceptionId) exc = D.EXCEPTIONS[i];
    if (!exc) return null;

    t.exception = { id: exc.id, label: exc.label, resolvedBy: null, note: null };
    log("EXCEPTION", parcelId, "例外発生：" + exc.label, { level: exc.severity === "low" ? "warn" : "danger", holder: t.holder });

    var canAuto = exc.auto && state.autonomy >= 3;
    if (exc.id === "locker_full" && canAuto) {
      var alt = pickAlternative(parcel, t.pointId);
      if (alt) {
        t.exception.resolvedBy = "auto";
        t.exception.note = "自動再ルート → " + alt.name;
        log("AUTO_REMEDIATION", parcelId, exc.autoAction, { level: "ok", holder: t.holder });
        assign(parcelId, alt.id, { approved: true });
        t.exception.label = exc.label + "（自動復旧済み）";
        emit();
        return t.exception;
      }
    }
    if (canAuto && exc.id !== "locker_full") {
      t.exception.resolvedBy = "auto";
      t.exception.note = exc.autoAction;
      log("AUTO_REMEDIATION", parcelId, exc.autoAction, { level: "ok", holder: t.holder });
      if (exc.id === "robot_attack" || exc.id === "comms_loss") {
        if (t.grant) log("GRANT_REVOKED", parcelId, "グラント " + t.grant.grant_id + " を即時失効（fail-safe）", { level: "warn", holder: t.holder });
        t.grant = null;
        t.status = "blocked";
      }
      emit();
      return t.exception;
    }

    t.exception.resolvedBy = "human";
    t.exception.note = exc.humanAction;
    t.status = "blocked";
    log("ESCALATION", parcelId, "人間へエスカレーション：" + exc.humanAction, { level: "warn", holder: t.holder });
    emit();
    return t.exception;
  }

  function pickAlternative(parcel, avoidId) {
    var best = null;
    for (var i = 0; i < D.POINTS.length; i++) {
      var pt = D.POINTS[i];
      if (pt.id === avoidId || pt.dynamic) continue;
      if (pt.capacity && pt.capacity.used >= pt.capacity.total) continue;
      var ev = evaluate(parcel, pt);
      if (ev.verdict !== "deny") {
        if (!best || pt.eta_min < best.eta_min) best = pt;
      }
    }
    return best;
  }

  function resolveException(parcelId, choice) {
    var t = tracking(parcelId);
    if (!t.exception) return;
    if (choice === "retry") {
      log("HUMAN_DECISION", parcelId, "ユーザー判断：再試行を指示", { level: "info", holder: t.holder });
      t.status = t.progress >= 1 ? "arrived" : "in_transit";
    } else if (choice === "return") {
      log("HUMAN_DECISION", parcelId, "ユーザー判断：持ち戻り／返送を指示。費用負担は設備運営者", { level: "warn", holder: t.holder });
      t.status = "returned";
      t.grant = null;
    } else if (choice === "reroute") {
      var alt = pickAlternative(D.parcelById(parcelId), t.pointId);
      if (alt) {
        log("HUMAN_DECISION", parcelId, "ユーザー判断：" + alt.name + "へ変更", { level: "info", holder: t.holder });
        t.exception = null;
        assign(parcelId, alt.id, { approved: true });
        return;
      }
    }
    t.exception = null;
    emit();
  }

  /* ---------- clock ---------- */
  function tick(dtSec) {
    if (!state.running) return;
    state.simMinutes += (dtSec * state.speed) / 60;
    var changed = false;
    Object.keys(state.parcels).forEach(function (id) {
      var t = state.parcels[id];
      if (t.status !== "in_transit") return;
      var totalSec = Math.max(6, (t.etaMin || 15) * 0.55); // 実時間での所要（見やすさ優先）
      t.progress = Math.min(1, t.progress + dtSec / totalSec);
      if (t.progress >= 1) {
        t.status = "arrived";
        t.holder = "handover";
        log("ARRIVED", id, "受取地点に到着。受渡し待ち", { level: "info", holder: "handover" });
        changed = true;
      }
    });
    if (changed) emit();
  }

  function setAutonomy(level) {
    state.autonomy = level;
    log("POLICY_CHANGE", null, "自律レベルを L" + level + " に変更（" + D.AUTONOMY[level].short + "）", {
      level: level === 4 ? "danger" : "info"
    });
    emit();
  }

  function reset() {
    state.parcels = {};
    state.log = [];
    state.simMinutes = 18 * 60 + 2;
    state.lastEval = null;
    initAll();
  }

  return {
    state: state,
    subscribe: function (fn) { listeners.push(fn); },
    clock: clock,
    now: function () { return clock(state.simMinutes); },
    tracking: tracking,
    evaluate: evaluate,
    assign: assign,
    approve: approve,
    rejectApproval: rejectApproval,
    startHandover: startHandover,
    injectException: injectException,
    resolveException: resolveException,
    setAutonomy: setAutonomy,
    tick: tick,
    init: initAll,
    reset: reset,
    conditionLabel: function (c) { return CONDITION_LABELS[c] || c; }
  };
})();
