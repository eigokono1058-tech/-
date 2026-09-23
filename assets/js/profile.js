/* ==========================================================================
   プロフィールの描画 / Renders the profile hub from assets/js/profile-config.js
   --------------------------------------------------------------------------
   出力するマークアップはデジタル庁デザインシステム（DADS v2）のコンポーネント
   （Resource List / Chip Label / Notification Banner / Button / Heading）に合わせる。
   ここで独自のクラスを増やさない。レイアウトが必要なときだけ index.html 側の
   .p-* を使う。
   ========================================================================== */
(function () {
  var P = window.PROFILE || {};
  var I = window.ICONS || {};
  var I18N = window.LM_I18N;
  var PLACEHOLDER = "REPLACE_ME";

  var UI = {
    setupTitle: { ja: "セットアップが完了していません", en: "Setup is incomplete" },
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
    linksLabel: { ja: "リンク一覧", en: "Links" },
    newTab: { ja: "新規タブで開きます", en: "Opens in a new tab" },
    projectHeading: { ja: "いま作っているもの", en: "What I'm building" }
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
  function setHtml(id, html) {
    var node = $(id);
    if (node) node.innerHTML = html;
  }

  /* 併記モード用。長文は下にブロックで和訳を添える */
  function withAlt(value) {
    var b = I18N ? I18N.both(value) : { main: t(value), alt: "" };
    return esc(b.main) + (b.alt ? '<span class="p-alt-ja">' + esc(b.alt) + "</span>" : "");
  }
  /* 併記モード用。短い語句は同じ行に「 / 和訳」を足す */
  function withAltInline(value) {
    var b = I18N ? I18N.both(value) : { main: t(value), alt: "" };
    return esc(b.main) + (b.alt ? " / " + esc(b.alt) : "");
  }

  /* 外部リンクであることを示すDADSのアイコン */
  var EXTERNAL_ICON =
    '<svg class="dads-link__icon" width="16" height="16" viewBox="0 0 16 17" fill="currentcolor" aria-hidden="true">' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M3 13.5H13V9.16667H14V14.5H2V2.5H7.33333V3.5H3V13.5ZM9.33333 3.5V2.5H14V7.16667H13V4.23333L7 10.1667L6.33333 9.5L12.2667 3.5H9.33333Z"/></svg>';

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
        nick.textContent = lang() === "en"
          ? " · " + t(UI.callMe) + P.nickname
          : "・「" + P.nickname + "」" + t(UI.callMe);
      } else {
        nick.textContent = "";
      }
    }
    setHtml("role", isUnset(P.role) ? "" : withAltInline(P.role));
    setText("loc", t(P.location));
    setHtml("headline", withAlt(P.headline));
    setText("footName", "© " + new Date().getFullYear() + " " +
      (isUnset(P.name) ? (isUnset(P.nameJa) ? "" : P.nameJa) : P.name));

    var avatar = $("avatar");
    if (avatar) {
      if (P.avatar && !isUnset(P.avatar)) {
        avatar.innerHTML = '<img src="' + esc(P.avatar) + '" alt="" width="96" height="96">';
      } else {
        var src = isUnset(P.name) ? "" : P.name;
        var initials = src.split(/[\s・]+/).filter(Boolean).slice(0, 2)
          .map(function (w) { return w[0].toUpperCase(); }).join("");
        avatar.textContent = initials || "LM";
      }
    }

    /* ---- タグ：DADS Chip Label ---- */
    var tagBox = $("tags");
    if (tagBox) {
      tagBox.innerHTML = (I18N ? I18N.list(P.tags) : P.tags || []).map(function (x) {
        return '<li><span class="dads-chip-label" data-style="outlined" data-color="blue">' +
          esc(x) + "</span></li>";
      }).join("");
    }

    /* ---- リンク：DADS Resource List ---- */
    var unsetLinks = [];
    visible = [];
    (P.links || []).forEach(function (l) {
      if (isUnset(l.url)) { unsetLinks.push(t(l.label)); } else { visible.push(l); }
    });
    if (P.email && !isUnset(P.email)) {
      visible.push({
        id: "email", label: UI.email, sublabel: P.email,
        url: "mailto:" + P.email, icon: "mail"
      });
    }

    var linkBox = $("links");
    if (linkBox) {
      linkBox.setAttribute("aria-label", t(UI.linksLabel));
      linkBox.innerHTML = visible.map(function (l) {
        var href = t(l.url); // url は文字列でも {ja, en} でもよい
        var external = /^https?:/i.test(href);
        return (
          "<li>" +
          '<div class="dads-resource-list" data-style="frame">' +
          '<a class="dads-resource-list__body" href="' + esc(href) + '"' +
          (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
          (I[l.icon] || I.link) +
          '<div class="dads-resource-list__contents">' +
          '<span class="dads-resource-list__title">' + withAltInline(l.label) +
          (external ? EXTERNAL_ICON + '<span class="dads-u-visually-hidden">' + t(UI.newTab) + "</span>" : "") +
          "</span>" +
          '<div class="dads-resource-list__support"><p>' + withAltInline(l.sublabel) + "</p></div>" +
          "</div></a></div></li>"
        );
      }).join("");
    }

    /* ---- プロジェクト ---- */
    // projects: [...] が本来の形。古い project: {...} も一応受け付ける
    var projects = P.projects || (P.project ? [P.project] : []);
    var projBox = $("projects");
    if (projBox) {
      projBox.innerHTML =
        '<div class="dads-heading" data-size="20" data-chip style="margin-block-end: calc(16 / 16 * 1rem);">' +
        '<h2 id="project-heading" class="dads-heading__heading">' + esc(t(UI.projectHeading)) + "</h2></div>" +
        projects.map(function (proj) {
          return '<div class="p-card" data-tone="key">' +
            '<p class="p-project__codename">' + esc(proj.codename || "PROJECT") + "</p>" +
            (proj.badge
              ? '<span class="dads-chip-label" data-style="filled-1" data-color="green">' +
                esc(t(proj.badge)) + "</span>"
              : "") +
            '<h3 class="dads-u-std-20B-150 u-mt-8 u-mb-8">' + withAltInline(proj.title) + "</h3>" +
            "<p>" + withAlt(proj.summary) + "</p>" +
            '<ul class="p-project__links">' +
            (proj.links || []).map(function (l) {
              var ext = /^https?:/i.test(l.href);
              return "<li><a class='p-project__link'" + (l.cta ? " data-cta" : "") +
                ' href="' + esc(l.href) + '"' +
                (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
                "<span>" + withAltInline(l.label) + "</span>" +
                (l.note ? '<span class="p-project__link-note">' + withAltInline(l.note) + "</span>" : "") +
                "</a></li>";
            }).join("") +
            "</ul></div>";
        }).join("");
    }

    /* ---- セットアップ未完了の通知：DADS Notification Banner ---- */
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
          '<div class="dads-notification-banner" data-style="standard" data-type="warning">' +
          '<h2 class="dads-notification-banner__heading">' +
          '<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="警告">' +
          '<path d="M12 2 1.5 20.5h21L12 2Zm0 5 7 12.5H5L12 7Zm-1 3.5v4h2v-4h-2Zm0 5.5v2h2v-2h-2Z" fill="currentcolor"/></svg>' +
          '<span class="dads-notification-banner__heading-text">' + esc(t(UI.setupTitle)) + "</span></h2>" +
          '<div class="dads-notification-banner__body">' +
          "<p>" + (lang() === "en" ? "Not set: " : "未設定: ") +
          esc(parts.join(lang() === "en" ? " and " : " と ")) + (lang() === "en" ? "." : "。") + "</p>" +
          "<p>" + t(UI.setupBody) + "</p><p>" + t(UI.setupQr) + "</p>" +
          "</div></div>";
      } else {
        banner.innerHTML = "";
      }
    }
  }

  /* ---------- トースト ---------- */
  var toast = $("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.setAttribute("data-show", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.removeAttribute("data-show"); }, 2400);
  }

  // 実際のURLを優先する（QRシートの表示と実体をずらさないため）
  var liveUrl = location.href.replace(/index\.html$/, "").replace(/[?#].*$/, "");
  var shareUrl = /^https?:/.test(liveUrl) ? liveUrl : (P.siteUrl || liveUrl);

  /* ---------- QRダイアログ（<dialog> なのでフォーカストラップは標準機能） ---------- */
  var dialog = $("qrDialog");
  var qrUrl = $("qrUrl");
  if (qrUrl) qrUrl.textContent = shareUrl;
  var qrImg = $("qrImg");
  if (qrImg) qrImg.setAttribute("alt", lang() === "en"
    ? "QR code linking to this page" : "このページへのQRコード");

  var qrBtn = $("qrBtn");
  if (qrBtn && dialog) {
    qrBtn.addEventListener("click", function () {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute("open", "");
    });
  }
  var qrClose = $("qrClose");
  if (qrClose && dialog) {
    qrClose.addEventListener("click", function () {
      if (dialog.close) dialog.close();
      else dialog.removeAttribute("open");
    });
  }
  if (dialog) {
    // 背景（::backdrop）をクリックしたら閉じる
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  }

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
    shareBtn.classList.remove("u-hidden");
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
    vcardBtn.classList.remove("u-hidden");
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

  if (I18N) {
    I18N.mountToggle("#langBtn");
    I18N.onChange(render);
  }
  render();
})();
