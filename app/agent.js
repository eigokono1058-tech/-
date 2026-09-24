/* ==========================================================================
   DELIVERY OS — 配送エージェント / the delivery agent (ja + en)

   方針を預かって、荷物ごとに「誰が・いつ・どこへ・どう」を決める層。
   物流の計算は optimizer.js（決定論）に任せ、ここは判断と調整だけをやる。

   設計の芯はふたつ。

     1. 何もしないことを、正当な出力として持つ。
        いまの計画で受け取れるなら黙っている。毎回通知するのは悪いUX。

     2. 減らすのは「判断を求める回数」ではなく「取り消せない判断を求める回数」。
        取り消せる変更は黙ってやって、あとから取り消せるようにする。
        取り消せないものだけ、先に聞く。

   ========================================================================== */
window.LM_AGENT = (function () {
  var D = window.LM_DATA;
  var E = window.LM_ENGINE;
  var O = window.LM_OPT;
  var PR = window.LM_PROVIDERS;
  var POL = window.LM_POLICY;

  var MAX_REPLANS = 3;          // これを超えたら決めずに人間へ返す
  var HEALTHY_P = 0.8;          // これ未満なら「受け取れない見込み」とみなす

  var decisions = [];           // 新しい順
  var replanCount = {};         // parcelId -> 回数
  var seq = 0;

  function t(v, l) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[l] != null ? v[l] : (v.ja != null ? v.ja : v.en);
  }
  function hhmm(m) { return POL.hhmm(m); }

  /* ---------- 文脈 ---------------------------------------------------- */
  function context(parcel) {
    return {
      policy: POL.get(),
      nowMin: Math.floor(E.state.simMinutes),
      homeEtaMin: PR.USER.homeEtaMin,
      parcel: parcel
    };
  }

  /* ---------- S1 いまの計画は健全か ------------------------------------ */
  function currentOption(parcel) {
    var tr = E.tracking(parcel.id);
    var all = PR.options(parcel);
    for (var i = 0; i < all.length; i++) if (all[i].pointId === tr.pointId) return all[i];
    return null;
  }

  function healthCheck(parcel, opt, ctx) {
    if (!opt) return { ok: false, why: { ja: "受取先が決まっていない", en: "No destination set" } };
    if (E.evaluate(parcel, opt.point).verdict === "deny") {
      return { ok: false, why: { ja: "いまの受取先ではこの荷物を渡せない", en: "This parcel cannot be handed over there" } };
    }
    if (O.needsPresence(parcel, opt) && POL.inQuietHours(opt.receivableAtMin, ctx.policy)) {
      return {
        ok: false,
        why: {
          ja: hhmm(opt.receivableAtMin) + " は静かにしてほしい時間帯で、本人対応が要る",
          en: hhmm(opt.receivableAtMin) + " falls in your quiet hours and needs you at the door"
        }
      };
    }
    var p = O.successProbability(opt, ctx).p;
    if (p < HEALTHY_P) {
      return {
        ok: false,
        why: {
          ja: "いまのままだと受け取れる見込みが " + Math.round(p * 100) + "% しかない",
          en: "As planned, the chance you actually receive it is only " + Math.round(p * 100) + "%"
        }
      };
    }
    return { ok: true, p: p };
  }

  /* ---------- S2 候補生成 ----------------------------------------------
     硬い制約（温度帯・本人確認・静かな時間帯・位置情報の範囲）は候補から外す。
     柔らかい制約（料金・寄り道）は外さず、点数で下げる。
     外してしまうと「方針の外だが唯一の選択肢」を出せなくなり、
     エージェントが人間に相談する場面そのものが作れなくなる。          */
  function candidates(parcel, ctx) {
    var out = [];
    var rejected = [];
    PR.options(parcel).forEach(function (o) {
      var ev = E.evaluate(parcel, o.point);
      if (ev.verdict === "deny") {
        var first = null;
        ev.findings.forEach(function (f) { if (!first && f.verdict === "deny") first = f; });
        rejected.push({ option: o, reason: first ? first.reason : null, hard: "policy_engine" });
        return;
      }
      if (O.needsPresence(parcel, o) && POL.inQuietHours(o.receivableAtMin, ctx.policy)) {
        rejected.push({
          option: o, hard: "quiet_hours",
          reason: { ja: "静かにしてほしい時間帯にあたる", en: "Falls inside your quiet hours" }
        });
        return;
      }
      if (o.point.dynamic && ctx.policy.shareLocation === "never") {
        rejected.push({
          option: o, hard: "location_scope",
          reason: { ja: "現在地を渡さない設定のため使えない", en: "Not available while location sharing is off" }
        });
        return;
      }
      o.evalResult = ev;
      out.push(o);
    });
    return { feasible: out, rejected: rejected };
  }

  /* ---------- S5 自動でやるか / 聞くか / 本人承認か --------------------- */
  function decideApproval(parcel, chosen, ctx) {
    var P = ctx.policy;
    var tr = E.tracking(parcel.id);
    var checks = [];

    function chk(label, value, ok) { checks.push({ label: label, value: value, ok: ok }); }

    /* --- 方針では上書きできないもの --- */
    if (tr.status === "handing_over") {
      return level("explicit", "irreversible",
        { ja: "受渡しがもう始まっていて、取り消せない", en: "The handover has started and cannot be undone" }, checks);
    }
    if (parcel.requiresIdentity) {
      return level("explicit", "identity_required",
        { ja: "本人確認が要る荷物なので、本人の承認が要る", en: "This parcel needs ID, so it needs you in person" }, checks);
    }
    if (parcel.value >= P.explicitOverJpy) {
      return level("explicit", "high_value",
        { ja: "$" + parcel.value.toLocaleString() + " の荷物（本人承認は $" +
              P.explicitOverJpy.toLocaleString() + " 以上）",
          en: "$" + parcel.value.toLocaleString() + " parcel (you approve anything over $" +
              P.explicitOverJpy.toLocaleString() + ")" }, checks);
    }
    if (chosen.pointId === "friend") {
      return level("explicit", "third_party",
        { ja: "他人に受取を委ねるので、本人の承認が要る", en: "Handing receipt to someone else needs your approval" }, checks);
    }

    /* --- 方針の外に出るもの --- */
    var costOk = chosen.extraCost <= P.maxExtraCostJpy;
    chk({ ja: "追加料金", en: "Extra cost" },
        { ja: "$" + chosen.extraCost + "（上限 $" + P.maxExtraCostJpy + "）",
          en: "$" + chosen.extraCost + " (limit $" + P.maxExtraCostJpy + ")" }, costOk);

    var devMin = chosen.walkMin;
    var devOk = devMin <= P.maxRouteDeviationMin;
    chk({ ja: "帰り道からの逸脱", en: "Off your route" },
        { ja: "+" + devMin + "分（上限 " + P.maxRouteDeviationMin + "分）",
          en: "+" + devMin + " min (limit " + P.maxRouteDeviationMin + " min)" }, devOk);

    var timeOk = !POL.inQuietHours(chosen.receivableAtMin, P) ||
                 !O.needsPresence(parcel, chosen);
    chk({ ja: "受取時刻", en: "Pickup time" },
        { ja: hhmm(chosen.receivableAtMin) + "（静かな時間帯の外）",
          en: hhmm(chosen.receivableAtMin) + " (outside quiet hours)" }, timeOk);

    var locOk = !chosen.point.dynamic || P.shareLocation !== "never";
    if (chosen.point.dynamic) {
      chk({ ja: "現在地の共有", en: "Location sharing" },
          { ja: "受取直前のみ", en: "Only at pickup" }, locOk);
    }

    var payOk = chosen.extraCost === 0 || P.autoPay;
    if (chosen.extraCost > 0) {
      chk({ ja: "支払い", en: "Payment" },
          { ja: P.autoPay ? "上限内は自動" : "自動決済はオフ",
            en: P.autoPay ? "Auto within limit" : "Auto-pay is off" }, payOk);
    }

    if (!costOk) {
      return level("confirm", "cost_over_policy",
        { ja: "追加料金 $" + chosen.extraCost + " が方針の上限 $" + P.maxExtraCostJpy + " を超える",
          en: "$" + chosen.extraCost + " extra is above your $" + P.maxExtraCostJpy + " limit" }, checks);
    }
    if (!devOk) {
      return level("confirm", "detour_over_policy",
        { ja: "帰り道から +" + devMin + "分 外れる（上限 " + P.maxRouteDeviationMin + "分）",
          en: "+" + devMin + " minutes off your route (limit " + P.maxRouteDeviationMin + ")" }, checks);
    }
    if (!timeOk) {
      return level("confirm", "quiet_hours",
        { ja: "静かにしてほしい時間帯にかかる", en: "Lands inside your quiet hours" }, checks);
    }
    if (!locOk || !payOk) {
      return level("confirm", "scope_change",
        { ja: "方針の設定を超える操作が要る", en: "Needs something your policy does not cover" }, checks);
    }
    if (!P.autoChange) {
      return level("confirm", "auto_change_off",
        { ja: "自動変更をオフにしている", en: "You turned automatic changes off" }, checks);
    }

    return level("auto", "within_policy",
      { ja: "すべて方針の内側なので、変更して事後に知らせる",
        en: "Everything is inside your policy, so it changes it and tells you after" }, checks);
  }

  function level(lv, reasonKey, reason, checks) {
    return { level: lv, reason: reasonKey, text: reason, checks: checks };
  }

  /* ---------- S3/S5 まとめて1件ぶんの判断 ------------------------------- */
  function evaluateParcel(parcelId, trigger) {
    var parcel = D.parcelById(parcelId);
    var ctx = context(parcel);
    var cur = currentOption(parcel);
    var d = {
      id: "dec_" + (++seq),
      at: hhmm(ctx.nowMin),
      atMin: ctx.nowMin,
      trigger: trigger || "periodic",
      parcelId: parcelId,
      parcel: parcel,
      from: cur ? { pointId: cur.pointId, name: cur.point.name, at: hhmm(cur.receivableAtMin) } : null,
      context: {
        area: PR.USER.area,
        calendar: PR.USER.calendar,
        homeEta: hhmm(PR.USER.homeEtaMin),
        traffic: PR.WORLD.traffic,
        weather: PR.WORLD.weather
      },
      toolCalls: [],
      outcome: "pending"
    };

    /* S1 — 壊れていないなら、何もしない */
    var health = healthCheck(parcel, cur, ctx);
    if (health.ok) {
      d.action = "none";
      d.outcome = "none";
      d.successP = health.p;
      d.reason = {
        ja: "いまの計画で受け取れる見込みです（" + Math.round(health.p * 100) + "%）。変更しません。",
        en: "The current plan should work (" + Math.round(health.p * 100) + "%). Leaving it alone."
      };
      decisions.unshift(d);
      return d;
    }
    d.problem = health.why;

    /* S7 — 決め直しすぎたら、決めずに人間へ返す */
    replanCount[parcelId] = (replanCount[parcelId] || 0) + 1;
    if (replanCount[parcelId] > MAX_REPLANS) {
      d.action = "escalate";
      d.outcome = "escalated";
      d.approval = level("confirm", "too_many_replans",
        { ja: "短い間に何度も組み替えています。これ以上は自分で決めません。",
          en: "It has re-planned several times in a row. It will not keep deciding on its own." }, []);
      d.reason = d.approval.text;
      decisions.unshift(d);
      return d;
    }

    /* S2 — 候補を出す */
    var c = candidates(parcel, ctx);
    d.rejected = c.rejected;
    if (!c.feasible.length) {
      d.action = "blocked";
      d.outcome = "blocked";
      d.reason = {
        ja: "方針の内側にも外側にも、受け取れる方法が残っていません。",
        en: "There is no way to receive this — inside your policy or outside it."
      };
      decisions.unshift(d);
      return d;
    }

    /* S3 — 点をつけて並べる（決定論。ここはふつうの計算） */
    var ranked = O.rank(c.feasible, ctx);
    d.candidates = ranked.map(function (r) {
      return {
        optionId: r.option.id,
        pointId: r.option.pointId,
        name: r.option.label,
        provider: r.option.providerName,
        at: hhmm(r.option.receivableAtMin),
        atMin: r.option.receivableAtMin,
        extraCost: r.option.extraCost,
        walkMin: r.option.walkMin,
        detourKm: r.option.detourKm,
        successP: r.detail.successP,
        success: r.detail.success,
        co2Kg: r.detail.co2Kg,
        score: r.score,
        parts: r.detail.parts
      };
    });

    /* 道の上と、建物や駅。種類のちがう案を2つ並べて出す。
       1つだけ出すと「なぜそこなのか」が比べられないため。 */
    function kindOf(o) { return o.point.dynamic ? "street" : "place"; }
    function pack(r) {
      var o = r.option;
      return {
        optionId: o.id, pointId: o.pointId, kind: kindOf(o),
        name: o.label, provider: o.providerName,
        at: hhmm(o.receivableAtMin), atMin: o.receivableAtMin,
        extraCost: o.extraCost, walkMin: o.walkMin,
        successP: r.detail.successP
      };
    }
    var second = null;
    for (var ri = 1; ri < ranked.length; ri++) {
      if (kindOf(ranked[ri].option) !== kindOf(ranked[0].option)) { second = ranked[ri]; break; }
    }
    if (!second && ranked.length > 1) second = ranked[1];
    d.alt = second ? pack(second) : null;
    d.altOption = second ? second.option : null;

    var chosen = ranked[0].option;
    d.to = {
      optionId: chosen.id,
      pointId: chosen.pointId,
      kind: kindOf(chosen),
      name: chosen.label,
      provider: chosen.providerName,
      at: hhmm(chosen.receivableAtMin),
      atMin: chosen.receivableAtMin,
      extraCost: chosen.extraCost,
      walkMin: chosen.walkMin,
      successP: ranked[0].detail.successP
    };
    d.chosen = chosen;

    /* S5 — 黙ってやるか、聞くか、本人に出すか */
    d.approval = decideApproval(parcel, chosen, ctx);
    d.action = d.approval.level;
    d.reason = buildReason(d, ctx);
    decisions.unshift(d);
    if (decisions.length > 40) decisions.pop();
    return d;
  }

  /** なぜそうしたかを一段の文章にする。数字ではなく理由を先に置く。 */
  function buildReason(d, ctx) {
    var saved = d.from ? (d.from ? minutesBetween(d) : 0) : 0;
    var ja = t(d.problem, "ja") + "。" +
      t(d.to.name, "ja") + "なら" + d.to.at + "に受け取れます。";
    var en = t(d.problem, "en") + ". " +
      t(d.to.name, "en") + " works at " + d.to.at + ".";
    if (d.to.extraCost === 0) {
      ja += "追加料金はかかりません。";
      en += " It costs nothing extra.";
    } else {
      ja += "追加料金は $" + d.to.extraCost + " です。";
      en += " It costs $" + d.to.extraCost + " extra.";
    }
    if (d.to.walkMin > 0) {
      ja += "徒歩 +" + d.to.walkMin + "分。";
      en += " " + d.to.walkMin + " more minutes on foot.";
    }
    if (saved > 0) {
      ja += "いまの計画より " + fmtDur(saved, "ja") + "早く受け取れます。";
      en += " That is " + fmtDur(saved, "en") + " sooner than the current plan.";
    }
    return { ja: ja, en: en };
  }

  function minutesBetween(d) {
    var fromMin = null;
    PR.options(d.parcel).forEach(function (o) {
      if (o.pointId === d.from.pointId) fromMin = o.receivableAtMin;
    });
    if (fromMin == null) return 0;
    return Math.max(0, fromMin - d.to.atMin);
  }

  function fmtDur(min, l) {
    var h = Math.floor(min / 60), m = min % 60;
    if (l === "ja") return (h ? h + "時間" : "") + (m ? m + "分" : "");
    return (h ? h + "h " : "") + (m ? m + "m" : "");
  }

  /* ---------- S6 実行 ---------------------------------------------------
     順序に意味がある。先にロッカーの席を取り、取れてから配送先を変える。
     途中で失敗したら、そこまでに進んだぶんを逆順で戻す（補償）。
     現実世界のエージェントがいちばん難しいのはここ。            */
  function execute(d) {
    if (!d || !d.chosen) return d;
    var parcel = d.parcel;
    var chosen = d.chosen;
    var done = [];
    d.toolCalls = [];

    function step(name, args) {
      var res = PR.call(name, args);
      d.toolCalls.push({ tool: name, args: args, result: res });
      return res;
    }

    try {
      /* 1. 席を取る（箱のある地点だけ） */
      var reservation = null;
      if (chosen.point.capacity || chosen.point.caps.indexOf("secure") !== -1) {
        reservation = step("locker.reserve", {
          point_id: chosen.pointId, parcel_id: parcel.id, until: d.to.at
        });
        done.push({ undo: "locker.release", args: { reservation_id: reservation.reservation_id } });
      }

      /* 2. 席が取れてから配送先を変える */
      step("carrier.reroute", { parcel_id: parcel.id, point_id: chosen.pointId });

      /* 3. 追加料金があるときだけ与信 */
      if (chosen.extraCost > 0) {
        var auth = step("payment.authorize", { parcel_id: parcel.id, amount_jpy: chosen.extraCost });
        done.push({ undo: "payment.void", args: { authorization_id: auth.authorization_id } });
      }

      /* 4. 受取グラントを発行する（既存のポリシーエンジンに任せる） */
      E.assign(parcel.id, chosen.pointId, { approved: true });
      d.grantId = E.tracking(parcel.id).grant ? E.tracking(parcel.id).grant.grant_id : null;
      d.toolCalls.push({
        tool: "deliveryos.commit",
        args: { parcel_id: parcel.id, option_id: chosen.id, undo_window_s: POL.get().undoWindowSec },
        result: { grant_id: d.grantId, undo_until: hhmm(d.atMin + Math.round(POL.get().undoWindowSec / 60)) }
      });

      /* 5. 最後に伝える */
      step("notify.user", { parcel_id: parcel.id, level: d.action === "auto" ? "after_the_fact" : "confirmed" });

      d.outcome = "executed";
      d.undoUntilMin = d.atMin + POL.get().undoWindowSec / 60;
      d.undoable = true;
    } catch (err) {
      /* 補償：進んだぶんを逆順で戻す。
         ロッカーは押さえたがキャリアの変更に失敗した、という状態を残さない。 */
      d.error = String(err && err.message ? err.message : err);
      d.compensated = [];
      done.reverse().forEach(function (u) {
        try {
          var r = PR.call(u.undo, u.args);
          d.toolCalls.push({ tool: u.undo, args: u.args, result: r, compensation: true });
          d.compensated.push(u.undo);
        } catch (e2) { /* 戻せなかったものはログに残るだけ */ }
      });
      d.outcome = "failed";
      d.reason = {
        ja: "変更に失敗したので、途中まで進んだ手続きを戻しました（" + d.error + "）。",
        en: "The change failed, so everything already done was rolled back (" + d.error + ")."
      };
    }
    return d;
  }

  /* ---------- 取り消し --------------------------------------------------
     取り消せるあいだは聞かない。取り消せなくなったら確定を伝える。 */
  function canUndo(d) {
    if (!d || !d.undoable || d.outcome !== "executed" || !d.from) return false;
    return Math.floor(E.state.simMinutes) < d.undoUntilMin;
  }

  function undoSecondsLeft(d) {
    if (!d || !d.undoUntilMin) return 0;
    return Math.max(0, Math.round((d.undoUntilMin - E.state.simMinutes) * 60));
  }

  function undo(decisionId) {
    var d = byId(decisionId);
    if (!canUndo(d)) return null;
    E.restore(d.parcelId, d.from.pointId);
    d.toolCalls.push({
      tool: "deliveryos.undo",
      args: { grant_id: d.grantId },
      result: { restored: d.from.pointId }
    });
    d.outcome = "undone";
    d.undoable = false;
    return d;
  }

  function confirm(decisionId) {
    var d = byId(decisionId);
    if (!d || (d.action !== "confirm" && d.action !== "explicit")) return null;
    execute(d);
    if (d.outcome === "executed") d.outcome = "confirmed";
    return d;
  }

  /** 出した2案のどちらかを選んで確定する。押されるまで何も実行しない。 */
  function choose(decisionId, optionId) {
    var d = byId(decisionId);
    if (!d || d.outcome !== "pending") return null;
    if (d.altOption && optionId === d.altOption.id) {
      var was = d.to, wasOpt = d.chosen;
      d.chosen = d.altOption;
      d.to = d.alt;
      d.alt = was;
      d.altOption = wasOpt;
    }
    execute(d);
    if (d.outcome === "executed") d.outcome = "confirmed";
    return d;
  }

  function reject(decisionId) {
    var d = byId(decisionId);
    if (!d) return null;
    d.outcome = "rejected";
    d.toolCalls.push({
      tool: "deliveryos.keep_current",
      args: { parcel_id: d.parcelId },
      result: { kept: d.from ? d.from.pointId : null }
    });
    return d;
  }

  function byId(id) {
    for (var i = 0; i < decisions.length; i++) if (decisions[i].id === id) return decisions[i];
    return null;
  }

  /* ---------- まとめて走らせる ------------------------------------------ */
  function runAll(trigger, opts) {
    opts = opts || {};
    /* 文脈は1回だけ読む。荷物ごとにカレンダーを読み直さない。 */
    PR.call("calendar.busy_windows", { date: "today" });
    PR.call("location.coarse_area", {});
    PR.call("traffic.snapshot", {});

    var out = [];
    D.PARCELS.forEach(function (p) {
      var tr = E.tracking(p.id);
      if (tr.status === "received" || tr.status === "returned") return;
      var d = evaluateParcel(p.id, trigger);
      if (d.action === "auto" && !opts.proposeOnly) execute(d);
      out.push(d);
    });
    return out;
  }

  function pending() {
    return decisions.filter(function (d) {
      return (d.action === "confirm" || d.action === "explicit") && d.outcome === "pending";
    });
  }

  function reset() {
    decisions.length = 0;
    replanCount = {};
    seq = 0;
  }

  /* ---------- 配送OSが外に見せるツール --------------------------------
     エージェント（ChatGPT側でも、この画面でも）はこの面だけを呼ぶ。
     MCPサーバーとして出すなら、ここがそのまま公開面になる。          */
  PR.register("deliveryos.get_policy", function () { return POL.get(); });
  PR.register("deliveryos.set_policy", function (a) { return POL.set(a.patch || {}); });
  PR.register("deliveryos.list_options", function (a) {
    var parcel = D.parcelById(a.parcel_id);
    var ctx = context(parcel);
    return candidates(parcel, ctx).feasible.map(function (o) {
      return {
        option_id: o.id, point: o.pointId, at: hhmm(o.receivableAtMin),
        extra_cost_jpy: o.extraCost, walk_min: o.walkMin,
        caps: o.point.caps
      };
    });
  });
  PR.register("deliveryos.check_permission", function (a) {
    var parcel = D.parcelById(a.parcel_id);
    var ctx = context(parcel);
    var opt = null;
    candidates(parcel, ctx).feasible.forEach(function (o) { if (o.id === a.option_id) opt = o; });
    if (!opt) return { level: "blocked", reason: "option not available" };
    var ap = decideApproval(parcel, opt, ctx);
    return { level: ap.level, reason: ap.reason };
  });
  PR.register("deliveryos.status", function (a) {
    var tr = E.tracking(a.parcel_id);
    return { parcel_id: a.parcel_id, destination: tr.pointId, status: tr.status };
  });

  return {
    evaluateParcel: evaluateParcel,
    execute: execute,
    runAll: runAll,
    confirm: confirm,
    choose: choose,
    reject: reject,
    undo: undo,
    canUndo: canUndo,
    undoSecondsLeft: undoSecondsLeft,
    decisions: function () { return decisions; },
    pending: pending,
    byId: byId,
    reset: reset,
    candidates: candidates,
    decideApproval: decideApproval,
    context: context
  };
})();
