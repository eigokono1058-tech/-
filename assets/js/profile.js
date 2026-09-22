/* Renders the profile hub from assets/js/profile-config.js */
(function () {
  var P = window.PROFILE || {};
  var I = window.ICONS || {};
  var PLACEHOLDER = "REPLACE_ME";

  function isUnset(v) { return !v || String(v).indexOf(PLACEHOLDER) !== -1; }
  function text(el, v, fallback) {
    var node = document.getElementById(el);
    if (!node) return;
    node.textContent = isUnset(v) ? (fallback || "") : v;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- hero ---------- */
  var displayName = isUnset(P.nameJa) ? (isUnset(P.name) ? "お名前を設定してください" : P.name) : P.nameJa;
  text("nameJa", displayName, displayName);
  text("nameRoman", P.name, "");
  text("role", P.role, "");
  text("loc", P.location, "");
  text("headline", P.headline, "");
  text("footName", "© " + new Date().getFullYear() + " " + (isUnset(P.name) ? (isUnset(P.nameJa) ? "" : P.nameJa) : P.name));

  var avatar = document.getElementById("avatar");
  if (avatar) {
    if (P.avatar && !isUnset(P.avatar)) {
      avatar.innerHTML = '<img src="' + esc(P.avatar) + '" alt="">';
    } else {
      var src = isUnset(P.name) ? "" : P.name;
      var initials = src
        .split(/[\s・]+/).filter(Boolean).slice(0, 2)
        .map(function (w) { return w[0].toUpperCase(); }).join("");
      avatar.textContent = initials || "LM";
    }
  }

  var tagBox = document.getElementById("tags");
  if (tagBox && P.tags) {
    tagBox.innerHTML = P.tags.map(function (t) {
      return '<span class="pill">' + esc(t) + "</span>";
    }).join("");
  }

  /* ---------- links ---------- */
  var linkBox = document.getElementById("links");
  var unsetLinks = [];
  var visible = [];
  (P.links || []).forEach(function (l) {
    if (isUnset(l.url)) { unsetLinks.push(l.label); } else { visible.push(l); }
  });

  if (P.email && !isUnset(P.email)) {
    visible.push({
      id: "email", label: "Email", sublabel: P.email,
      url: "mailto:" + P.email, icon: "mail", accent: "#8b9dc3"
    });
  }

  if (linkBox) {
    linkBox.innerHTML = visible.map(function (l) {
      var external = /^https?:/i.test(l.url);
      return (
        '<a class="link-row' + (l.featured ? " featured" : "") + '" href="' + esc(l.url) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ' style="--accent:' + esc(l.accent || "#5b8cff") + '" data-id="' + esc(l.id) + '">' +
        '<span class="link-ico">' + (I[l.icon] || I.link) + "</span>" +
        '<span class="link-txt"><b>' + esc(l.label) + "</b><span>" + esc(l.sublabel || "") + "</span></span>" +
        '<span class="chev">' + I.arrow + "</span></a>"
      );
    }).join("");
  }

  /* ---------- project ---------- */
  var proj = P.project || {};
  var projBox = document.getElementById("project");
  if (projBox && proj.title) {
    projBox.innerHTML =
      '<span class="codename">' + esc(proj.codename || "PROJECT") + "</span>" +
      '<h2 id="projTitle">' + esc(proj.title) + "</h2>" +
      "<p>" + esc(proj.summary || "") + "</p>" +
      '<div class="project-links">' +
      (proj.links || []).map(function (l) {
        return '<a class="plink' + (l.cta ? " cta" : "") + '" href="' + esc(l.href) + '">' +
          (l.cta ? I.spark : I.arrow) + "<span>" + esc(l.label) + "</span>" +
          (l.note ? '<span class="pnote">' + esc(l.note) + "</span>" : "") + "</a>";
      }).join("") +
      "</div>";
  }

  /* ---------- setup banner ---------- */
  var missingBasics = ["name", "nameJa", "role"].filter(function (k) { return isUnset(P[k]); });
  var banner = document.getElementById("setupBanner");
  if (banner && (missingBasics.length || unsetLinks.length)) {
    var parts = [];
    if (missingBasics.length) parts.push("基本情報 " + missingBasics.length + "項目（" + missingBasics.join(", ") + "）");
    if (unsetLinks.length) parts.push("リンク " + unsetLinks.length + "件（" + unsetLinks.join(" / ") + "）");
    banner.innerHTML =
      '<div class="setup"><b>⚙ セットアップ未完了</b><br>' +
      "未設定: " + parts.join(" と ") + "。<br>" +
      "<code>assets/js/profile-config.js</code> を編集してください。未設定のリンクは表示されません。" +
      "<br>URLを変えたら <code>python3 tools/gen_qr.py</code> でQRを作り直してください。</div>";
  }

  /* ---------- actions ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.setAttribute("data-show", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.removeAttribute("data-show"); }, 1900);
  }

  // The live URL wins over the configured one, so the QR sheet always matches reality.
  var liveUrl = location.href.replace(/index\.html$/, "").replace(/[?#].*$/, "");
  var shareUrl = /^https?:/.test(liveUrl) ? liveUrl : (P.siteUrl || liveUrl);

  var sheet = document.getElementById("qrSheet");
  var qrUrl = document.getElementById("qrUrl");
  if (qrUrl) qrUrl.textContent = shareUrl;

  function openSheet(open) {
    if (!sheet) return;
    sheet.setAttribute("data-open", open ? "true" : "false");
  }
  var qrBtn = document.getElementById("qrBtn");
  if (qrBtn) qrBtn.addEventListener("click", function () { openSheet(true); });
  var qrClose = document.getElementById("qrClose");
  if (qrClose) qrClose.addEventListener("click", function () { openSheet(false); });
  if (sheet) {
    sheet.addEventListener("click", function (e) { if (e.target === sheet) openSheet(false); });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") openSheet(false); });

  var copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var done = function () { showToast("URLをコピーしました"); };
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
        try { document.execCommand("copy"); done(); } catch (e) { showToast("コピーできませんでした"); }
        document.body.removeChild(ta);
      }
    });
  }

  var shareBtn = document.getElementById("shareBtn");
  if (shareBtn && navigator.share) {
    shareBtn.classList.remove("hidden");
    shareBtn.addEventListener("click", function () {
      navigator.share({
        title: (isUnset(P.name) ? "Profile" : P.name),
        text: isUnset(P.headline) ? "" : P.headline,
        url: shareUrl
      }).catch(function () { /* user cancelled */ });
    });
  }

  /* ---------- vCard ---------- */
  var vcardBtn = document.getElementById("vcardBtn");
  if (vcardBtn && P.enableVCard && !isUnset(P.name)) {
    vcardBtn.classList.remove("hidden");
    vcardBtn.addEventListener("click", function () {
      var roleParts = isUnset(P.role) ? [] : String(P.role).split(/\s*\/\s*/);
      var title = roleParts[0] || "";
      var org = roleParts[1] || "";
      var lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "FN:" + P.name,
        "N:" + P.name.split(/\s+/).reverse().join(";") + ";;;",
        isUnset(P.nameJa) ? null : "NOTE:" + P.nameJa + " / " + (isUnset(P.headline) ? "" : P.headline),
        title ? "TITLE:" + title : null,
        org ? "ORG:" + org : null,
        P.email ? "EMAIL;TYPE=INTERNET:" + P.email : null,
        "URL:" + shareUrl
      ];
      visible.forEach(function (l) {
        if (/^https?:/.test(l.url)) lines.push("URL;TYPE=" + l.id + ":" + l.url);
      });
      lines.push("END:VCARD");
      var body = lines.filter(Boolean).join("\r\n") + "\r\n";
      var blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (isUnset(P.name) ? "contact" : P.name.replace(/\s+/g, "-").toLowerCase()) + ".vcf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      showToast("連絡先カードを書き出しました");
    });
  }

  if (window.LMTheme) window.LMTheme.bind("#themeBtn");
})();
