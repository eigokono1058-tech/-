/* ==========================================================================
   LAST METERS — 需要検証フォーム / demand validation survey (ja + en)
   保存先はブラウザのlocalStorage。集計・CSV/JSON書き出しに対応。
   window.LM_SURVEY_ENDPOINT を設定すると、そのURLへPOSTも試行する。

   フォームはデジタル庁デザインシステムの Form Control Label / Radio /
   Checkbox / Textarea / Button / Error Text に準拠している。
   必須項目の未入力は alert() ではなく、公式のエラーテキスト＋aria-invalid＋
   該当項目へのフォーカス移動で知らせる。
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
    { v: 1, l: { ja: "1 使わない", en: "1 No way" } },
    { v: 2, l: { ja: "2 あまり使わない", en: "2 Probably not" } },
    { v: 3, l: { ja: "3 どちらとも言えない", en: "3 Neutral" } },
    { v: 4, l: { ja: "4 使いたい", en: "4 I would use it" } },
    { v: 5, l: { ja: "5 絶対使う", en: "5 Definitely" } }
  ];

  var Q = {
    q1: { ja: "あなたの立場に一番近いものは？", en: "Which describes you best?" },
    q1h: {
      ja: "「誰が困っていて、誰が払うのか」を切り分けるための質問です",
      en: "This separates who has the pain from who would pay"
    },
    q2: {
      ja: "「受取先をあとから自由に切り替えられる」仕組みを使いたいと思いますか？",
      en: "Would you use a service that lets you change the destination after the parcel ships?"
    },
    q2h: { ja: "1（使わない）〜5（絶対使う）", en: "1 (no way) to 5 (definitely)" },
    q3: {
      ja: "荷物を受け取れない／受け取りづらいことはどのくらいありますか？",
      en: "How often do you miss or struggle with a delivery?"
    },
    q4: { ja: "どの場面で一番ほしいですか？", en: "Where would you want this most?" },
    q4h: { ja: "最大3つまで選べます", en: "Pick up to three" },
    q5: { ja: "この機能に月額いくらまで払えますか？", en: "What would you pay per month?" },
    q5h: {
      ja: "個人が払わない前提なら「0円」「使わない」を選んでください（それも重要なデータです）",
      en: "If you would never pay, say so — that answer is just as useful"
    },
    q6: { ja: "不安・引っかかる点", en: "What worries you?" },
    q6h: { ja: "いくつでも選べます", en: "Pick as many as apply" },
    q7: {
      ja: "自由記述（このアイデアへの一言、こう使いたい、ここが致命的、など）",
      en: "Anything else — how you would use it, or what kills it for you"
    },
    q7h: {
      ja: "例：冷凍だけは絶対に確実に受け取りたい。ただし位置情報を常時共有するのは無理。",
      en: "e.g. I only care about frozen food arriving safely — but I would never share my location all day."
    },
    required: { ja: "※必須", en: "required" },
    optional: { ja: "※任意", en: "optional" },
    errRole: { ja: "＊立場を選んでください。", en: "＊Please choose which describes you." },
    errIntent: { ja: "＊使いたいかどうかを選んでください。", en: "＊Please rate whether you would use it." },
    submit: { ja: "回答を送る", en: "Submit" },
    localNote: {
      ja: "回答はこの端末のブラウザ内に保存されます（サーバーには送信されません）。イベント後に「書き出し」からCSV/JSONで回収してください。",
      en: "Answers are stored in this browser only (nothing is sent to a server). Export them as CSV/JSON after the event."
    },
    thanks: { ja: "ありがとうございます。", en: "Thank you." },
    saved: { ja: "回答をこの端末に保存しました。", en: "Your answer is saved on this device." },
    notSaved: {
      ja: "この端末では保存できませんでした（プライベートモードの可能性があります）。",
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
  var showErrors = false;

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

  /* ---------- DADSのフォーム部品 ---------- */
  /** ラジオ／チェックボックスのグループ（fieldset + legend が正しい組み方） */
  function group(opts) {
    var type = opts.type;              // "radio" | "checkbox"
    var name = opts.name;
    var items = opts.items;
    var isOn = opts.isOn;
    var describedBy = [];
    if (opts.support) describedBy.push(name + "-support");
    if (opts.error) describedBy.push(name + "-error");

    var h = '<fieldset class="dads-form-control-label" data-size="sm"' +
      (describedBy.length ? ' aria-describedby="' + describedBy.join(" ") + '"' : "") + ">" +
      '<legend class="dads-form-control-label__label">' + esc(t(opts.label)) +
      '<span class="dads-form-control-label__requirement" data-required="' + (opts.required ? "true" : "false") + '">' +
      t(opts.required ? Q.required : Q.optional) + "</span></legend>";
    if (opts.support) {
      h += '<p id="' + name + '-support" class="dads-form-control-label__support-text">' + esc(t(opts.support)) + "</p>";
    }
    if (opts.error) {
      h += '<p id="' + name + '-error" class="dads-form-control-label__error-text">' + esc(t(opts.error)) + "</p>";
    }
    h += '<div class="s-options">' + items.map(function (it) {
      var on = isOn(it.v);
      var cls = type === "radio" ? "dads-radio" : "dads-checkbox";
      return '<label class="' + cls + '" data-size="sm">' +
        '<span class="' + cls + "__" + type + '">' +
        '<input class="' + cls + '__input" type="' + type + '" name="' + name + '" value="' + esc(it.v) + '"' +
        (on ? " checked" : "") + (opts.error ? ' aria-invalid="true"' : "") + ">" +
        "</span>" +
        '<span class="' + cls + '__label">' + esc(t(it.l)) + "</span></label>";
    }).join("") + "</div></fieldset>";
    return h;
  }

  function renderForm() {
    var box = $("surveyForm");
    if (!box) return;

    var roleError = showErrors && !answers.role ? Q.errRole : null;
    var intentError = showErrors && !answers.intent ? Q.errIntent : null;

    var h = '<div class="s-questions">';

    h += group({
      type: "radio", name: "role", label: Q.q1, support: Q.q1h, required: true,
      items: ROLES, isOn: function (v) { return answers.role === v; }, error: roleError
    });

    h += group({
      type: "radio", name: "intent", label: Q.q2, support: Q.q2h, required: true,
      items: INTENT, isOn: function (v) { return answers.intent === v; }, error: intentError
    });

    h += group({
      type: "radio", name: "freq", label: Q.q3,
      items: FREQ, isOn: function (v) { return answers.freq === v; }
    });

    h += group({
      type: "checkbox", name: "scene", label: Q.q4, support: Q.q4h,
      items: SCENES, isOn: function (v) { return answers.scenes.indexOf(v) !== -1; }
    });

    h += group({
      type: "radio", name: "wtp", label: Q.q5, support: Q.q5h,
      items: WTP, isOn: function (v) { return answers.wtp === v; }
    });

    h += group({
      type: "checkbox", name: "fear", label: Q.q6, support: Q.q6h,
      items: FEARS, isOn: function (v) { return answers.fears.indexOf(v) !== -1; }
    });

    h += '<div class="dads-form-control-label" data-size="sm">' +
      '<label class="dads-form-control-label__label" for="note">' + esc(t(Q.q7)) +
      '<span class="dads-form-control-label__requirement" data-required="false">' + t(Q.optional) + "</span></label>" +
      '<p id="note-support" class="dads-form-control-label__support-text">' + esc(t(Q.q7h)) + "</p>" +
      '<div><span class="dads-textarea">' +
      '<textarea id="note" class="dads-textarea__textarea" rows="4" aria-describedby="note-support">' +
      esc(answers.note) + "</textarea></span></div></div>";

    h += "</div>" +
      '<div class="l-cluster u-mt-24">' +
      '<button class="dads-button" data-type="solid-fill" data-size="lg" id="surveySubmit" type="button">' +
      esc(t(Q.submit)) + "</button></div>" +
      '<p class="u-text-note u-mt-16">' + esc(t(Q.localNote)) + "</p>";

    box.innerHTML = h;
    bindForm(box);
  }

  /* #surveyForm は再描画しても同じ要素が残るので、委譲するリスナは一度だけ張る。
     毎回張ると1クリックで2回処理され、チェックが入らなくなる。 */
  var delegated = false;
  function bindForm(box) {
    var sub = $("surveySubmit");
    if (sub) sub.addEventListener("click", submit);
    if (delegated) return;
    delegated = true;

    box.addEventListener("change", function (e) {
      var el = e.target;
      if (el.name === "role") answers.role = el.value;
      else if (el.name === "intent") answers.intent = parseInt(el.value, 10);
      else if (el.name === "freq") answers.freq = el.value;
      else if (el.name === "wtp") answers.wtp = parseInt(el.value, 10);
      else if (el.name === "scene") toggle(answers.scenes, el.value, 3, box);
      else if (el.name === "fear") toggle(answers.fears, el.value, 99, box);
    });
    box.addEventListener("input", function (e) {
      if (e.target.id === "note") answers.note = e.target.value;
    });
  }

  /** 上限つきの複数選択。上限を超えたら古いものから外す（画面の状態も合わせる） */
  function toggle(arr, v, max, box) {
    var i = arr.indexOf(v);
    if (i === -1) {
      if (arr.length >= max) arr.shift();
      arr.push(v);
    } else {
      arr.splice(i, 1);
    }
    if (box) {
      box.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
        if (input.name !== "scene" && input.name !== "fear") return;
        var list = input.name === "scene" ? answers.scenes : answers.fears;
        input.checked = list.indexOf(input.value) !== -1;
      });
    }
  }

  function submit() {
    if (!answers.role || !answers.intent) {
      showErrors = true;
      renderForm();
      var first = document.querySelector('input[name="' + (answers.role ? "intent" : "role") + '"]');
      if (first) {
        first.focus();
        if (first.scrollIntoView) first.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    showErrors = false;

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
    box.innerHTML =
      '<div class="dads-notification-banner" data-style="standard" data-type="' + (ok ? "success" : "warning") + '">' +
      '<h3 class="dads-notification-banner__heading">' +
      '<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="' +
      (ok ? "成功" : "警告") + '">' +
      (ok
        ? '<circle cx="12" cy="12" r="10" fill="currentcolor"/><path d="m10.6 16.6-4.2-4.2 1.4-1.4 2.8 2.8 5.6-5.6 1.4 1.4-7 7Z" fill="Canvas"/>'
        : '<path d="M12 2 1.5 20.5h21L12 2Zm0 5 7 12.5H5L12 7Zm-1 3.5v4h2v-4h-2Zm0 5.5v2h2v-2h-2Z" fill="currentcolor"/>') +
      "</svg>" +
      '<span class="dads-notification-banner__heading-text">' + esc(t(Q.thanks)) + "</span></h3>" +
      '<div class="dads-notification-banner__body"><p>' + esc(t(ok ? Q.saved : Q.notSaved)) + "</p></div>" +
      '<div class="dads-notification-banner__actions">' +
      '<button class="dads-button" data-type="outline" data-size="md" id="againBtn" type="button">' +
      esc(t(Q.again)) + "</button></div></div>";
    var again = $("againBtn");
    if (again) {
      again.addEventListener("click", function () { renderForm(); });
      again.focus();
    }
    renderStats();
  }

  /* ---------- 集計 ---------- */
  function renderStats() {
    var box = $("surveyStats");
    if (!box) return;
    var list = load();
    if (!list.length) {
      box.innerHTML = '<p class="u-text-support">' + esc(t(Q.empty)) + "</p>";
      return;
    }
    var intents = list.map(function (r) { return r.intent; });
    var avg = intents.reduce(function (a, b) { return a + b; }, 0) / intents.length;
    var top2 = intents.filter(function (v) { return v >= 4; }).length / intents.length * 100;
    var payers = list.filter(function (r) { return r.wtp > 0; }).length / list.length * 100;

    var h = '<ul class="s-stats">' +
      stat(list.length, t(Q.nResp)) +
      stat(avg.toFixed(2), t(Q.avgIntent)) +
      stat(Math.round(top2) + "%", t(Q.top2)) +
      stat(Math.round(payers) + "%", t(Q.payers)) +
      "</ul>";

    h += barGroup(t(Q.byRole), ROLES.map(function (r) {
      var sub = list.filter(function (x) { return x.role === r.v; });
      var v = sub.length ? sub.reduce(function (a, b) { return a + b.intent; }, 0) / sub.length : 0;
      return {
        label: t(r.l).replace(/（.*/, ""),
        value: v, max: 5,
        display: sub.length ? v.toFixed(1) + " (n=" + sub.length + ")" : "—"
      };
    }));

    h += barGroup(t(Q.byScene), SCENES.map(function (s) {
      var c = list.filter(function (x) { return (x.scenes || []).indexOf(s.v) !== -1; }).length;
      return { label: t(s.l), value: c, max: list.length, display: String(c) };
    }).sort(function (a, b) { return b.value - a.value; }));

    h += barGroup(t(Q.byWtp), WTP.map(function (w) {
      var c = list.filter(function (x) { return x.wtp === w.v; }).length;
      return { label: t(w.l), value: c, max: list.length, display: String(c) };
    }));

    h += barGroup(t(Q.byFear), FEARS.map(function (f) {
      var c = list.filter(function (x) { return (x.fears || []).indexOf(f.v) !== -1; }).length;
      return { label: t(f.l), value: c, max: list.length, display: String(c) };
    }).sort(function (a, b) { return b.value - a.value; }));

    var notes = list.filter(function (r) { return r.note && r.note.trim(); }).slice(-6).reverse();
    if (notes.length) {
      h += '<h3 class="dads-u-std-17B-170 u-mt-24 u-mb-8">' + esc(t(Q.recent)) + "</h3>" +
        '<ul class="s-notes">' + notes.map(function (r) {
          var roleL = "";
          ROLES.forEach(function (x) { if (x.v === r.role) roleL = t(x.l); });
          return '<li class="p-card" data-tone="quiet"><p class="u-text-note u-no-margin">' +
            esc(roleL) + " · " + esc(t(Q.intentShort)) + " " + r.intent + "/5</p>" +
            "<p class='u-mt-8 u-no-margin'>" + esc(r.note) + "</p></li>";
        }).join("") + "</ul>";
    }

    h += '<div class="l-cluster u-mt-24">' +
      '<button class="dads-button" data-type="outline" data-size="md" id="expCsv" type="button">' + esc(t(Q.expCsv)) + "</button>" +
      '<button class="dads-button" data-type="outline" data-size="md" id="expJson" type="button">' + esc(t(Q.expJson)) + "</button>" +
      '<button class="dads-button" data-type="text" data-size="md" id="clearAll" type="button">' + esc(t(Q.clear)) + "</button></div>";

    box.innerHTML = h;
    $("expCsv").addEventListener("click", exportCsv);
    $("expJson").addEventListener("click", exportJson);
    $("clearAll").addEventListener("click", function () {
      if (!confirm(t(Q.confirmClear))) return;
      save([]);
      renderStats();
    });
  }

  function stat(value, label) {
    return '<li class="s-stat"><span class="s-stat__value">' + esc(value) + "</span>" +
      '<span class="s-stat__label">' + esc(label) + "</span></li>";
  }

  /* 棒グラフは色に意味を持たせず、数値を必ず併記する（色覚に依存させない） */
  function barGroup(title, rows) {
    return '<h3 class="dads-u-std-17B-170 u-mt-24 u-mb-8">' + esc(title) + "</h3>" +
      '<ul class="s-bars">' + rows.map(function (r) {
        var pct = r.max ? Math.max(0, Math.min(100, (r.value / r.max) * 100)) : 0;
        return '<li class="s-bar"><span class="s-bar__label">' + esc(r.label) + "</span>" +
          '<span class="s-bar__track"><span class="s-bar__fill" style="width:' + pct.toFixed(1) + '%"></span></span>' +
          '<span class="s-bar__value">' + esc(r.display) + "</span></li>";
      }).join("") + "</ul>";
  }

  /* ---------- 書き出し ---------- */
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
