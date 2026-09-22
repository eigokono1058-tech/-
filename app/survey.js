/* ==========================================================================
   LAST METERS — 需要検証フォーム（「本当に使いたいか」を測る）
   保存先はブラウザのlocalStorage。集計・CSV/JSON書き出しに対応。
   window.LM_SURVEY_ENDPOINT を設定すると、そのURLへPOSTも試行する。
   ========================================================================== */
window.LM_SURVEY = (function () {
  var KEY = "lm-survey-responses-v1";

  var ROLES = [
    { v: "consumer", l: "受け取る人（生活者）" },
    { v: "carrier", l: "配送・物流に関わる人" },
    { v: "ec", l: "EC・小売に関わる人" },
    { v: "realestate", l: "不動産・マンション管理に関わる人" },
    { v: "builder", l: "つくる人（エンジニア／企画）" },
    { v: "other", l: "その他" }
  ];
  var SCENES = [
    { v: "frozen", l: "冷凍・生鮮を確実に受け取りたい" },
    { v: "absent", l: "日中いないので受け取れない" },
    { v: "redeliver", l: "再配達の調整が面倒" },
    { v: "medicine", l: "医薬品を確実に受け取りたい" },
    { v: "valuable", l: "高額品を置き配されるのが不安" },
    { v: "travel", l: "旅行・出張中に届いてしまう" },
    { v: "delegate", l: "家族・友人に受け取ってもらいたい" },
    { v: "onthego", l: "移動中・外出先で受け取りたい" }
  ];
  var FEARS = [
    { v: "theft", l: "盗難・紛失" },
    { v: "privacy", l: "位置情報や購買履歴のプライバシー" },
    { v: "security", l: "権限の悪用・なりすまし" },
    { v: "ai_trust", l: "AIに任せること自体が不安" },
    { v: "cost", l: "設備・利用コスト" },
    { v: "complex", l: "設定が面倒そう" },
    { v: "none", l: "特にない" }
  ];
  var WTP = [
    { v: 0, l: "0円（無料なら使う）" },
    { v: 100, l: "〜100円/月" },
    { v: 300, l: "〜300円/月" },
    { v: 500, l: "〜500円/月" },
    { v: 1000, l: "1,000円/月以上" },
    { v: -1, l: "そもそも使わない" }
  ];
  var FREQ = [
    { v: "never", l: "ほぼない" },
    { v: "monthly", l: "月1回くらい" },
    { v: "weekly", l: "週1回くらい" },
    { v: "often", l: "週2回以上" }
  ];
  var INTENT_LABELS = ["使わない", "あまり", "どちらとも", "使いたい", "絶対使う"];

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
  function renderForm() {
    var box = $("surveyForm");
    if (!box) return;
    var h = "";

    h += '<div class="q"><span class="qlabel">Q1. あなたの立場に一番近いものは？' +
      '<span class="qhint">「誰が困っていて、誰が払うのか」を切り分けるための質問です</span></span>' +
      '<div class="opts">' + ROLES.map(function (r) {
        return '<label class="opt' + (answers.role === r.v ? " is-on" : "") + '">' +
          '<input type="radio" name="role" value="' + r.v + '"' + (answers.role === r.v ? " checked" : "") + ">" +
          "<span>" + esc(r.l) + "</span></label>";
      }).join("") + "</div></div>";

    h += '<div class="q"><span class="qlabel">Q2. 「受取先をあとから自由に切り替えられる」仕組みを使いたいと思いますか？</span>' +
      '<div class="scale">' + INTENT_LABELS.map(function (l, i) {
        return '<button type="button" data-intent="' + (i + 1) + '" class="' + (answers.intent === i + 1 ? "is-on" : "") + '">' +
          (i + 1) + '<span class="sl">' + esc(l) + "</span></button>";
      }).join("") + "</div></div>";

    h += '<div class="q"><span class="qlabel">Q3. 荷物を受け取れない／受け取りづらいことはどのくらいありますか？</span>' +
      '<div class="opts">' + FREQ.map(function (f) {
        return '<label class="opt' + (answers.freq === f.v ? " is-on" : "") + '">' +
          '<input type="radio" name="freq" value="' + f.v + '"' + (answers.freq === f.v ? " checked" : "") + ">" +
          "<span>" + esc(f.l) + "</span></label>";
      }).join("") + "</div></div>";

    h += '<div class="q"><span class="qlabel">Q4. どの場面で一番ほしいですか？<span class="qhint">最大3つまで</span></span>' +
      '<div class="opts">' + SCENES.map(function (s) {
        var on = answers.scenes.indexOf(s.v) !== -1;
        return '<label class="opt' + (on ? " is-on" : "") + '">' +
          '<input type="checkbox" name="scene" value="' + s.v + '"' + (on ? " checked" : "") + ">" +
          "<span>" + esc(s.l) + "</span></label>";
      }).join("") + "</div></div>";

    h += '<div class="q"><span class="qlabel">Q5. この機能に月額いくらまで払えますか？' +
      '<span class="qhint">個人が払わない前提なら「0円」「使わない」を選んでください（それも重要なデータです）</span></span>' +
      '<div class="opts">' + WTP.map(function (w) {
        return '<label class="opt' + (answers.wtp === w.v ? " is-on" : "") + '">' +
          '<input type="radio" name="wtp" value="' + w.v + '"' + (answers.wtp === w.v ? " checked" : "") + ">" +
          "<span>" + esc(w.l) + "</span></label>";
      }).join("") + "</div></div>";

    h += '<div class="q"><span class="qlabel">Q6. 不安・引っかかる点（複数選択可）</span>' +
      '<div class="opts">' + FEARS.map(function (f) {
        var on = answers.fears.indexOf(f.v) !== -1;
        return '<label class="opt' + (on ? " is-on" : "") + '">' +
          '<input type="checkbox" name="fear" value="' + f.v + '"' + (on ? " checked" : "") + ">" +
          "<span>" + esc(f.l) + "</span></label>";
      }).join("") + "</div></div>";

    h += '<div class="q"><label for="note">Q7. 自由記述（このアイデアへの一言、こう使いたい、ここが致命的、など）</label>' +
      '<textarea id="note" placeholder="例：冷凍だけは絶対に確実に受け取りたい。ただし位置情報を常時共有するのは無理。">' +
      esc(answers.note) + "</textarea></div>";

    h += '<div class="row"><button class="btn btn-primary grow" id="surveySubmit" type="button">回答を送る</button></div>' +
      '<p class="tiny faint" style="margin-top:10px">回答はこの端末のブラウザ内に保存されます（サーバーには送信されません）。' +
      "イベント後に「書き出し」からCSV/JSONで回収してください。</p>";

    box.innerHTML = h;
    bindForm(box);
  }

  function bindForm(box) {
    box.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name === "role") answers.role = t.value;
      else if (t.name === "freq") answers.freq = t.value;
      else if (t.name === "wtp") answers.wtp = parseInt(t.value, 10);
      else if (t.name === "scene") toggle(answers.scenes, t.value, 3);
      else if (t.name === "fear") toggle(answers.fears, t.value, 99);
      else if (t.id === "note") answers.note = t.value;
      syncOn(box);
    });
    box.addEventListener("input", function (e) {
      if (e.target.id === "note") answers.note = e.target.value;
    });
    box.querySelectorAll("[data-intent]").forEach(function (b) {
      b.addEventListener("click", function () {
        answers.intent = parseInt(b.getAttribute("data-intent"), 10);
        box.querySelectorAll("[data-intent]").forEach(function (o) {
          o.className = o === b ? "is-on" : "";
        });
      });
    });
    var sub = $("surveySubmit");
    if (sub) sub.addEventListener("click", submit);
  }

  function toggle(arr, v, max) {
    var i = arr.indexOf(v);
    if (i === -1) {
      if (arr.length >= max) { arr.shift(); }
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
      alert("Q1（立場）とQ2（使いたいか）は必須です。");
      return;
    }
    var rec = {
      id: "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
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
    box.innerHTML = '<div class="banner ok"><b>ありがとうございます。</b><br>' +
      (ok ? "回答をこの端末に保存しました。" : "※この端末では保存できませんでした（プライベートモードの可能性）。") +
      '</div><div class="row" style="margin-top:12px">' +
      '<button class="btn btn-sm" id="againBtn" type="button">もう1件入力する</button></div>';
    $("againBtn").addEventListener("click", renderForm);
    renderStats();
  }

  /* ---------- stats ---------- */
  function renderStats() {
    var box = $("surveyStats");
    if (!box) return;
    var list = load();
    if (!list.length) {
      box.innerHTML = '<p class="muted small">まだ回答がありません。イベントで人に触ってもらって、' +
        "このページに数字が溜まっていく状態をつくってください。</p>";
      return;
    }
    var intents = list.map(function (r) { return r.intent; });
    var avg = intents.reduce(function (a, b) { return a + b; }, 0) / intents.length;
    var top2 = intents.filter(function (v) { return v >= 4; }).length / intents.length * 100;
    var payers = list.filter(function (r) { return r.wtp > 0; }).length / list.length * 100;

    var h = '<div class="stat-grid" style="margin-bottom:14px">' +
      '<div class="stat"><div class="sv">' + list.length + '</div><div class="sk">回答数</div></div>' +
      '<div class="stat"><div class="sv">' + avg.toFixed(2) + '</div><div class="sk">利用意向 平均（5点満点）</div></div>' +
      '<div class="stat"><div class="sv">' + Math.round(top2) + '%</div><div class="sk">「使いたい」以上</div></div>' +
      '<div class="stat"><div class="sv">' + Math.round(payers) + '%</div><div class="sk">有料でも払うと回答</div></div>' +
      "</div>";

    h += barGroup("立場別の利用意向（平均）", ROLES.map(function (r) {
      var sub = list.filter(function (x) { return x.role === r.v; });
      var v = sub.length ? sub.reduce(function (a, b) { return a + b.intent; }, 0) / sub.length : 0;
      return { label: r.l.replace(/（.*/, ""), value: v, max: 5, display: sub.length ? v.toFixed(1) + " (n=" + sub.length + ")" : "—" };
    }));

    h += barGroup("刺さる場面（選択された回数）", SCENES.map(function (s) {
      var c = list.filter(function (x) { return (x.scenes || []).indexOf(s.v) !== -1; }).length;
      return { label: s.l.slice(0, 12), value: c, max: list.length, display: String(c) };
    }).sort(function (a, b) { return b.value - a.value; }));

    h += barGroup("支払意思額", WTP.map(function (w) {
      var c = list.filter(function (x) { return x.wtp === w.v; }).length;
      return { label: w.l.slice(0, 12), value: c, max: list.length, display: String(c) };
    }));

    h += barGroup("不安の内訳", FEARS.map(function (f) {
      var c = list.filter(function (x) { return (x.fears || []).indexOf(f.v) !== -1; }).length;
      return { label: f.l.slice(0, 12), value: c, max: list.length, display: String(c) };
    }).sort(function (a, b) { return b.value - a.value; }));

    var notes = list.filter(function (r) { return r.note && r.note.trim(); }).slice(-6).reverse();
    if (notes.length) {
      h += '<h4 style="font-size:14px;margin:18px 0 8px">直近のコメント</h4>';
      h += notes.map(function (r) {
        var roleL = "";
        ROLES.forEach(function (x) { if (x.v === r.role) roleL = x.l; });
        return '<div class="card card-tight" style="margin-bottom:8px"><div class="tiny faint">' +
          esc(roleL) + " · 意向 " + r.intent + "/5</div><div class=\"small\">" + esc(r.note) + "</div></div>";
      }).join("");
    }

    h += '<div class="row row-wrap" style="margin-top:16px">' +
      '<button class="btn btn-sm" id="expCsv" type="button">CSVで書き出す</button>' +
      '<button class="btn btn-sm" id="expJson" type="button">JSONで書き出す</button>' +
      '<button class="btn btn-sm btn-ghost" id="clearAll" type="button">全消去</button></div>';

    box.innerHTML = h;
    $("expCsv").addEventListener("click", exportCsv);
    $("expJson").addEventListener("click", exportJson);
    $("clearAll").addEventListener("click", function () {
      if (!confirm("保存されている回答をすべて消します。書き出しは済んでいますか？")) return;
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
    var head = ["id", "at", "role", "intent", "freq", "scenes", "wtp", "fears", "note", "autonomy"];
    var rows = list.map(function (r) {
      return [r.id, r.at, r.role, r.intent, r.freq, (r.scenes || []).join("|"), r.wtp,
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
    var d = new Date();
    return d.toISOString().slice(0, 16).replace(/[-:T]/g, "");
  }

  return {
    init: function () { renderForm(); renderStats(); },
    refresh: function () { renderStats(); },
    count: function () { return load().length; }
  };
})();
