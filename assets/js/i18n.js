/* ==========================================================================
   言語切り替え / Language switching (en | ja | both)
   --------------------------------------------------------------------------
   3モード:
     en    英語のみ（既定。DevDayで相手に見せるとき）
     ja    日本語のみ
     both  英語＋日本語の併記（あとから自分で内容を確認するとき）

   優先順位 / precedence:  ?lang=  >  保存された選択  >  DEFAULT_LANG

   UIはデジタル庁デザインシステムの Language Selector
   （Menu List Box + Menu List）に準拠する。キーボード操作（↑↓/Home/End/Esc）と
   aria-expanded / aria-current も公式実装に合わせている。

   静的な文章は [data-l="ja"] / [data-l="en"] を並べて置き、使わない側をCSSで隠す。
   JSが生成する文字列は {ja: "...", en: "..."} を LM_I18N.t() に渡す。

   This file must load in <head>, before the body paints.
   ========================================================================== */
(function () {
  var KEY = "lm-lang";
  var DEFAULT_LANG = "en"; // "en" | "ja" | "both" | "auto"
  var MODES = ["en", "ja", "both"];
  var listeners = [];
  var seq = 0;

  var LABEL = { en: "English", ja: "日本語", both: "English + 日本語" };
  var SHORT = { en: "EN", ja: "日本語", both: "EN+日本語" };

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

  /* 併記したときに英語が先に来るよう、隣り合う [data-l] の組を並べ替える。 */
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
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  onReady(normalizeOrder);

  /* ---------- DADS Language Selector ---------- */
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svg(attrs, path) {
    var s = document.createElementNS(SVG_NS, "svg");
    for (var k in attrs) if (attrs.hasOwnProperty(k)) s.setAttribute(k, attrs[k]);
    var p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", path);
    s.appendChild(p);
    return s;
  }
  var GLOBE_PATH = "M12 21.5A9.5 9.5 0 0 1 2.5 12c0-5.2 4.3-9.5 9.5-9.5s9.6 4.3 9.5 9.5c0 5.2-4.3 9.5-9.5 9.5Zm0-1.5c1-1.3 1.7-2.8 2.1-4.3H10c.4 1.5 1 3 2.1 4.3Zm-2-.3c-.8-1.2-1.4-2.6-1.7-4H5c1 2 3 3.5 5.2 4Zm4 0c2.2-.5 4-2 5-4h-3.3c-.4 1.4-1 2.8-1.8 4Zm-9.7-5.5H8a13 13 0 0 1 0-4.4H4.3a8 8 0 0 0 0 4.4Zm5.2 0h5c.2-1.5.2-3 0-4.4h-5c-.2 1.5-.2 3 0 4.4Zm6.5 0h3.7a8 8 0 0 0 0-4.4H16c.2 1.5.2 3 0 4.4Zm-.3-5.9H19c-1-2-3-3.5-5.2-4 .8 1.2 1.4 2.6 1.8 4Zm-5.8 0H14A12 12 0 0 0 12 4a12 12 0 0 0-2.1 4.3Zm-5 0h3.4c.4-1.4 1-2.8 1.8-4-2.3.5-4.1 2-5.2 4Z";
  var ARROW_PATH = "m20.5 6.6-8 8-8-8L3.1 8l9.4 9.4L21.9 8l-1.4-1.4Z";
  var CHECK_PATH = "m9.5 18-5.7-5.7 1.5-1.4 4.2 4.3L18.7 6l1.4 1.4L9.5 18Z";

  /**
   * DADSのLanguage Selectorを描画する。
   * @param {string|Element} target 置き換える要素（またはセレクタ）
   */
  function mountSelector(target) {
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;

    var id = "lang-selector-" + (++seq);
    var root = document.createElement("div");
    root.className = "dads-language-selector";

    var boxEl = document.createElement("div");
    boxEl.className = "dads-menu-list-box";

    var opener = document.createElement("button");
    opener.className = "dads-menu-list-box__opener";
    opener.type = "button";
    opener.id = id + "-opener";
    opener.setAttribute("data-size", "sm");
    opener.setAttribute("data-style", "outlined");
    opener.setAttribute("data-text-weight", "normal");
    opener.setAttribute("aria-controls", id + "-popup");
    opener.setAttribute("aria-expanded", "false");
    opener.setAttribute("aria-label", "表示言語を選ぶ / Choose display language");

    var globe = svg({
      class: "dads-menu-list-box__opener-icon", width: "24", height: "24",
      viewBox: "0 0 24 24", fill: "currentcolor", "aria-hidden": "true"
    }, GLOBE_PATH);
    var openerLabel = document.createElement("span");
    openerLabel.textContent = SHORT[mode];
    var arrow = svg({
      class: "dads-menu-list-box__opener-arrow", width: "16", height: "16",
      viewBox: "0 0 24 24", fill: "currentcolor", "aria-hidden": "true"
    }, ARROW_PATH);
    opener.appendChild(globe);
    opener.appendChild(openerLabel);
    opener.appendChild(arrow);

    var popup = document.createElement("div");
    popup.className = "dads-menu-list-box__popup";
    popup.id = id + "-popup";
    popup.hidden = true;

    var list = document.createElement("ul");
    list.className = "dads-menu-list";
    var items = [];

    MODES.forEach(function (m) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "dads-menu-list__item";
      a.href = "#";
      a.setAttribute("data-type", "box");
      a.setAttribute("data-size", "regular");
      a.setAttribute("lang", m === "ja" ? "ja" : "en");
      if (m !== "both") a.setAttribute("hreflang", m);
      if (m === mode) {
        a.setAttribute("data-current", "");
        a.setAttribute("aria-current", "true");
      }
      a.appendChild(svg({
        class: "dads-menu-list__front-icon dads-language-selector__check",
        width: "24", height: "24", viewBox: "0 0 24 24",
        fill: "currentcolor", "aria-hidden": "true"
      }, CHECK_PATH));
      var label = document.createElement("span");
      label.className = "dads-menu-list__label";
      label.textContent = LABEL[m];
      a.appendChild(label);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        close();
        opener.focus();
        api.set(m);
      });
      li.appendChild(a);
      list.appendChild(li);
      items.push(a);
    });

    popup.appendChild(list);
    boxEl.appendChild(opener);
    boxEl.appendChild(popup);
    root.appendChild(boxEl);
    host.replaceWith(root);

    var open = false;
    function setOpen(next) {
      open = next;
      popup.hidden = !next;
      opener.setAttribute("aria-expanded", next ? "true" : "false");
    }
    function close() { if (open) setOpen(false); }
    function focusItem(i) {
      if (!items.length) return;
      var n = (i + items.length) % items.length;
      items[n].focus();
    }
    function currentIndex() { return items.indexOf(document.activeElement); }

    opener.addEventListener("click", function (e) {
      e.preventDefault();
      setOpen(!open);
      if (open) focusItem(Math.max(0, MODES.indexOf(mode)));
    });
    opener.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (!open) setOpen(true); focusItem(0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (!open) setOpen(true); focusItem(items.length - 1); }
    });
    list.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); focusItem(currentIndex() + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(currentIndex() - 1); }
      else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
      else if (e.key === "End") { e.preventDefault(); focusItem(items.length - 1); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) { close(); opener.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (open && !root.contains(e.target)) close();
    });
    root.addEventListener("focusout", function (e) {
      if (open && !root.contains(e.relatedTarget)) close();
    });

    api.onChange(function () {
      openerLabel.textContent = SHORT[mode];
      items.forEach(function (a, i) {
        if (MODES[i] === mode) { a.setAttribute("data-current", ""); a.setAttribute("aria-current", "true"); }
        else { a.removeAttribute("data-current"); a.removeAttribute("aria-current"); }
      });
    });
  }

  var api = {
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

    /** 併記モードのときだけ、もう一方の言語も返す。戻り値は {main, alt}。 */
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

    toggle: function () {
      return this.set(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    },

    onChange: function (fn) { listeners.push(fn); },

    /** DADSのLanguage Selectorとして描画する */
    mountToggle: function (selector) { onReady(function () { mountSelector(selector); }); }
  };

  window.LM_I18N = api;
})();
