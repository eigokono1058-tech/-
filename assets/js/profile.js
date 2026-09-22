/* Renders the profile hub from assets/js/profile-config.js (ja / en) */
(function () {
  var P = window.PROFILE || {};
  var I = window.ICONS || {};
  var I18N = window.LM_I18N;
  var PLACEHOLDER = "REPLACE_ME";

  var UI = {
    setupTitle: { ja: "⚙ セットアップ未完了", en: "⚙ Setup incomplete" },
    setupBasics: { ja: "基本情報", en: "profile fields" },
    setupLinks: { ja: "リンク", en: "links" },
    setupItems: { ja: "項目", en: "" },
    setupCount: { ja: "件", en: "" },
    setupBody: {
      ja: "<code>assets/js/profile-config.js</code> を編集してください。未設定のリンクは表示されません。",
      en: "Edit <code>assets/js/profile-config.js</code>. Links left unset are hidden from visitors."
    },
    setupQr: {
      ja: "URLを変えたら <code>python3 tools/gen_qr.py</code> でQRを作り直してください。",
      en: "If you change the URL, regenerate the QR with <code>python3 tools/gen_qr.py</code>."
    },
    noName: { ja: "お名前を設定してください", en: "Set your name in the config" },
    callMe: { ja: "と呼んでください", en: "Call me " },
    email: { ja: "Email", en: "Email" },
    copied: { ja: "URLをコピーしました", en: "URL copied" },
    copyFail: { ja: "コピーできませんでした", en: "Could not copy" },
    vcardDone: { ja: "連絡先カードを書き出しました", en: "Contact card downloaded" },
    linksLabel: { ja: "リンク一覧", en: "Links" }
  };

  function t(v) { return I18N ? I18N.t(v) : (typeof v === "string" ? v : (v && v.ja) || ""); }
  function lang() { return I18N ? I18N.lang : "ja"; }
  function isUnset(v) {
    if (!v) return true;
    var s = typeof v === "string" ? v : JSON.stringify(v);
    return s.indexOf(PLACEHOLDER) !== -1;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function setText(id, value) {
    var node = $(id);
    if (node) node.textContent = value || "";
  }

  /* 併記モード用。長文は下にブロックで和訳を添える */
  function withAlt(value) {
    var b = I18N ? I18N.both(value) : { main: t(value), alt: "" };
    return esc(b.main) + (b.alt ? '<span class="alt-ja">' + esc(b.alt) + "</span>" : "");
  }
  /* 併記モード用。短い語句は同じ行に「 / 和訳」を足す */
  function withAltInline(value) {
    var b = I18N ? I18N.both(value) : { main: t(value), alt: "" };
    return esc(b.main) + (b.alt ? ' <span class="faint">/ ' + esc(b.alt) + "</span>" : "");
  }
  function setHtml(id, html) {
    var node = $(id);
    if (node) node.innerHTML = html;
  }

  /* 表示名：日本語なら和名を大きく、英語ならローマ字を大きく出す */
  function names() {
    var roman = isUnset(P.name) ? "" : P.name;
    var ja = isUnset(P.nameJa) ? "" : P.nameJa;
    if (lang() === "en") {
      return { primary: roman || ja || t(UI.noName), secondary: roman && ja ? ja : "" };
    }
    return { primary: ja || roman || t(UI.noName), secondary: roman };
  }

  var visible = [];

  function render() {
    var nm = names();
    setText("nameJa", nm.primary);
    setText("nameRoman", nm.secondary);

    var nick = $("nick");
    if (nick) {
      if (P.nickname && !isUnset(P.nickname)) {
        nick.innerHTML = '<span class="nick-chip">' +
          (lang() === "en" ? esc(t(UI.callMe)) + esc(P.nickname) : "「" + esc(P.nickname) + "」" + esc(t(UI.callMe))) +
          "</span>";
      } else {
        nick.innerHTML = "";
      }
    }
    setHtml("role", isUnset(P.role) ? "" : withAltInline(P.role));
    setText("loc", t(P.location));
    setHtml("headline", withAlt(P.headline));
    setText("footName", "© " + new Date().getFullYear() + " " + (isUnset(P.name) ? (isUnset(P.nameJa) ? "" : P.nameJa) : P.name));

    var avatar = $("avatar");
    if (avatar) {
      if (P.avatar && !isUnset(P.avatar)) {
        avatar.innerHTML = '<img src="' + esc(P.avatar) + '" alt="">';
      } else {
        var src = isUnset(P.name) ? "" : P.name;
        var initials = src.split(/[\s・]+/).filter(Boolean).slice(0, 2)
          .map(function (w) { return w[0].toUpperCase(); }).join("");
        avatar.textContent = initials || "LM";
      }
    }

    var tagBox = $("tags");
    if (tagBox) {
      tagBox.innerHTML = (I18N ? I18N.list(P.tags) : P.tags || []).map(function (x) {
        return '<span class="pill">' + esc(x) + "</span>";
      }).join("");
    }

    /* ---- links ---- */
    var unsetLinks = [];
    visible = [];
    (P.links || []).forEach(function (l) {
      if (isUnset(l.url)) { unsetLinks.push(t(l.label)); } else { visible.push(l); }
    });
    if (P.email && !isUnset(P.email)) {
      visible.push({
        id: "email", label: UI.email, sublabel: P.email,
        url: "mailto:" + P.email, icon: "mail", accent: "#8b9dc3"
      });
    }

    var linkBox = $("links");
    if (linkBox) {
      linkBox.setAttribute("aria-label", t(UI.linksLabel));
      linkBox.innerHTML = visible.map(function (l) {
        var href = t(l.url); // url は文字列でも {ja, en} でもよい
        var external = /^https?:/i.test(href);
        return (
          '<a class="link-row' + (l.featured ? " featured" : "") + '" href="' + esc(href) + '"' +
          (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
          ' style="--accent:' + esc(l.accent || "#5b8cff") + '" data-id="' + esc(l.id) + '">' +
          '<span class="link-ico">' + (I[l.icon] || I.link) + "</span>" +
          '<span class="link-txt"><b>' + withAltInline(l.label) + "</b><span>" + withAltInline(l.sublabel) + "</span></span>" +
          '<span class="chev">' + I.arrow + "</span></a>"
        );
      }).join("");
    }

    /* ---- projects ---- */
    // projects: [...] が本来の形。古い project: {...} も一応受け付ける
    var projects = P.projects || (P.project ? [P.project] : []);
    var projBox = $("projects");
    if (projBox) {
      projBox.innerHTML = projects.map(function (proj, idx) {
        var external = function (href) { return /^https?:/i.test(href); };
        return '<section class="project' + (idx === 0 ? " is-lead" : "") + '">' +
          '<div class="row spread" style="align-items:flex-start;gap:10px">' +
          '<span class="codename">' + esc(proj.codename || "PROJECT") + "</span>" +
          (proj.badge ? '<span class="pill nowrap">' + esc(t(proj.badge)) + "</span>" : "") +
          "</div>" +
          "<h2>" + withAltInline(proj.title) + "</h2>" +
          "<p>" + withAlt(proj.summary) + "</p>" +
          '<div class="project-links">' +
          (proj.links || []).map(function (l) {
            return '<a class="plink' + (l.cta ? " cta" : "") + '" href="' + esc(l.href) + '"' +
              (external(l.href) ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
              (l.cta ? I.spark : I.arrow) + "<span>" + withAltInline(l.label) + "</span>" +
              (l.note ? '<span class="pnote">' + withAltInline(l.note) + "</span>" : "") + "</a>";
          }).join("") +
          "</div></section>";
      }).join("");
    }

    /* ---- setup banner ---- */
    var missingBasics = ["name", "nameJa", "role"].filter(function (k) { return isUnset(P[k]); });
    var banner = $("setupBanner");
    if (banner) {
      if (missingBasics.length || unsetLinks.length) {
        var parts = [];
        if (missingBasics.length) {
          parts.push(lang() === "en"
            ? missingBasics.length + " profile fields (" + missingBasics.join(", ") + ")"
            : "基本情報 " + missingBasics.length + "項目（" + missingBasics.join(", ") + "）");
        }
        if (unsetLinks.length) {
          parts.push(lang() === "en"
            ? unsetLinks.length + " links (" + unsetLinks.join(" / ") + ")"
            : "リンク " + unsetLinks.length + "件（" + unsetLinks.join(" / ") + "）");
        }
        banner.innerHTML =
          '<div class="setup"><b>' + t(UI.setupTitle) + "</b><br>" +
          (lang() === "en" ? "Not set: " : "未設定: ") +
          parts.join(lang() === "en" ? " and " : " と ") + (lang() === "en" ? "." : "。") + "<br>" +
          t(UI.setupBody) + "<br>" + t(UI.setupQr) + "</div>";
      } else {
        banner.innerHTML = "";
      }
    }
  }

  /* ---------- actions ---------- */
  var toast = $("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.setAttribute("data-show", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.removeAttribute("data-show"); }, 1900);
  }

  // 実際のURLを優先する（QRシートの表示と実体をずらさないため）
  var liveUrl = location.href.replace(/index\.html$/, "").replace(/[?#].*$/, "");
  var shareUrl = /^https?:/.test(liveUrl) ? liveUrl : (P.siteUrl || liveUrl);

  var sheet = $("qrSheet");
  var qrUrl = $("qrUrl");
  if (qrUrl) qrUrl.textContent = shareUrl;

  function openSheet(open) {
    if (sheet) sheet.setAttribute("data-open", open ? "true" : "false");
  }
  var qrBtn = $("qrBtn");
  if (qrBtn) qrBtn.addEventListener("click", function () { openSheet(true); });
  var qrClose = $("qrClose");
  if (qrClose) qrClose.addEventListener("click", function () { openSheet(false); });
  if (sheet) sheet.addEventListener("click", function (e) { if (e.target === sheet) openSheet(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") openSheet(false); });

  var copyBtn = $("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var done = function () { showToast(t(UI.copied)); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(done, fallbackCopy);
      } else { fallbackCopy(); }
      function fallbackCopy() {
        var ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { showToast(t(UI.copyFail)); }
        document.body.removeChild(ta);
      }
    });
  }

  var shareBtn = $("shareBtn");
  if (shareBtn && navigator.share) {
    shareBtn.classList.remove("hidden");
    shareBtn.addEventListener("click", function () {
      navigator.share({
        title: isUnset(P.name) ? "Profile" : P.name,
        text: t(P.headline),
        url: shareUrl
      }).catch(function () { /* cancelled */ });
    });
  }

  /* ---------- vCard ---------- */
  var vcardBtn = $("vcardBtn");
  if (vcardBtn && P.enableVCard && !isUnset(P.name)) {
    vcardBtn.classList.remove("hidden");
    vcardBtn.addEventListener("click", function () {
      var roleParts = isUnset(P.role) ? [] : String(t(P.role)).split(/\s*\/\s*/);
      var title = roleParts[0] || "";
      var org = roleParts[1] || "";
      var lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "FN:" + P.name,
        P.nickname && !isUnset(P.nickname) ? "NICKNAME:" + P.nickname : null,
        "N:" + P.name.split(/\s+/).reverse().join(";") + ";;;",
        isUnset(P.nameJa) ? null : "NOTE:" + P.nameJa + " / " + t(P.headline),
        title ? "TITLE:" + title : null,
        org ? "ORG:" + org : null,
        P.email ? "EMAIL;TYPE=INTERNET:" + P.email : null,
        "URL:" + shareUrl
      ];
      visible.forEach(function (l) {
        var href = t(l.url);
        if (/^https?:/.test(href)) lines.push("URL;TYPE=" + l.id + ":" + href);
      });
      lines.push("END:VCARD");
      var blob = new Blob([lines.filter(Boolean).join("\r\n") + "\r\n"], { type: "text/vcard;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (isUnset(P.name) ? "contact" : P.name.replace(/\s+/g, "-").toLowerCase()) + ".vcf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      showToast(t(UI.vcardDone));
    });
  }

  if (window.LMTheme) window.LMTheme.bind("#themeBtn");
  if (I18N) {
    I18N.mountToggle("#langBtn");
    I18N.onChange(render);
  }
  render();
})();
