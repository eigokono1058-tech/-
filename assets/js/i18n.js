/* ==========================================================================
   言語切り替え / Language switching (en | ja | both)
   --------------------------------------------------------------------------
   3モード:
     en    英語のみ（既定。DevDayで相手に見せるとき）
     ja    日本語のみ
     both  英語＋日本語の併記（あとから自分で内容を確認するとき）

   優先順位 / precedence:  ?lang=  >  保存された選択  >  DEFAULT_LANG
   既定は英語。OpenAI DevDay（サンフランシスコ）で見せる相手がほぼ英語話者で、
   自分の端末を渡して見せる運用になるため、日本語端末でも英語で開くようにしている。
   ブラウザの言語設定に従わせたい場合は DEFAULT_LANG を "auto" にする。

   静的な文章は [data-l="ja"] / [data-l="en"] を並べて置き、使わない側をCSSで隠す
   （JSの再描画が要らないので切り替えが速く、併記モードは「隠さないだけ」で済む）。
   JSが生成する文字列は {ja: "...", en: "..."} を LM_I18N.t() に渡す。
   併記したい長文は LM_I18N.both() を使う。

   This file must load in <head>, before the body paints.
   ========================================================================== */
(function () {
  var KEY = "lm-lang";
  var DEFAULT_LANG = "en"; // "en" | "ja" | "both" | "auto"
  var MODES = ["en", "ja", "both"];
  var listeners = [];

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function valid(v) { return MODES.indexOf(v) !== -1 ? v : null; }
  function fromQuery() {
    var m = /[?&]lang=(ja|en|both)\b/i.exec(location.search);
    return m ? m[1].toLowerCase() : null;
  }
  function fromBrowser() {
    var n = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    return n.indexOf("ja") === 0 ? "ja" : "en";
  }

  var mode =
    fromQuery() ||
    valid(stored()) ||
    (DEFAULT_LANG === "auto" ? fromBrowser() : DEFAULT_LANG);

  /** 併記モードでも主言語は英語（見出しやJS生成文字列に使う） */
  function primary() { return mode === "ja" ? "ja" : "en"; }

  function paint() {
    var root = document.documentElement;
    root.setAttribute("lang", primary());
    if (mode === "both") root.setAttribute("data-lang-both", "true");
    else root.removeAttribute("data-lang-both");
  }
  paint();

  /* 併記したときに英語が先に来るよう、隣り合う [data-l] の組を並べ替える。
     ページ側でどちらの順に書いても表示順が揃うので、原稿を書くときに気をつけなくてよい。 */
  function normalizeOrder() {
    var jas = document.querySelectorAll('[data-l="ja"]');
    for (var i = 0; i < jas.length; i++) {
      var ja = jas[i];
      var next = ja.nextElementSibling;
      if (next && next.getAttribute && next.getAttribute("data-l") === "en" && ja.parentNode) {
        ja.parentNode.insertBefore(next, ja);
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeOrder);
  } else {
    normalizeOrder();
  }

  window.LM_I18N = {
    get lang() { return primary(); },
    get mode() { return mode; },
    normalizeOrder: normalizeOrder,

    /** {ja,en} でも素の文字列でも受け取れる。併記モードでも主言語だけを返す */
    t: function (value) {
      if (value == null) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        var l = primary();
        if (value[l] != null) return value[l];
        if (value.en != null) return value.en;
        if (value.ja != null) return value.ja;
      }
      return String(value);
    },

    /** 併記モードのときだけ、もう一方の言語も返す（長文の確認用）。
        戻り値は {main, alt}。altが空文字なら併記不要という意味。 */
    both: function (value) {
      var main = this.t(value);
      if (mode !== "both" || !value || typeof value !== "object") return { main: main, alt: "" };
      var alt = value.ja != null ? value.ja : "";
      return { main: main, alt: alt === main ? "" : alt };
    },

    /** 配列版（tags などのリスト） */
    list: function (value) {
      if (!value) return [];
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return value[primary()] || value.en || value.ja || [];
    },

    set: function (next) {
      if (MODES.indexOf(next) === -1) return mode;
      mode = next;
      paint();
      try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ }
      for (var i = 0; i < listeners.length; i++) listeners[i](primary(), mode);
      return mode;
    },

    /** en → ja → both → en と巡回する */
    toggle: function () {
      return this.set(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    },

    onChange: function (fn) { listeners.push(fn); },

    /** 切り替えボタンを描画する（いまのモードを表示し、押すと次のモードへ） */
    mountToggle: function (selector) {
      var el = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!el) return;
      var self = this;
      var LABEL = { en: "EN", ja: "日本語", both: "EN+日本語" };
      var HINT = {
        en: "English — tap for 日本語",
        ja: "日本語 — タップで英語と日本語の併記",
        both: "併記中 — タップで英語のみ"
      };
      function paintBtn() {
        el.textContent = LABEL[mode];
        el.setAttribute("aria-label", HINT[mode]);
        el.setAttribute("title", HINT[mode]);
      }
      el.addEventListener("click", function () { self.toggle(); });
      this.onChange(paintBtn);
      paintBtn();
    }
  };
})();
