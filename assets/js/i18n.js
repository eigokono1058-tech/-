/* ==========================================================================
   LAST METERS — 言語切り替え / Language switching (ja | en)
   --------------------------------------------------------------------------
   優先順位 / precedence:  ?lang=en  >  保存された選択  >  ブラウザの言語
   静的な文章は [data-l="ja"] / [data-l="en"] を並べて置き、
   使わない側をCSSで隠す（JSの再描画が要らないので切り替えが速い）。
   JSが生成する文字列は {ja: "...", en: "..."} を LM_I18N.t() に渡す。

   This file must load in <head>, before the body paints.
   ========================================================================== */
(function () {
  var KEY = "lm-lang";
  var listeners = [];

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function fromQuery() {
    var m = /[?&]lang=(ja|en)\b/i.exec(location.search);
    return m ? m[1].toLowerCase() : null;
  }
  function fromBrowser() {
    var n = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    return n.indexOf("ja") === 0 ? "ja" : "en";
  }

  var lang = fromQuery() || (function (s) { return s === "ja" || s === "en" ? s : null; })(stored()) || fromBrowser();
  document.documentElement.setAttribute("lang", lang);

  window.LM_I18N = {
    get lang() { return lang; },

    /** {ja,en} でも素の文字列でも受け取れる */
    t: function (value) {
      if (value == null) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        if (value[lang] != null) return value[lang];
        if (value.ja != null) return value.ja;
        if (value.en != null) return value.en;
      }
      return String(value);
    },

    /** 配列版（tags などのリスト） */
    list: function (value) {
      if (!value) return [];
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return value[lang] || value.ja || value.en || [];
    },

    set: function (next) {
      if (next !== "ja" && next !== "en") return lang;
      lang = next;
      document.documentElement.setAttribute("lang", lang);
      try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
      for (var i = 0; i < listeners.length; i++) listeners[i](lang);
      return lang;
    },

    toggle: function () { return this.set(lang === "ja" ? "en" : "ja"); },

    onChange: function (fn) { listeners.push(fn); },

    /** 切り替えボタンを描画する（中身は現在の言語ではなく「切り替え先」を出す） */
    mountToggle: function (selector) {
      var el = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!el) return;
      var self = this;
      function paint() {
        el.textContent = lang === "ja" ? "EN" : "日本語";
        el.setAttribute("aria-label", lang === "ja" ? "Switch to English" : "日本語に切り替える");
        el.setAttribute("title", el.getAttribute("aria-label"));
      }
      el.addEventListener("click", function () { self.toggle(); });
      this.onChange(paint);
      paint();
    }
  };
})();
