// Pull the facts that already exist in the rendered page. Nothing here invents
// content: if a question, review or breadcrumb is not visible on the page, it
// does not end up in the structured data.

import { attr, decodeEntities, extractBlocks, textOf } from "./html.mjs";
import { SITE } from "./site-data.mjs";

export function canonicalOf(html) {
  const m = /<link\b[^>]*\brel="canonical"[^>]*>/i.exec(html);
  return m ? attr(m[0], "href") : null;
}

export function langOf(html) {
  const m = /<html\b[^>]*>/i.exec(html);
  return m ? attr(m[0], "lang") : null;
}

export function titleOf(html) {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]).trim() : null;
}

export function absolute(href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  return `${SITE}${href.startsWith("/") ? "" : "/"}${href}`;
}

// <nav class="breadcrumbs wrap"> <ol> <li><a href="/">Home</a></li> ... </ol> </nav>
export function breadcrumbs(html) {
  const navs = extractBlocks(html, "nav", '<nav\\b[^>]*class="[^"]*\\bbreadcrumbs\\b[^"]*"[^>]*>');
  if (navs.length === 0) return null;
  const items = extractBlocks(navs[0].inner, "li", "<li\\b[^>]*>");
  if (items.length === 0) return null;

  return items.map((li, i) => {
    const link = /<a\b[^>]*>/i.exec(li.inner);
    const entry = {
      "@type": "ListItem",
      position: i + 1,
      name: textOf(li.inner),
    };
    // The current page is the last crumb and carries no link; schema.org lets
    // the final ListItem omit `item`, which is what Google expects.
    const href = link ? absolute(attr(link[0], "href")) : null;
    if (href) entry.item = href;
    return entry;
  });
}

function question(name, text) {
  if (!name || !text) return null;
  return { "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } };
}

// The site renders FAQs two ways, so both are read:
//   1. <details class="faq-item"><summary>Q</summary><div class="faq-body"><p>A</p></div></details>
//   2. <ol class="num-list"><li><div><h3>Q</h3><p>A</p></div></li></ol>
// Anything else is not a question, and gets no markup.
export function faqs(html) {
  const out = [];

  for (const block of extractBlocks(html, "details", '<details\\b[^>]*class="[^"]*\\bfaq-item\\b[^"]*"[^>]*>')) {
    const summary = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(block.inner);
    const body = extractBlocks(block.inner, "div", '<div\\b[^>]*class="[^"]*\\bfaq-body\\b[^"]*"[^>]*>');
    if (!summary || body.length === 0) continue;
    const q = question(textOf(summary[1]), textOf(body[0].inner));
    if (q) out.push(q);
  }

  for (const item of extractBlocks(html, "li", "<li\\b[^>]*>")) {
    const heading = /<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(item.inner);
    if (!heading) continue;
    const name = textOf(heading[1]);
    // A heading only counts as a question if it reads as one.
    if (!/[?？]$/.test(name)) continue;
    const answer = item.inner.slice(heading.index + heading[0].length);
    const q = question(name, textOf(answer));
    if (q) out.push(q);
  }

  const seen = new Set();
  return out.filter((q) => (seen.has(q.name) ? false : seen.add(q.name)));
}

const MONTHS = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

// "Christian G. Stone · Buyer & landlord · July 2026"
function parseReviewMeta(meta) {
  const parts = meta.split("·").map((s) => s.trim()).filter(Boolean);
  const author = parts[0] || null;
  let datePublished = null;
  for (const part of parts) {
    const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(part);
    if (m && MONTHS[m[1].toLowerCase()]) {
      datePublished = `${m[2]}-${MONTHS[m[1].toLowerCase()]}`;
      break;
    }
  }
  return { author, datePublished };
}

// <article class="review"><p class="review__text">…</p><p class="review__meta">…</p></article>
export function reviews(html) {
  const blocks = extractBlocks(html, "article", '<article\\b[^>]*class="[^"]*\\breview\\b[^"]*"[^>]*>');
  const out = [];
  for (const block of blocks) {
    const text = /<p\b[^>]*class="[^"]*\breview__text\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block.inner);
    const meta = /<p\b[^>]*class="[^"]*\breview__meta\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block.inner);
    if (!text || !meta) continue;
    const { author, datePublished } = parseReviewMeta(textOf(meta[1]));
    if (!author) continue;
    const review = {
      "@type": "Review",
      author: { "@type": "Person", name: author },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody: textOf(text[1]),
    };
    if (datePublished) review.datePublished = datePublished;
    out.push(review);
  }
  return out;
}

export function images(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => ({
    tag: m[0],
    src: attr(m[0], "src"),
    alt: attr(m[0], "alt"),
  }));
}
