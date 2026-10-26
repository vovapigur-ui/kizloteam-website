// The site chrome: the single writer of the skip link, header and footer,
// the head font links, og:site_name, the early html.js class script and the
// kizlo.js tag on every page built on the 2026 design system (every page that
// links /css/kizlo.css).
//
// Hand-written pages carry copies of scripts/lib/partials/*.html. This module
// rewrites those copies from the partials, so editing a partial and running
// `node scripts/sync-chrome.mjs` (or `npm run build`) updates every page, and
// template.mjs builds the generated pages through the same function.
//
// Per page it also:
//   - marks the nav link whose href is the longest prefix of the page path
//     with aria-current="page" (Communities on every /communities/* page);
//   - drops the footer's home-value link on /home-valuation/ itself;
//   - on <html lang="uk"> marks the English chrome lang="en", swaps the
//     language links to English and loads the Cyrillic display face.
//
// Idempotent: running it on its own output changes nothing.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PARTIALS = join(ROOT, "scripts", "lib", "partials");

// Self-hosted web fonts (fonts/, @font-face at the top of css/kizlo.css, font-display: swap).
// Both files are latin subsets cut from the OFL variable fonts to weights 400 to 600, with
// Bodoni pinned to the optical size the whole stylesheet forces ("opsz" 28), so they render
// exactly as the Google Fonts request they replace. The preloads start both downloads with
// the HTML instead of after a third party stylesheet, which was the headline's (the LCP's)
// longest wait on a phone.
export const FONT_FILES = ["/fonts/bodoni-moda-latin.woff2", "/fonts/jost-latin.woff2"];
const fontPreload = (href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`;
/** The font preload lines, joined with `indent` so the head keeps its indentation. */
export const fontLinks = (indent = "  ") => FONT_FILES.map(fontPreload).join(`\n${indent}`);
export const FONT_LINK = fontLinks();
// Anything that was ever written as the font block: the old Google Fonts link or the preloads.
const FONT_BLOCK = /([ \t]*)(?:<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Bodoni\+Moda[^"]*" rel="stylesheet">|<link rel="preload" href="\/fonts\/bodoni-moda-latin\.woff2"[^>]*>\n[ \t]*<link rel="preload" href="\/fonts\/jost-latin\.woff2"[^>]*>)/;
const GOOGLE_PRECONNECT = /[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"(?: crossorigin)?>\n/g;
// Cyrillic Didone for Ukrainian headings (lang="uk" pages only).
export const UK_FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..600&display=swap" rel="stylesheet">';
export const SITE_NAME_META = '<meta property="og:site_name" content="The Kizlo Team">';
export const SCRIPT_TAG = '<script src="/js/kizlo.js" defer></script>';
// Set before first paint: the transparent header and the phone menu overlay are
// scoped under html.js, so without it a page falls back to the no-JS header.
export const JS_CLASS_TAG = '<script>document.documentElement.classList.add("js")</script>';

const EN_LANG_LINK = '<a class="nav-lang" href="/" lang="en" hreflang="en">EN<span class="visually-hidden"> English</span></a>';
const EN_MORE_LINK = '<a href="/" lang="en" hreflang="en">English</a>';

// Never touched: the internal tools and the single-listing sites keep their
// own chrome. They do not link kizlo.css today; this is the second guard.
const OUT_OF_SCOPE = /^(open-house|studio|3625-waters-edge|8291-procida-isle|listings)\//;

const partial = (name) => readFileSync(join(PARTIALS, name), "utf8").replace(/\n+$/, "");

/** "about/index.html" → "/about/", "index.html" → "/", "404.html" → "/404.html". */
export function pagePath(file) {
  const rel = (isAbsolute(file) ? relative(ROOT, file) : file).split(sep).join("/").replace(/^\.\//, "");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

/** "https://www.kizloteam.com/market-reports/x/" → "market-reports/x/index.html". */
export function fileOfCanonical(canonical) {
  const path = new URL(canonical).pathname;
  return path.endsWith("/") ? `${path.slice(1)}index.html` : path.slice(1);
}

const NAV_RE = /<nav class="site-nav" id="nav"[\s\S]*?<\/nav>/;
const hrefOf = (tag) => (/\bhref="([^"]*)"/.exec(tag) || [])[1];

/** The nav href that is the longest prefix of `path` ("/" never matches), or null. */
export function currentNavHref(headerHtml, path) {
  const nav = NAV_RE.exec(headerHtml);
  if (!nav) return null;
  let best = null;
  for (const m of nav[0].matchAll(/<a\b[^>]*>/g)) {
    const href = hrefOf(m[0]);
    if (!href || !href.startsWith("/") || href === "/" || !path.startsWith(href)) continue;
    if (!best || href.length > best.length) best = href;
  }
  return best;
}

function markCurrent(header, path) {
  const current = currentNavHref(header, path);
  if (!current) return header;
  return header.replace(NAV_RE, (nav) =>
    nav.replace(/<a\b[^>]*>/g, (tag) =>
      hrefOf(tag) === current && !tag.includes("aria-current") ? tag.replace(/>$/, ' aria-current="page">') : tag
    )
  );
}

export function buildHeader(path, { solid = false, uk = false } = {}) {
  let html = partial("header.html").replace("{{HEADER_MOD}}", solid ? " site-header--solid" : "");
  if (uk) {
    html = html
      .replace('<a class="skip-link" href="#main">', '<a class="skip-link" href="#main" lang="en">')
      .replace(/<header class="([^"]*)">/, '<header class="$1" lang="en">')
      .replace(/<a class="nav-lang"[^>]*>[\s\S]*?<\/a>/, EN_LANG_LINK)
      .replace(/(<p class="nav-more__links">[\s\S]*?)<a href="\/ukrainian-realtor-orlando\/"[^>]*>[\s\S]*?<\/a>/, `$1${EN_MORE_LINK}`);
  }
  return markCurrent(html, path);
}

export function buildFooter(path, { uk = false } = {}) {
  let html = partial("footer.html");
  // The page itself is the valuation form, so the footer does not send you to it.
  if (path === "/home-valuation/") {
    html = html.replace(/\n[ \t]*<li><a class="arrow-link[^"]*" href="\/home-valuation\/"[^>]*>[\s\S]*?<\/a><\/li>/, "");
  }
  if (uk) html = html.replace('<footer class="site-footer">', '<footer class="site-footer" lang="en">');
  return html;
}

const lineStart = (html, i) => html.lastIndexOf("\n", i - 1) + 1;

function replaceHead(html, uk) {
  let out = html;
  if (!/classList\.add\(["']js["']\)/.test(out)) {
    out = out.replace(/([ \t]*)(<meta charset="UTF-8">)/i, (_m, indent, tag) => `${indent}${tag}\n${indent}${JS_CLASS_TAG}`);
  }
  if (FONT_BLOCK.test(out)) out = out.replace(FONT_BLOCK, (_m, indent) => `${indent}${fontLinks(indent)}`);
  else out = out.replace(/([ \t]*)(<link rel="stylesheet" href="\/css\/kizlo\.css">)/, (_m, indent, css) => `${indent}${fontLinks(indent)}\n${indent}${css}`);

  // Only the Ukrainian pages still reach Google Fonts (Playfair Display for Cyrillic).
  if (uk) {
    if (!out.includes(UK_FONT_LINK)) out = out.replace(FONT_LINK, () => `${FONT_LINK}\n  ${UK_FONT_LINK}`);
  } else {
    out = out.replace(GOOGLE_PRECONNECT, "");
  }
  if (!out.includes('property="og:site_name"')) {
    out = out.replace(/([ \t]*)(<meta property="og:type"[^>]*>)/, (_m, indent, tag) => `${indent}${tag}\n${indent}${SITE_NAME_META}`);
  }
  return out;
}

/** Returns `html` with the site chrome applied for the page at `file` (path relative to the repo, or absolute). */
export function applyChrome(file, html) {
  const path = pagePath(file);
  const uk = /<html\b[^>]*\blang="uk"/.test(html);
  let out = replaceHead(html, uk);

  // Skip link + header.
  const hs = out.indexOf('<header class="site-header');
  if (hs === -1) throw new Error(`${file}: no <header class="site-header"> to replace`);
  const he = out.indexOf("</header>", hs) + "</header>".length;
  const solid = /^<header class="site-header[^"]*\bsite-header--solid\b/.test(out.slice(hs, he));
  const body = out.search(/<body\b[^>]*>/);
  const skip = out.lastIndexOf('<a class="skip-link"', hs);
  const start = lineStart(out, skip > body && body !== -1 ? skip : hs);
  out = out.slice(0, start) + buildHeader(path, { solid, uk }) + out.slice(he);

  // Footer.
  const fs = out.indexOf('<footer class="site-footer');
  if (fs === -1) throw new Error(`${file}: no <footer class="site-footer"> to replace`);
  const fe = out.indexOf("</footer>", fs) + "</footer>".length;
  out = out.slice(0, lineStart(out, fs)) + buildFooter(path, { uk }) + out.slice(fe);

  // Behaviour script.
  if (!out.includes(SCRIPT_TAG)) {
    if (out.includes('<script src="/js/main.js" defer></script>')) out = out.replace('<script src="/js/main.js" defer></script>', SCRIPT_TAG);
    else out = out.replace(/([ \t]*)<\/body>/, (_m, indent) => `  ${SCRIPT_TAG}\n${indent}</body>`);
  }
  return out;
}

/** The chrome-managed pages: every .html file that links /css/kizlo.css. */
export function chromeFiles(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules" || entry === "scripts" || entry === "content") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...chromeFiles(full));
    else if (entry.endsWith(".html")) {
      const rel = relative(ROOT, full).split(sep).join("/");
      if (OUT_OF_SCOPE.test(rel)) continue;
      if (readFileSync(full, "utf8").includes('href="/css/kizlo.css"')) out.push(rel);
    }
  }
  return out.sort();
}

/** Applies the chrome to every managed page. Returns the files that changed. */
export function syncChrome({ write = true } = {}) {
  const changed = [];
  for (const file of chromeFiles()) {
    const full = join(ROOT, file);
    const original = readFileSync(full, "utf8");
    const html = applyChrome(file, original);
    if (html !== original) {
      changed.push(file);
      if (write) writeFileSync(full, html);
    }
  }
  return changed;
}
