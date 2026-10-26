// The shared page chrome for generated pages. The skip link, header, footer,
// font link and og:site_name come from lib/chrome.mjs, the same function that
// keeps the hand-written pages in step, so generated pages are
// indistinguishable from the rest of the site.

import { escapeHtml } from "./html.mjs";
import { SITE } from "./site-data.mjs";
import { applyChrome, buildFooter, buildHeader, fileOfCanonical, FONT_LINK, SCRIPT_TAG, SITE_NAME_META } from "./chrome.mjs";

export const HEAD_ASSETS = `  ${FONT_LINK}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#0a1620">
  <link rel="stylesheet" href="/css/kizlo.css">
  <link rel="stylesheet" href="/css/kizlo-pages.css">`;

// Unmarked copies (no aria-current); page() applies the per-page chrome.
export const HEADER = buildHeader("");

export const FOOTER = buildFooter("");

// The canonical closing band (rebuild plan §3); hand-written pages copy the same markup.
// `title` and `text` are plain text (escaped here); the default suits a market report.
export const CTA_DEFAULT = {
  title: "What do these numbers mean for your home?",
  text: "Averages describe a market, not your street. Tell us the address and we will tell you what these figures mean for it.",
};

export function ctaBand({ title, text } = CTA_DEFAULT) {
  return `    <section class="section cta-band" aria-labelledby="closing-title">
      <div class="wrap grid">
        <div class="reveal" style="grid-column: 1 / span 7;">
          <h2 id="closing-title" class="display">${escapeHtml(title)}</h2>
          <p>${escapeHtml(text)}</p>
        </div>
        <div class="cta-band__actions reveal" style="--i:1">
          <a class="btn" href="/home-valuation/">What’s my home worth?</a>
          <a class="arrow-link" href="tel:+18139923073">Call (813) 992-3073</a>
        </div>
      </div>
    </section>`;
}

export const CTA_BAND = ctaBand();

export function breadcrumbNav(trail) {
  const items = trail
    .map((crumb, i) =>
      i === trail.length - 1
        ? `        <li aria-current="page">${escapeHtml(crumb.name)}</li>`
        : `        <li><a href="${crumb.href}">${escapeHtml(crumb.name)}</a></li>`
    )
    .join("\n");
  return `    <nav class="breadcrumbs wrap" aria-label="Breadcrumb">\n      <ol>\n${items}\n      </ol>\n    </nav>`;
}

// `cta`: true for the default closing band, false for none, or { title, text }.
export function page({ lang = "en", title, description, canonical, ogImage, robots, extraHead = "", body, cta = true }) {
  const image = ogImage || `${SITE}/img/og-windermere-wide.jpg`;
  const closing = cta === false ? "" : cta === true ? CTA_BAND : ctaBand(cta);
  return applyChrome(fileOfCanonical(canonical), `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <script>document.documentElement.classList.add("js")</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
${robots ? `  <meta name="robots" content="${robots}">\n` : ""}  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${canonical.includes("/market-reports/") && !canonical.endsWith("/market-reports/") ? "article" : "website"}">
  ${SITE_NAME_META}
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="${image}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
${HEAD_ASSETS}
${extraHead}</head>
<body>

${HEADER}

  <main id="main">

${body}
${closing ? `\n${closing}\n` : ""}
  </main>

${FOOTER}

  ${SCRIPT_TAG}
</body>
</html>
`);
}
