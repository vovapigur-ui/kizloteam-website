// Minimal, dependency-free HTML helpers.
// The site is hand-written static HTML with a very regular structure, so
// targeted extraction beats pulling in a parser we would then have to ship.

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  middot: "·",
  deg: "°",
  times: "×",
  reg: "®",
  copy: "©",
};

export function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const key = body.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key] : whole;
  });
}

// Strip tags and collapse whitespace, so markup structure never leaks into
// the JSON-LD text we emit.
export function textOf(html) {
  return decodeEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Returns the inner HTML of every element matching an opening-tag pattern,
// counting nested same-name tags so we stop at the right closing tag.
export function extractBlocks(html, tagName, openTagPattern) {
  const out = [];
  const opener = new RegExp(openTagPattern, "gi");
  const scanner = new RegExp(`<${tagName}\\b[^>]*>|</${tagName}>`, "gi");
  let match;
  while ((match = opener.exec(html)) !== null) {
    const start = match.index + match[0].length;
    scanner.lastIndex = start;
    let depth = 1;
    let step;
    while ((step = scanner.exec(html)) !== null) {
      depth += step[0][1] === "/" ? -1 : 1;
      if (depth === 0) {
        out.push({ inner: html.slice(start, step.index), start: match.index, end: scanner.lastIndex });
        break;
      }
    }
  }
  return out;
}

export function attr(tagHtml, name) {
  const m = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tagHtml);
  return m ? decodeEntities(m[1]) : null;
}

export function headOf(html) {
  const m = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  return m ? m[1] : "";
}
