// A deliberately small Markdown subset, sized to what a market report needs:
// headings, paragraphs, lists, tables, blockquotes, links, bold and italic.
// It emits the site's own classes so posts inherit the design system.

import { escapeHtml } from "./html.mjs";

export function parseFrontMatter(source) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!m) return { data: {}, body: source };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    let value = kv[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (value === "true") data[kv[1]] = true;
    else if (value === "false") data[kv[1]] = false;
    else data[kv[1]] = value;
  }
  return { data, body: source.slice(m[0].length) };
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const external = /^https?:\/\//i.test(href);
      const rel = external ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${href}"${rel} style="border-bottom: 1px solid var(--bronze);">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderTable(rows) {
  const cells = (row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const head = header.map((c) => `<th scope="col">${inline(c)}</th>`).join("");
  const trs = body
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("")}</tr>`)
    .join("\n            ");
  return `<div class="table-scroll">\n          <table class="data-table">\n            <thead><tr>${head}</tr></thead>\n            <tbody>\n            ${trs}\n            </tbody>\n          </table>\n        </div>`;
}

export function renderMarkdown(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  const flushList = (ordered) => {
    const items = [];
    const bullet = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
    while (i < lines.length && bullet.test(lines[i])) {
      items.push(bullet.exec(lines[i])[1]);
      i += 1;
    }
    const tag = ordered ? "ol" : "ul";
    out.push(
      `<${tag}${ordered ? ' class="num-list"' : ""}>\n${items
        .map((it) => `          <li>${inline(it)}</li>`)
        .join("\n")}\n        </${tag}>`
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushList(false);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushList(true);
      continue;
    }

    if (/^\|.*\|$/.test(line.trim())) {
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        rows.push(lines[i].trim());
        i += 1;
      }
      if (rows.length >= 3) {
        out.push(renderTable(rows));
        continue;
      }
      out.push(`<p>${inline(rows.join(" "))}</p>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote class="quote"><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|\s*[-*]\s|\s*\d+[.)]\s|>|\|)/.test(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return out.join("\n        ");
}
