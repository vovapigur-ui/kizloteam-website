// Content rules for scripts/check.mjs: quotes are verbatim reviews, report
// markup matches the page, each photo once per page and one hero per shot,
// and fair-housing wording. check.mjs passes its parsed pages and reporters.

import { reviews } from "./extract.mjs";
import { decodeEntities, extractBlocks, textOf } from "./html.mjs";

export function checkContent({ pages, graphs, fail, warn }) {
  const nodeOf = (file, type) => (graphs.get(file) || []).find((n) => n["@type"] === type);

  /* ---------------- 16. quotes are verbatim client reviews (#181, #220) */

  // Every blockquote and every data-quotes "q" outside /reviews/ must be an exact
  // run of a .review__text on /reviews/, after normalizing whitespace and quote
  // marks. "…" (or "...") marks a cut and "[…]" a substitution, so "[Vlad] was
  // always timely" matches "He was always timely". A named attribution must be
  // that reviewer: same first name, same last initial.
  {
    const norm = (t) =>
      decodeEntities(t)
        .replace(/[‘’‚′]/g, "'")
        .replace(/[“”„″]/g, '"')
        .replace(/ /g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const strip = (t) => norm(t).replace(/^["']+|["']+$/g, "").trim();
    const reviewHtml = pages.get("reviews/index.html") || "";
    const source = reviews(reviewHtml).map((r) => ({ name: r.author.name, text: norm(r.reviewBody) }));
    const nameMatches = (quoted, full) => {
      const q = quoted.replace(/\./g, "").split(/\s+/).filter(Boolean);
      const f = full.replace(/\./g, "").split(/\s+/).filter(Boolean);
      if (!q.length || !f.length || q[0].toLowerCase() !== f[0].toLowerCase()) return false;
      return q.length === 1 || q[q.length - 1][0].toLowerCase() === f[f.length - 1][0].toLowerCase();
    };
    const verify = (file, quote, attribution) => {
      const pieces = strip(quote)
        .split(/…|\.\.\.|\[[^\]]*\]/)
        .map((x) => x.trim().replace(/^[,;:]\s*/, ""))
        .filter((x) => x.length > 1);
      if (!pieces.length) return;
      const match = source.find((r) => {
        let at = 0;
        for (const piece of pieces) {
          const i = r.text.indexOf(piece, at);
          if (i === -1) return false;
          at = i + piece.length;
        }
        return true;
      });
      const short = strip(quote).slice(0, 70);
      if (!match) {
        fail(file, `quote is not a verbatim run of any review on /reviews/: "${short}…"`);
        return;
      }
      const name = attribution ? norm(attribution).split("·")[0].trim() : "";
      if (name && !nameMatches(name, match.name)) {
        fail(file, `quote "${short}…" is attributed to ${name}, but it is ${match.name}'s review`);
      }
    };
    for (const [file, html] of pages) {
      if (file === "reviews/index.html") continue;
      for (const fig of html.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>\s*(?:<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>)?/gi)) {
        verify(file, textOf(fig[1]), fig[2] ? textOf(fig[2]) : "");
      }
      for (const m of html.matchAll(/data-quotes='([^']*)'/g)) {
        let list;
        try {
          list = JSON.parse(m[1]);
        } catch (err) {
          fail(file, `data-quotes is not valid JSON: ${err.message}`);
          continue;
        }
        for (const item of list) verify(file, decodeEntities(String(item.q || "")), decodeEntities(String(item.a || "")));
      }
    }
  }

  /* --------------------- 17. BlogPosting markup matches the report page */

  for (const [file, html] of pages) {
    const post = nodeOf(file, "BlogPosting");
    if (!post) continue;
    const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    if (!h1 || textOf(h1[1]) !== post.headline) fail(file, `BlogPosting headline "${post.headline}" is not the visible h1`);
    const times = [...html.matchAll(/<time datetime="([^"]+)"/g)].map((m) => m[1]);
    if (!times.includes(post.datePublished)) fail(file, `BlogPosting datePublished ${post.datePublished} is not shown on the page`);
    if (post.dateModified !== post.datePublished && !times.includes(post.dateModified)) {
      fail(file, `BlogPosting dateModified ${post.dateModified} is not shown on the page`);
    }
    const author = (graphs.get(file) || []).find((n) => n["@id"] === post.author?.["@id"]);
    if (!author || author["@type"] !== "Person" || !author.name) fail(file, "BlogPosting author is not a named Person node on the page");
    else if (!textOf(html).includes(author.name)) fail(file, `BlogPosting author ${author.name} is not named on the page`);
  }

  /* ------------------- 18. photo use: once per page, one hero per shot */

  // A source shot is one family across its width rungs, art-directed crops and
  // og copies (.impeccable/rebuild/PHOTO-MAP.md §5): windermere-wide and
  // windermere-aerial are one shot, and so are winter-garden-wide and -aerial.
  // Warnings, not failures: Decision 4 keeps one known repeat on the home page.
  {
    const familyOf = (src) => {
      if (!src) return null;
      const path = src.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
      if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(path)) return null;
      let m;
      if (/^\/media\/hero-lake-/.test(path) || path === "/img/og-home.jpg") return "hero-lake";
      if ((m = /^\/img\/(?:portrait\/|og-)?(windermere|winter-garden)-(?:wide|aerial)\b/.exec(path))) return m[1];
      if ((m = /^\/img\/(?:portrait\/|og-)?(horizon-west-aerial|horizon-west-home|clermont-aerial|team-portrait|vlad-kizlo|anastasiia-zbihla)\b/.exec(path))) return m[1];
      if ((m = /^\/img\/(3625|8291)\/(.+?)(?:-\d+)?\.[a-z]+$/i.exec(path))) return `${m[1]}-${m[2]}`;
      if ((m = /^\/img\/portrait\/(3625|8291)-(.+?)(?:-\d+)?\.[a-z]+$/i.exec(path))) return `${m[1]}-${m[2]}`;
      if ((m = /^\/(3625)-waters-edge\/img\/(.+?)(?:-\d+)?\.[a-z]+$/i.exec(path))) return `3625-${m[2]}`;
      if ((m = /^\/(8291)-procida-isle\/img\/(.+?)(?:-\d+)?\.[a-z]+$/i.exec(path))) return `8291-${m[2]}`;
      return path.replace(/^.*\//, "").replace(/\.[a-z0-9]+$/i, "").replace(/-\d+$/, "");
    };
    const srcOf = (tag) => {
      const src = (/\bsrc="([^"]*)"/.exec(tag) || [])[1];
      if (src) return src;
      return ((/\bsrcset="([^"]*)"/.exec(tag) || [])[1] || "").split(",")[0].trim().split(/\s+/)[0];
    };
    const OUT = /^(open-house|studio|3625-waters-edge|8291-procida-isle|listings)\//;
    const heroes = new Map();
    for (const [file, html] of pages) {
      if (OUT.test(file)) continue;
      const main = (/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) || [, html])[1];
      const count = new Map();
      for (const m of main.matchAll(/<img\b[^>]*>/gi)) {
        const fam = familyOf(srcOf(m[0]));
        if (fam) count.set(fam, (count.get(fam) || 0) + 1);
      }
      for (const [fam, n] of count) if (n > 1) warn(`${file}: photo "${fam}" appears ${n} times on one page (Decision 2: once per page)`);
      for (const cls of ["hero__media", "page-hero__img", "page-hero__portrait"]) {
        for (const block of extractBlocks(main, "div", `<div\\b[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`)) {
          const img = /<img\b[^>]*>/i.exec(block.inner);
          const fam = img && familyOf(srcOf(img[0]));
          if (!fam) continue;
          if (!heroes.has(fam)) heroes.set(fam, []);
          if (!heroes.get(fam).includes(file)) heroes.get(fam).push(file);
        }
      }
    }
    for (const [fam, files] of heroes) {
      if (files.length > 1) warn(`photo "${fam}" is the hero on ${files.length} pages (one hero per shot): ${files.join(", ")}`);
    }
  }

  /* ------------------------- 19. fair-housing wording (HUD advertising) */

  // Describe the property and the place, never the buyer: familial status and
  // age are protected, and "safe" or "perfect for" wording steers. Warnings for
  // a human to rewrite, since a match can be innocent ("perfect for a pool").
  {
    const RISK = [
      /\bfamilies who\b/i,
      /\bfamily[- ]friendly\b/i,
      /\byoung (families|couples|professionals)\b/i,
      /\bretirees\b/i,
      /\bempty nesters\b/i,
      /\bsafe (neighbou?rhoods?|areas?|communit(y|ies))\b/i,
      /\bexclusive (neighbou?rhoods?|communit(y|ies)|enclaves?|areas?)\b/i,
      /\bperfect for\b/i,
      /\bwho [\w\u2019' -]{1,40}? fits\b/i, // "Who it fits" sections describe the buyer, not the place
    ];
    for (const [file, html] of pages) {
      const main = (/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) || [, ""])[1];
      const text = textOf(main);
      for (const re of RISK) {
        for (const m of text.matchAll(new RegExp(re.source, "gi"))) {
          const at = m.index;
          warn(`${file}: fair-housing wording "${m[0]}": …${text.slice(Math.max(0, at - 50), at + m[0].length + 40)}…`);
        }
      }
    }
  }
}
