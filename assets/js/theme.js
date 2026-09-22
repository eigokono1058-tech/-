/* Shared light/dark toggle. Default comes from the page's data-theme attribute;
   a user choice is remembered in localStorage (guarded — private mode can throw). */
(function () {
  var KEY = "lm-theme";
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (saved === "light" || saved === "dark") {
    document.documentElement.setAttribute("data-theme", saved);
    paint(saved);
  }

  function paint(theme) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#f6f7fb" : "#0a0c12");
  }

  window.LMTheme = {
    current: function () {
      var attr = document.documentElement.getAttribute("data-theme");
      if (attr) return attr;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light" : "dark";
    },
    toggle: function () {
      var next = this.current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
      paint(next);
      return next;
    },
    bind: function (selector) {
      var btn = document.querySelector(selector || "#themeBtn");
      if (btn) btn.addEventListener("click", function () { window.LMTheme.toggle(); });
    }
  };
})();
