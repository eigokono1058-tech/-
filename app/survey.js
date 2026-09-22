/* ==========================================================================
   LAST METERS — 需要検証フォーム / demand validation survey (ja + en)
   保存先はブラウザのlocalStorage。集計・CSV/JSON書き出しに対応。
   window.LM_SURVEY_ENDPOINT を設定すると、そのURLへPOSTも試行する。
   ========================================================================== */
window.LM_SURVEY = (function () {
  var KEY = "lm-survey-responses-v1";
  var I18N = window.LM_I18N;
  function t(v) { return I18N ? I18N.t(v) : (v && (v.ja || v)) || ""; }

  var ROLES = [
    { v: "consumer", l: { ja: "受け取る人（生活者）", en: "Someone who receives parcels" } },
    { v: "carrier", l: { ja: "配送・物流に関わる人", en: "I work in delivery / logistics" } },
    { v: "ec", l: { ja: "EC・小売に関わる人", en: "I work in e-commerce / retail" } },
    { v: "realestate", l: { ja: "不動産・マンション管理に関わる人", en: "I work in real estate / building management" } },
    { v: "builder", l: { ja: "つくる人（エンジニア／企画）", en: "I build things (engineer / PM)" } },
    { v: "other", l: { ja: "その他", en: "Something else" } }
  ];
  var SCENES = [
    { v: "frozen", l: { ja: "冷凍・生鮮を確実に受け取りたい", en: "Getting frozen / fresh food reliably" } },
    { v: "absent", l: { ja: "日中いないので受け取れない", en: "I am never home during the day" } },
    { v: "redeliver", l: { ja: "再配達の調整が面倒", en: "Rescheduling redelivery is a pain" } },
    { v: "medicine", l: { ja: "医薬品を確実に受け取りたい", en: "Receiving medicine reliably" } },
    { v: "valuable", l: { ja: "高額品を置き配されるのが不安", en: "Expensive items left at my door" } },
    { v: "travel", l: { ja: "旅行・出張中に届いてしまう", en: "Parcels arrive while I travel" } },
    { v: "delegate", l: { ja: "家族・友人に受け取ってもらいたい", en: "Letting family or friends pick it up" } },
    { v: "onthego", l: { ja: "移動中・外出先で受け取りたい", en: "Getting it while I am out" } }
  ];
  var FEARS = [
    { v: "theft", l: { ja: "盗難・紛失", en: "Theft or loss" } },
    { v: "privacy", l: { ja: "位置情報や購買履歴のプライバシー", en: "Location / purchase privacy" } },
    { v: "security", l: { ja: "権限の悪用・なりすまし", en: "Abuse of permissions, impersonation" } },
    { v: "ai_trust", l: { ja: "AIに任せること自体が不安", en: "Letting an AI decide at all" } },
    { v: "cost", l: { ja: "設備・利用コスト", en: "Cost of the service or hardware" } },
    { v: "complex", l: { ja: "設定が面倒そう", en: "Looks fiddly to set up" } },
    { v: "none", l: { ja: "特にない", en: "Nothing in particular" } }
  ];
  var WTP = [
    { v: 0, l: { ja: "0円（無料なら使う）", en: "¥0 — only if it is free" } },
    { v: 100, l: { ja: "〜100円/月", en: "up to ¥100 / month" } },
    { v: 300, l: { ja: "〜300円/月", en: "up to ¥300 / month" } },
    { v: 500, l: { ja: "〜500円/月", en: "up to ¥500 / month" } },
    { v: 1000, l: { ja: "1,000円/月以上", en: "¥1,000 / month or more" } },
    { v: -1, l: { ja: "そもそも使わない", en: "I would not use it at all" } }
  ];
  var FREQ = [
    { v: "never", l: { ja: "ほぼない", en: "Almost never" } },
    { v: "monthly", l: { ja: "月1回くらい", en: "About once a month" } },
    { v: "weekly", l: { ja: "週1回くらい", en: "About once a week" } },
    { v: "often", l: { ja: "週2回以上", en: "Twice a week or more" } }
  ];
  var INTENT = [
    { ja: "使わない", en: "No way" },
    { ja: "あまり", en: "Probably not" },
    { ja: "どちらとも", en: "Neutral" },
    { ja: "使いたい", en: "I would use it" },
    { ja: "絶対使う", en: "Definitely" }
  ];

  var Q = {
    q1: { ja: "Q1. あなたの立場に一番近いものは？", en: "Q1. Which describes you best?" },
    q1h: {
      ja: "「誰が困っていて、誰が払うのか」を切り分けるための質問です",
      en: "This separates who has the pain from who would pay"
    },
    q2: {
      ja: "Q2. 「受取先をあとから自由に切り替えられる」仕組みを使いたいと思いますか？",
      en: "Q2. Would you use a service that lets you change the destination after the parcel ships?"
    },
    q3: {
      ja: "Q3. 荷物を受け取れない／受け取りづらいことはどのくらいありますか？",
      en: "Q3. How often do you miss or struggle with a delivery?"
    },
    q4: { ja: "Q4. どの場面で一番ほしいですか？", en: "Q4. Where would you want this most?" },
    q4h: { ja: "最大3つまで", en: "Pick up to three" },
    q5: { ja: "Q5. この機能に月額いくらまで払えますか？", en: "Q5. What would you pay per month?" },
    q5h: {
      ja: "個人が払わない前提なら「0円」「使わない」を選んでください（それも重要なデータです）",
      en: "If you would never pay, say so — that answer is just as useful"
    },
    q6: { ja: "Q6. 不安・引っかかる点（複数選択可）", en: "Q6. What worries you? (multiple)" },
    q7: {
      ja: "Q7. 自由記述（このアイデアへの一言、こう使いたい、ここが致命的、など）",
      en: "Q7. Anything else — how you would use it, or what kills it for you"
    },
    q7p: {
      ja: "例：冷凍だけは絶対に確実に受け取りたい。ただし位置情報を常時共有するのは無理。",
      en: "e.g. I only care about frozen food arriving safely — but I would never share my location all day."
    },
    submit: { ja: "回答を送る", en: "Submit" },
    localNote: {
      ja: "回答はこの端末のブラウザ内に保存されます（サーバーには送信されません）。イベント後に「書き出し」からCSV/JSONで回収してください。",
      en: "Answers are stored in this browser only (nothing is sent to a server). Export them as CSV/JSON after the event."
    },
    required: {
      ja: "Q1（立場）とQ2（使いたいか）は必須です。",
      en: "Q1 (who you are) and Q2 (would you use it) are required."
    },
    thanks: { ja: "ありがとうございます。", en: "Thank you." },
    saved: { ja: "回答をこの端末に保存しました。", en: "Your answer is saved on this device." },
    notSaved: {
      ja: "※この端末では保存できませんでした（プライベートモードの可能性）。",
      en: "Could not save on this device (private browsing?)."
    },
    again: { ja: "もう1件入力する", en: "Add another response" },
    empty: {
      ja: "まだ回答がありません。イベントで人に触ってもらって、このページに数字が溜まっていく状態をつくってください。",
      en: "No responses yet. Hand the demo to people at the event and let the numbers pile up here."
    },
    nResp: { ja: "回答数", en: "Responses" },
    avgIntent: { ja: "利用意向 平均（5点満点）", en: "Mean intent (out of 5)" },
    top2: { ja: "「使いたい」以上", en: "Rated 4 or 5" },
    payers: { ja: "有料でも払うと回答", en: "Would pay something" },
    byRole: { ja: "立場別の利用意向（平均）", en: "Mean intent by role" },
    byScene: { ja: "刺さる場面（選択された回数）", en: "Where it lands (times picked)" },
    byWtp: { ja: "支払意思額", en: "Willingness to pay" },
    byFear: { ja: "不安の内訳", en: "Concerns" },
    recent: { ja: "直近のコメント", en: "Recent comments" },
    intentShort: { ja: "意向", en: "intent" },
    expCsv: { ja: "CSVで書き出す", en: "Export CSV" },
    expJson: { ja: "JSONで書き出す", en: "Export JSON" },
    clear: { ja: "全消去", en: "Delete all" },
    confirmClear: {
      ja: "保存されている回答をすべて消します。書き出しは済んでいますか？",
      en: "This deletes every stored response. Have you exported them?"
    }
  };

  var answers = { role: null, intent: null, freq: null, scenes: [], wtp: null, fears: [], note: "" };

  /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- form ---------- */
  function radioGroup(name, items, current, parse) {
    return '<div class="opts">' + items.map(function (it) {
      var on = parse ? current === it.v : current === it.v;
      return '<label class="opt' + (on ? " is-on" : "") + '">' +
        '<input type="radio" name="' + name + '" value="' + it.v + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(t(it.l)) + "</span></label>";
    }).join("") + "</div>";
  }
  function checkGroup(name, items, current) {
    return '<div class="opts">' + items.map(function (it) {
      var on = current.indexOf(it.v) !== -1;
      return '<label class="opt' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" name="' + name + '" value="' + it.v + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(t(it.l)) + "</span></label>";
    }).join("") + "</div>";
  }

  function renderForm() {
    var box = $("surveyForm");
    if (!box) return;
    var h = "";

    h += '<div class="q"><span class="qlabel">' + t(Q.q1) +
      '<span class="qhint">' + t(Q.q1h) + "</span></span>" +
      radioGroup("role", ROLES, answers.role) + "</div>";

    h += '<div class="q"><span class="qlabel">' + t(Q.q2) + "</span>" +
      '<div class="scale">' + INTENT.map(function (l, i) {
        return '<button type="button" data-intent="' + (i + 1) + '" class="' + (answers.intent === i + 1 ? "is-on" : "") + '">' +
          (i + 1) + '<span class="sl">' + esc(t(l)) + "</span></button>";
      }).join("") + "</div></div>";

    h += '<div class="q"><span class="qlabel">' + t(Q.q3) + "</span>" +
      radioGroup("freq", FREQ, answers.freq) + "</div>";

    h += '<div class="q"><span class="qlabel">' + t(Q.q4) +
      '<span class="qhint">' + t(Q.q4h) + "</span></span>" +
      checkGroup("scene", SCENES, answers.scenes) + "</div>";

    h += '<div class="q"><span class="qlabel">' + t(Q.q5) +
      '<span class="qhint">' + t(Q.q5h) + "</span></span>" +
      radioGroup("wtp", WTP, answers.wtp) + "</div>";

    h += '<div class="q"><span class="qlabel">' + t(Q.q6) + "</span>" +
      checkGroup("fear", FEARS, answers.fears) + "</div>";

    h += '<div class="q"><label for="note">' + t(Q.q7) + "</label>" +
      '<textarea id="note" placeholder="' + esc(t(Q.q7p)) + '">' + esc(answers.note) + "</textarea></div>";

    h += '<div class="row"><button class="btn btn-primary grow" id="surveySubmit" type="button">' +
      t(Q.submit) + "</button></div>" +
      '<p class="tiny faint" style="margin-top:10px">' + t(Q.localNote) + "</p>";

    box.innerHTML = h;
    bindForm(box);
  }

  function bindForm(box) {
    box.addEventListener("change", function (e) {
      var el = e.target;
      if (el.name === "role") answers.role = el.value;
      else if (el.name === "freq") answers.freq = el.value;
      else if (el.name === "wtp") answers.wtp = parseInt(el.value, 10);
      else if (el.name === "scene") toggle(answers.scenes, el.value, 3);
      else if (el.name === "fear") toggle(answers.fears, el.value, 99);
      syncOn(box);
    });
    box.addEventListener("input", function (e) {
      if (e.target.id === "note") answers.note = e.target.value;
    });
    box.querySelectorAll("[data-intent]").forEach(function (b) {
      b.addEventListener("click", function () {
        answers.intent = parseInt(b.getAttribute("data-intent"), 10);
        box.querySelectorAll("[data-intent]").forEach(function (o) { o.className = o === b ? "is-on" : ""; });
      });
    });
    var sub = $("surveySubmit");
    if (sub) sub.addEventListener("click", submit);
  }

  function toggle(arr, v, max) {
    var i = arr.indexOf(v);
    if (i === -1) {
      if (arr.length >= max) arr.shift();
      arr.push(v);
    } else { arr.splice(i, 1); }
  }

  function syncOn(box) {
    box.querySelectorAll(".opt").forEach(function (lab) {
      var input = lab.querySelector("input");
      if (!input) return;
      var on = input.type === "radio"
        ? (input.name === "role" ? answers.role === input.value
          : input.name === "freq" ? answers.freq === input.value
            : answers.wtp === parseInt(input.value, 10))
        : (input.name === "scene" ? answers.scenes.indexOf(input.value) !== -1
          : answers.fears.indexOf(input.value) !== -1);
      input.checked = on;
      lab.classList.toggle("is-on", on);
    });
  }

  function submit() {
    if (!answers.role || !answers.intent) {
      alert(t(Q.required));
      return;
    }
    var rec = {
      id: "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      lang: I18N ? I18N.lang : "ja",
      role: answers.role,
      intent: answers.intent,
      freq: answers.freq,
      scenes: answers.scenes.slice(),
      wtp: answers.wtp,
      fears: answers.fears.slice(),
      note: answers.note,
      autonomyAtAnswer: window.LM_ENGINE ? window.LM_ENGINE.state.autonomy : null
    };
    var list = load();
    list.push(rec);
    var ok = save(list);

    if (window.LM_SURVEY_ENDPOINT) {
      try {
        fetch(window.LM_SURVEY_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rec)
        }).catch(function () { /* オフラインでも回答は残る */ });
      } catch (e) { /* ignore */ }
    }

    answers = { role: null, intent: null, freq: null, scenes: [], wtp: null, fears: [], note: "" };
    var box = $("surveyForm");
    box.innerHTML = '<div class="banner ok"><b>' + t(Q.thanks) + "</b><br>" +
      (ok ? t(Q.saved) : t(Q.notSaved)) +
      '</div><div class="row" style="margin-top:12px">' +
      '<button class="btn btn-sm" id="againBtn" type="button">' + t(Q.again) + "</button></div>";
    $("againBtn").addEventListener("click", renderForm);
    renderStats();
  }

  /* ---------- stats ---------- */
  function renderStats() {
    var box = $("surveyStats");
    if (!box) return;
    var list = load();
    if (!list.length) {
      box.innerHTML = '<p class="muted small">' + t(Q.empty) + "</p>";
      return;
    }
    var intents = list.map(function (r) { return r.intent; });
    var avg = intents.reduce(function (a, b) { return a + b; }, 0) / intents.length;
    var top2 = intents.filter(function (v) { return v >= 4; }).length / intents.length * 100;
    var payers = list.filter(function (r) { return r.wtp > 0; }).length / list.length * 100;

    var h = '<div class="stat-grid" style="margin-bottom:14px">' +
      '<div class="stat"><div class="sv">' + list.length + '</div><div class="sk">' + t(Q.nResp) + "</div></div>" +
      '<div class="stat"><div class="sv">' + avg.toFixed(2) + '</div><div class="sk">' + t(Q.avgIntent) + "</div></div>" +
      '<div class="stat"><div class="sv">' + Math.round(top2) + '%</div><div class="sk">' + t(Q.top2) + "</div></div>" +
      '<div class="stat"><div class="sv">' + Math.round(payers) + '%</div><div class="sk">' + t(Q.payers) + "</div></div>" +
      "</div>";

    h += barGroup(t(Q.byRole), ROLES.map(function (r) {
      var sub = list.filter(function (x) { return x.role === r.v; });
      var v = sub.length ? sub.reduce(function (a, b) { return a + b.intent; }, 0) / sub.length : 0;
      return {
        label: t(r.l).replace(/（.*/, "").slice(0, 16),
        value: v, max: 5,
        display: sub.length ? v.toFixed(1) + " (n=" + sub.length + ")" : "—"
      };
    }));

    h += barGroup(t(Q.byScene), SCENES.map(function (s) {
      var c = list.filter(function (x) { return (x.scenes || []).indexOf(s.v) !== -1; }).length;
      return { label: t(s.l).slice(0, 16), value: c, max: list.length, display: String(c) };
    }).sort(function (a, b) { return b.value - a.value; }));

    h += barGroup(t(Q.byWtp), WTP.map(function (w) {
      var c = list.filter(function (x) { return x.wtp === w.v; }).length;
      return { label: t(w.l).slice(0, 16), value: c, max: list.length, display: String(c) };
    }));

    h += barGroup(t(Q.byFear), FEARS.map(function (f) {
      var c = list.filter(function (x) { return (x.fears || []).indexOf(f.v) !== -1; }).length;
      return { label: t(f.l).slice(0, 16), value: c, max: list.length, display: String(c) };
    }).sort(function (a, b) { return b.value - a.value; }));

    var notes = list.filter(function (r) { return r.note && r.note.trim(); }).slice(-6).reverse();
    if (notes.length) {
      h += '<h4 style="font-size:14px;margin:18px 0 8px">' + t(Q.recent) + "</h4>";
      h += notes.map(function (r) {
        var roleL = "";
        ROLES.forEach(function (x) { if (x.v === r.role) roleL = t(x.l); });
        return '<div class="card card-tight" style="margin-bottom:8px"><div class="tiny faint">' +
          esc(roleL) + " · " + t(Q.intentShort) + " " + r.intent + '/5</div><div class="small">' +
          esc(r.note) + "</div></div>";
      }).join("");
    }

    h += '<div class="row row-wrap" style="margin-top:16px">' +
      '<button class="btn btn-sm" id="expCsv" type="button">' + t(Q.expCsv) + "</button>" +
      '<button class="btn btn-sm" id="expJson" type="button">' + t(Q.expJson) + "</button>" +
      '<button class="btn btn-sm btn-ghost" id="clearAll" type="button">' + t(Q.clear) + "</button></div>";

    box.innerHTML = h;
    $("expCsv").addEventListener("click", exportCsv);
    $("expJson").addEventListener("click", exportJson);
    $("clearAll").addEventListener("click", function () {
      if (!confirm(t(Q.confirmClear))) return;
      save([]);
      renderStats();
    });
  }

  function barGroup(title, rows) {
    return '<h4 style="font-size:14px;margin:18px 0 8px">' + esc(title) + "</h4>" +
      '<div class="bars">' + rows.map(function (r) {
        var pct = r.max ? Math.max(0, Math.min(100, (r.value / r.max) * 100)) : 0;
        return '<div class="barline"><span class="faint">' + esc(r.label) + "</span>" +
          '<span class="bt"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
          '<span class="tiny">' + esc(r.display) + "</span></div>";
      }).join("") + "</div>";
  }

  /* ---------- export ---------- */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function exportJson() {
    download("lastmeters-survey-" + stamp() + ".json", JSON.stringify(load(), null, 2), "application/json");
  }
  function exportCsv() {
    var list = load();
    var head = ["id", "at", "lang", "role", "intent", "freq", "scenes", "wtp", "fears", "note", "autonomy"];
    var rows = list.map(function (r) {
      return [r.id, r.at, r.lang || "", r.role, r.intent, r.freq, (r.scenes || []).join("|"), r.wtp,
        (r.fears || []).join("|"), (r.note || "").replace(/\s+/g, " "), r.autonomyAtAnswer].map(csvCell).join(",");
    });
    // ExcelでUTF-8を正しく開くためBOMを付ける
    download("lastmeters-survey-" + stamp() + ".csv", "﻿" + head.join(",") + "\n" + rows.join("\n"), "text/csv");
  }
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function stamp() {
    return new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  }

  return {
    init: function () { renderForm(); renderStats(); },
    refresh: function () { renderStats(); },
    relang: function () { renderForm(); renderStats(); },
    count: function () { return load().length; }
  };
})();
