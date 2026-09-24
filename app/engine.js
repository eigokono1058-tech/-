/* ==========================================================================
   DELIVERY OS — ポリシーエンジン / 受取グラント / 受渡し状態機械
   Policy engine, receipt grants and the handover state machine.
   UIから独立。状態が変わるたびに subscribe() したコールバックを呼ぶ。
   ログは {ja, en} の両方を持つので、あとから言語を切り替えても読める。
   ========================================================================== */
window.LM_ENGINE = (function () {
  var D = window.LM_DATA;

  var listeners = [];
  var state = {
    autonomy: 3,
    simMinutes: 18 * 60 + 2, // 18:02 start
    speed: 30, // 実時間1秒 = シミュレーション30秒
    parcels: {},
    log: [],
    lastEval: null,
    running: true
  };

  /* ---------- utils ---------- */
  /** 言語を明示して {ja,en} から取り出す（ログの両言語を組み立てるため） */
  function tl(v, l) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[l] != null ? v[l] : (v.ja != null ? v.ja : v.en);
  }
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
    return ("0" + h).slice(-2) + ":" + ("0" + mm).slice(-2) + ":" + ("0" + ss).slice(-2);
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
      message: message, // {ja, en}
      holder: extra && extra.holder,
      level: (extra && extra.level) || "info"
    };
    entry.sig = hash8(entry.at + kind + parcelId + tl(message, "ja")).slice(0, 6);
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
    var autonomyNote = null;
    if (verdict !== "deny") {
      if (state.autonomy === 0) {
        autonomyNote = {
          ja: "L0（手動）：受取地点の変更も受渡しも人間が実行します",
          en: "L0 (manual): a human performs both the change of destination and the handover"
        };
      } else if (state.autonomy === 1) {
        autonomyNote = {
          ja: "L1（提案のみ）：AIの提案に対してユーザー承認が必要です",
          en: "L1 (suggest only): the AI's proposal needs your approval"
        };
      } else if (state.autonomy === 2 && !lowRisk) {
        autonomyNote = {
          ja: "L2（低リスク自動）：冷蔵冷凍・高額・本人確認が必要な荷物は承認が必要です",
          en: "L2 (low risk automated): chilled, frozen, high value or ID-required parcels still need approval"
        };
      }
      if (autonomyNote) {
        conditions.push("user_approval");
        findings.push({
          ruleId: "autonomy",
          title: { ja: "自律レベル", en: "Autonomy level" },
          verdict: "conditional",
          reason: autonomyNote
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
    identity_check: { ja: "本人確認（顔認証 or 身分証）", en: "Identity check (face or ID)" },
    one_time_code: { ja: "ワンタイム暗証番号", en: "One-time code" },
    photo_evidence: { ja: "写真証跡", en: "Photo evidence" },
    video_evidence: { ja: "動画証跡", en: "Video evidence" },
    signature: { ja: "受領署名", en: "Signature on receipt" },
    delegate_record: { ja: "被委任者の記録", en: "Record of the delegate" },
    auto_reroute: { ja: "満杯時の自動再ルート", en: "Auto reroute when full" },
    geofence_indoor: { ja: "屋内ジオフェンス（玄関〜冷蔵庫のみ）", en: "Indoor geofence (door to fridge only)" },
    time_boxed_5min: { ja: "5分間の時限アクセス", en: "Five-minute time box" },
    ephemeral_location: { ja: "一時的な位置共有（10分）", en: "Ephemeral location (10 min)" },
    cold_bag_handover: { ja: "保冷バッグでの手渡し", en: "Cool-bag handover" },
    user_approval: { ja: "ユーザー承認", en: "User approval" }
  };

  function buildGrant(parcel, point, evalResult) {
    var from = state.simMinutes + 1;
    var to = from + Math.max(12, Math.round((point.eta_min || 15) * 0.9));
    var scope = [];
    if (point.caps.indexOf("secure") !== -1 && point.id !== "home_door") {
      scope.push("open:bay_" + hash8(point.id).slice(0, 2).toUpperCase());
    }
    if (point.caps.indexOf("indoor") !== -1) scope.push("unlock:entrance", "traverse:entrance→fridge");
    if (point.dynamic) {
      /* 追従ピンだけが現在地の継続共有を必要とする。
         路上に差した固定ピンは、その座標で落ち合うだけで足りる。 */
      scope.push(D.PIN.mode === "follow"
        ? "locate:subject_while_active"
        : "meet:pin(" + Math.round(D.PIN.x) + "," + Math.round(D.PIN.y) + ")");
    }
    if (!scope.length) scope.push("place:doorstep");

    return {
      grant_id: rid("rdg"),
      version: "0.3-draft",
      issued_at: clock(state.simMinutes),
      issuer: { subject: "user:me", via: "policy_engine@deliveryos", autonomy_level: "L" + state.autonomy },
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
      place: point.dynamic
        ? {
          type: D.PIN.mode === "follow" ? "rendezvous:following" : "rendezvous:pin",
          id: point.id,
          pin: { label: tl(D.PIN.label, "en"), snapped_to: D.PIN.kind },
          radius_m: 30
        }
        : { type: point.id, id: point.id, radius_m: 8 },
      window: { from: clock(from).slice(0, 5), to: clock(to).slice(0, 5) },
      conditions: evalResult.conditions.slice(),
      scope: scope,
      not_granted: [
        "unlock:entrance",
        "read:order_history",
        "locate:subject_while_active",
        "locate:subject_after_handover"
      ].filter(function (x) { return scope.indexOf(x) === -1; }),
      revocable: true,
      audit_sink: "chain_of_custody@deliveryos"
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
        ? {
          ja: "AIエージェントが自動発注（" + tl(p.agentReason, "ja") + "）",
          en: "AI agent ordered automatically (" + tl(p.agentReason, "en") + ")"
        }
        : { ja: "ユーザーが手動で発注", en: "Ordered manually by the user" },
        { holder: "order", level: "info" });
    });
    log("SYSTEM", null, {
      ja: "受取オーケストレーション開始（自律レベル L" + state.autonomy + "）",
      en: "Receiving orchestration started (autonomy L" + state.autonomy + ")"
    }, { level: "info" });

    // 既定の受取先（＝いまの宅配のやり方）を試す。通らない荷物がそのまま論点になる。
    D.PARCELS.forEach(function (p) { assign(p.id, p.defaultPoint); });
    /* 18:02 の時点で、配送車はもう午後の配達の途中。拠点に停まってはいない。
       街の中を走っているところから始めると、寄り道までの距離も現実的になる。 */
    D.PARCELS.forEach(function (p) { tracking(p.id).progress = 0.52; });
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
      var denial = null;
      ev.findings.forEach(function (f) { if (!denial && f.verdict === "deny") denial = f; });
      log("POLICY_DENY", parcelId, {
        ja: "受取地点「" + tl(point.name, "ja") + "」を拒否：" + tl(denial.reason, "ja"),
        en: "Denied “" + tl(point.name, "en") + "”: " + tl(denial.reason, "en")
      }, { level: "danger", holder: t.holder });
      emit();
      return ev;
    }

    if (ev.needsApproval && !opts.approved) {
      t.pendingApproval = { pointId: pointId, evalResult: ev };
      log("APPROVAL_REQUIRED", parcelId, {
        ja: "自律レベルの設定により、ユーザー承認を要求",
        en: "Autonomy setting requires the user to approve this"
      }, { level: "warn", holder: t.holder });
      emit();
      return ev;
    }

    if (t.grant) {
      log("GRANT_REVOKED", parcelId, {
        ja: "受取地点の変更に伴い旧グラント " + t.grant.grant_id + " を失効",
        en: "Revoked previous grant " + t.grant.grant_id + " because the destination changed"
      }, { level: "warn", holder: t.holder });
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

    log("GRANT_ISSUED", parcelId, {
      ja: "受取グラント " + t.grant.grant_id + " を発行（" + tl(point.name, "ja") +
        " / 有効 " + t.grant.window.from + "–" + t.grant.window.to + "）",
      en: "Issued receipt grant " + t.grant.grant_id + " for " + tl(point.name, "en") +
        " (valid " + t.grant.window.from + "–" + t.grant.window.to + ")"
    }, { level: "ok", holder: "transport" });
    emit();
    return ev;
  }

  /** 直前の受取先に戻す。これは新しい判断ではなく巻き戻しなので、
      ポリシーの可否判定は通さない（元々その状態だったものに戻すだけ）。
      エージェントの「元に戻す」からのみ呼ばれる。 */
  function restore(parcelId, pointId) {
    var t = tracking(parcelId);
    var point = D.pointById(pointId);
    if (!point) return null;
    if (t.grant) {
      log("GRANT_REVOKED", parcelId, {
        ja: "取り消しにより グラント " + t.grant.grant_id + " を失効",
        en: "Revoked grant " + t.grant.grant_id + " because the change was undone"
      }, { level: "warn", holder: t.holder });
    }
    t.pointId = pointId;
    t.grant = null;
    t.etaMin = point.eta_min;
    t.status = "planning";
    t.steps = null;
    t.stepIndex = 0;
    t.exception = null;
    t.pendingApproval = null;
    log("UNDO", parcelId, {
      ja: "受取先を「" + tl(point.name, "ja") + "」に戻しました",
      en: "Destination restored to “" + tl(point.name, "en") + "”"
    }, { level: "warn", holder: t.holder });
    emit();
    return t;
  }

  function approve(parcelId) {
    var t = tracking(parcelId);
    if (!t.pendingApproval) return null;
    log("USER_APPROVED", parcelId, {
      ja: "ユーザーが受取地点の変更を承認",
      en: "User approved the change of destination"
    }, { level: "ok", holder: t.holder });
    return assign(parcelId, t.pendingApproval.pointId, { approved: true });
  }

  function rejectApproval(parcelId) {
    var t = tracking(parcelId);
    if (!t.pendingApproval) return;
    log("USER_REJECTED", parcelId, {
      ja: "ユーザーが変更を却下。現在の受取地点を維持",
      en: "User rejected the change; keeping the current destination"
    }, { level: "warn", holder: t.holder });
    t.pendingApproval = null;
    emit();
  }

  /* ---------- handover state machine ---------- */
  function buildSteps(parcel, point, grant) {
    var steps = [
      {
        k: "DEVICE_AUTH",
        m: {
          ja: "機体認証：mTLSと端末証明書を検証（" + grant.grantee.id + "）",
          en: "Device auth: verified mTLS and device certificate (" + grant.grantee.id + ")"
        }
      },
      {
        k: "GRANT_CHECK",
        m: {
          ja: "グラント照合：" + grant.grant_id + " の時刻・場所・スコープを検証",
          en: "Grant check: validated time, place and scope of " + grant.grant_id
        }
      }
    ];
    var c = grant.conditions;
    if (c.indexOf("ephemeral_location") !== -1) {
      steps.push({
        k: "RENDEZVOUS",
        m: {
          ja: "追従ピンで合流：受取人の現在地を10分間だけ開示",
          en: "Met at the following pin: recipient's live location exposed for ten minutes only"
        }
      });
    } else if (point.dynamic) {
      steps.push({
        k: "RENDEZVOUS",
        m: {
          ja: "ピン地点で合流：開示したのはピンの座標のみ（現在地は渡していない）",
          en: "Met at the pin: only the pin's coordinates were shared, never the live location"
        }
      });
    }
    if (c.indexOf("identity_check") !== -1) {
      steps.push({
        k: "IDENTITY",
        m: { ja: "本人確認：受取人の顔認証に成功", en: "Identity: face match succeeded" }
      });
    }
    if (c.indexOf("one_time_code") !== -1) {
      steps.push({ k: "OTP", m: { ja: "ワンタイム暗証番号を照合", en: "One-time code verified" } });
    }
    if (c.indexOf("delegate_record") !== -1) {
      steps.push({
        k: "DELEGATE",
        m: { ja: "被委任者を記録（誰に渡したかを台帳へ）", en: "Recorded the delegate in the ledger" }
      });
    }
    if (parcel.temp !== "ambient") {
      var temp = parcel.temp === "frozen" ? "-19.2" : "3.4";
      steps.push({
        k: "TEMP_EVIDENCE",
        m: {
          ja: "温度証跡：庫内 " + temp + "℃ を記録",
          en: "Temperature evidence: logged " + temp + "°C inside"
        }
      });
    }
    if (c.indexOf("geofence_indoor") !== -1) {
      steps.push({
        k: "INDOOR",
        m: {
          ja: "屋内ジオフェンス内で搬入（録画中・5分の時限）",
          en: "Carried in within the indoor geofence (recording, five-minute box)"
        }
      });
    }
    steps.push({
      k: "UNLOCK",
      m: {
        ja: "スコープ内の庫室のみ解錠：" + grant.scope.join(", "),
        en: "Unlocked only what the scope allows: " + grant.scope.join(", ")
      }
    });
    if (c.indexOf("signature") !== -1) {
      steps.push({ k: "SIGNATURE", m: { ja: "受領署名を取得", en: "Captured the signature" } });
    }
    if (c.indexOf("photo_evidence") !== -1) {
      steps.push({ k: "PHOTO", m: { ja: "写真証跡を保存", en: "Stored photo evidence" } });
    }
    steps.push({
      k: "CUSTODY_TRANSFER",
      m: {
        ja: "占有移転：配送事業者 → 受取地点／受取人",
        en: "Custody transferred: carrier → pickup point / recipient"
      }
    });
    steps.push({
      k: "GRANT_EXPIRED",
      m: {
        ja: "グラントを即時失効（受取完了で権限は消える）",
        en: "Grant revoked immediately — the permission dies with the handover"
      }
    });
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
    log("HANDOVER_START", parcelId, {
      ja: "受渡しシーケンス開始（" + t.steps.length + "ステップ）",
      en: "Handover sequence started (" + t.steps.length + " steps)"
    }, { level: "info", holder: "handover" });
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
      log("RECEIVED", parcelId, {
        ja: "受取完了。以降の保管責任は利用者に移転",
        en: "Received. Storage liability now sits with the user"
      }, { level: "ok", holder: "store" });
      var point = D.pointById(t.pointId);
      if (point && point.capacity) {
        point.capacity.used = Math.min(point.capacity.total, point.capacity.used + 1);
      }
      emit();
      return;
    }
    var step = t.steps[t.stepIndex];
    log(step.k, parcelId, step.m, { level: "info", holder: "handover" });
    t.stepIndex++;
    emit();
    setTimeout(function () { advanceHandover(parcelId); }, t.stepIndex < t.steps.length ? 620 : 500);
  }

  /* ---------- exceptions ---------- */
  function injectException(parcelId, exceptionId) {
    var t = tracking(parcelId);
    var parcel = D.parcelById(parcelId);
    var exc = null;
    for (var i = 0; i < D.EXCEPTIONS.length; i++) if (D.EXCEPTIONS[i].id === exceptionId) exc = D.EXCEPTIONS[i];
    if (!exc) return null;

    t.exception = { id: exc.id, label: exc.label, resolvedBy: null, note: null };
    log("EXCEPTION", parcelId, {
      ja: "例外発生：" + tl(exc.label, "ja"),
      en: "Exception: " + tl(exc.label, "en")
    }, { level: exc.severity === "low" ? "warn" : "danger", holder: t.holder });

    var canAuto = exc.auto && state.autonomy >= 3;
    if (exc.id === "locker_full" && canAuto) {
      var alt = pickAlternative(parcel, t.pointId);
      if (alt) {
        /* assign() は受取先の変更にあたって例外をクリアするので、
           自動復旧の表示はいったん手元に持っておき、あとで入れ直す。 */
        var recovered = t.exception;
        recovered.resolvedBy = "auto";
        recovered.note = {
          ja: "自動再ルート → " + tl(alt.name, "ja"),
          en: "Auto rerouted → " + tl(alt.name, "en")
        };
        recovered.label = {
          ja: tl(exc.label, "ja") + "（自動復旧済み）",
          en: tl(exc.label, "en") + " (auto-recovered)"
        };
        log("AUTO_REMEDIATION", parcelId, exc.autoAction, { level: "ok", holder: t.holder });
        assign(parcelId, alt.id, { approved: true });
        t.exception = recovered;
        emit();
        return recovered;
      }
    }
    if (canAuto && exc.id !== "locker_full") {
      t.exception.resolvedBy = "auto";
      t.exception.note = exc.autoAction;
      log("AUTO_REMEDIATION", parcelId, exc.autoAction, { level: "ok", holder: t.holder });
      if (exc.id === "robot_attack" || exc.id === "comms_loss") {
        if (t.grant) {
          log("GRANT_REVOKED", parcelId, {
            ja: "グラント " + t.grant.grant_id + " を即時失効（fail-safe）",
            en: "Grant " + t.grant.grant_id + " revoked immediately (fail-safe)"
          }, { level: "warn", holder: t.holder });
        }
        t.grant = null;
        t.status = "blocked";
      }
      emit();
      return t.exception;
    }

    t.exception.resolvedBy = "human";
    t.exception.note = exc.humanAction;
    t.status = "blocked";
    log("ESCALATION", parcelId, {
      ja: "人間へエスカレーション：" + tl(exc.humanAction, "ja"),
      en: "Escalated to a human: " + tl(exc.humanAction, "en")
    }, { level: "warn", holder: t.holder });
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
      log("HUMAN_DECISION", parcelId, {
        ja: "ユーザー判断：再試行を指示",
        en: "Human decision: retry"
      }, { level: "info", holder: t.holder });
      t.status = t.progress >= 1 ? "arrived" : "in_transit";
    } else if (choice === "return") {
      log("HUMAN_DECISION", parcelId, {
        ja: "ユーザー判断：持ち戻り／返送を指示。費用負担は設備運営者",
        en: "Human decision: return it. The site operator bears the cost"
      }, { level: "warn", holder: t.holder });
      t.status = "returned";
      t.grant = null;
    } else if (choice === "reroute") {
      var alt = pickAlternative(D.parcelById(parcelId), t.pointId);
      if (alt) {
        log("HUMAN_DECISION", parcelId, {
          ja: "ユーザー判断：" + tl(alt.name, "ja") + "へ変更",
          en: "Human decision: switch to " + tl(alt.name, "en")
        }, { level: "info", holder: t.holder });
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
      /* planning は「まだ受取先の承認が要る」状態だが、荷物自体はもう
         既定の宛先へ向かって走っている。だから車は動かす（ただし着かせない）。 */
      if (t.status === "planning") {
        var ps = Math.max(6, (t.etaMin || 15) * 0.55);
        t.progress = Math.min(0.92, t.progress + dtSec / ps);
        return;
      }
      if (t.status !== "in_transit") return;
      if (t.meetAtMin != null) {
        /* 落ち合う時刻が決まっているときは、そこにちょうど着くように走る。
           残りの道のりを、残りの時間で割り切る。早く着きそうなら遅く走る。 */
        var remain = t.meetAtMin - state.simMinutes;
        var elapsed = dtSec * state.speed / 60;
        if (remain <= elapsed) t.progress = 1;
        else t.progress = Math.min(1, t.progress + (1 - t.progress) * (elapsed / remain));
      } else {
        var totalSec = Math.max(6, (t.etaMin || 15) * 0.55); // 実時間での所要（見やすさ優先）
        t.progress = Math.min(1, t.progress + dtSec / totalSec);
      }
      if (t.progress >= 1) {
        t.status = "arrived";
        t.holder = "handover";
        log("ARRIVED", id, {
          ja: "受取地点に到着。受渡し待ち",
          en: "Arrived at the pickup point, waiting for handover"
        }, { level: "info", holder: "handover" });
        changed = true;
      }
    });
    if (changed) emit();
  }

  /** 落ち合う時刻を決める／更新する。配送車はこの時刻に着くように走る。 */
  function setMeetAt(parcelId, min, quiet) {
    var t = tracking(parcelId);
    var before = t.meetAtMin;
    t.meetAtMin = min;
    if (!quiet && before != null && Math.abs(before - min) >= 1) {
      log("RETIME", parcelId, {
        ja: "落ち合う時刻を " + clock(before).slice(0, 5) + " → " + clock(min).slice(0, 5) +
          " に合わせ直した（受取人の到着に追従）",
        en: "Rendezvous moved " + clock(before).slice(0, 5) + " → " + clock(min).slice(0, 5) +
          " to match the recipient's arrival"
      }, { level: "info" });
      emit();
    }
    return t.meetAtMin;
  }
  function clearMeetAt(parcelId) { tracking(parcelId).meetAtMin = null; }
  /** 途中から道を引き直したので、進み具合を最初に戻す */
  function resetProgress(parcelId) { tracking(parcelId).progress = 0; }

  function setAutonomy(level) {
    state.autonomy = level;
    log("POLICY_CHANGE", null, {
      ja: "自律レベルを L" + level + " に変更（" + tl(D.AUTONOMY[level].short, "ja") + "）",
      en: "Autonomy level set to L" + level + " (" + tl(D.AUTONOMY[level].short, "en") + ")"
    }, { level: level === 4 ? "danger" : "info" });
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
    restore: restore,
    approve: approve,
    rejectApproval: rejectApproval,
    startHandover: startHandover,
    injectException: injectException,
    resolveException: resolveException,
    setAutonomy: setAutonomy,
    setMeetAt: setMeetAt,
    clearMeetAt: clearMeetAt,
    resetProgress: resetProgress,
    tick: tick,
    init: initAll,
    reset: reset,
    conditionLabel: function (c) { return CONDITION_LABELS[c] || c; }
  };
})();
