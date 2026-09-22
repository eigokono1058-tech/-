/* ==========================================================================
   最小限のMarkdownレンダラ
   plan/ 配下の自分の書いたドキュメントを表示するためだけのもの。
   対応: 見出し / 表 / リスト（1段ネスト） / コードブロック / 引用 / 水平線 /
         強調 / インラインコード / リンク
   ========================================================================== */
window.LM_MD = (function () {
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function inline(s) {
    var out = esc(s);
    // インラインコードを先に退避（中身をこの後の置換から守る）
    var codes = [];
    out = out.replace(/`([^`]+)`/g, function (m, c) {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, href) {
      var ext = /^https?:/i.test(href);
      return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + t + "</a>";
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    out = out.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return "<code>" + codes[parseInt(i, 10)] + "</code>";
    });
    return out;
  }

  function splitRow(line) {
    var t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return t.split("|").map(function (c) { return c.trim(); });
  }
  function isTableSep(line) {
    return /^\s*\|?[\s:-]*-[-\s:|]*\|?\s*$/.test(line) && line.indexOf("-") !== -1 && line.indexOf("|") !== -1;
  }

  function render(md) {
    var lines = md.replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // コードブロック
      if (/^```/.test(line.trim())) {
        var lang = line.trim().slice(3).trim();
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
        i++;
        html.push('<pre class="md-pre"' + (lang ? ' data-lang="' + esc(lang) + '"' : "") + "><code>" +
          esc(buf.join("\n")) + "</code></pre>");
        continue;
      }

      // 水平線
      if (/^\s*---+\s*$/.test(line)) { html.push("<hr>"); i++; continue; }

      // 見出し
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        var lvl = h[1].length;
        var id = "s" + html.length;
        html.push("<h" + lvl + ' id="' + id + '">' + inline(h[2]) + "</h" + lvl + ">");
        i++;
        continue;
      }

      // 表
      if (line.indexOf("|") !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var head = splitRow(line);
        i += 2;
        var body = [];
        while (i < lines.length && lines[i].trim().indexOf("|") !== -1 && lines[i].trim() !== "") {
          body.push(splitRow(lines[i]));
          i++;
        }
        html.push(
          '<div class="md-tblwrap"><table class="md-tbl"><thead><tr>' +
          head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" +
          body.map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
          }).join("") +
          "</tbody></table></div>"
        );
        continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        html.push('<blockquote class="md-quote">' + inline(q.join(" ")) + "</blockquote>");
        continue;
      }

      // リスト（1段ネストまで）
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        var ordered = /^\s*\d+\.\s+/.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          var indent = lines[i].match(/^\s*/)[0].length;
          var content = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
          items.push({ indent: indent, content: content });
          i++;
        }
        var base = items[0].indent;
        var buf2 = [];
        var open = false;
        items.forEach(function (it) {
          if (it.indent > base) {
            if (!open) { buf2.push("<ul>"); open = true; }
            buf2.push("<li>" + inline(it.content) + "</li>");
          } else {
            if (open) { buf2.push("</ul>"); open = false; }
            buf2.push("<li>" + inline(it.content) + "</li>");
          }
        });
        if (open) buf2.push("</ul>");
        html.push((ordered ? "<ol>" : "<ul>") + buf2.join("") + (ordered ? "</ol>" : "</ul>"));
        continue;
      }

      // 空行
      if (!line.trim()) { i++; continue; }

      // 段落
      var para = [];
      while (i < lines.length && lines[i].trim() &&
        !/^(#{1,4})\s/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
        !/^\s*>/.test(lines[i]) && !/^```/.test(lines[i].trim()) &&
        !/^\s*---+\s*$/.test(lines[i]) &&
        !(lines[i].indexOf("|") !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
        para.push(lines[i]);
        i++;
      }
      html.push("<p>" + inline(para.join("\n")).replace(/\n/g, "<br>") + "</p>");
    }
    return html.join("\n");
  }

  return { render: render };
})();
