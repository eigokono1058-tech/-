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
    setText("role", isUnset(P.role) ? "" : t(P.role));
    setText("loc", t(P.location));
    setText("headline", t(P.headline));
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
          '<span class="link-txt"><b>' + esc(t(l.label)) + "</b><span>" + esc(t(l.sublabel)) + "</span></span>" +
          '<span class="chev">' + I.arrow + "</span></a>"
        );
      }).join("");
    }

    /* ---- project ---- */
    var proj = P.project || {};
    var projBox = $("project");
    if (projBox && proj.title) {
      projBox.innerHTML =
        '<span class="codename">' + esc(proj.codename || "PROJECT") + "</span>" +
        '<h2 id="projTitle">' + esc(t(proj.title)) + "</h2>" +
        "<p>" + esc(t(proj.summary)) + "</p>" +
        '<div class="project-links">' +
        (proj.links || []).map(function (l) {
          return '<a class="plink' + (l.cta ? " cta" : "") + '" href="' + esc(l.href) + '">' +
            (l.cta ? I.spark : I.arrow) + "<span>" + esc(t(l.label)) + "</span>" +
            (l.note ? '<span class="pnote">' + esc(t(l.note)) + "</span>" : "") + "</a>";
        }).join("") +
        "</div>";
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
