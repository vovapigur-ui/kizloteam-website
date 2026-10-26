// Market reports: content/market-reports/*.md → /market-reports/ and one page
// per report. scripts/build.mjs calls these and writes the files; the field
// reference is content/market-reports/README.md.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

import { ROOT } from "./chrome.mjs";
import { escapeHtml } from "./html.mjs";
import { parseFrontMatter, renderMarkdown } from "./markdown.mjs";
import { SITE } from "./site-data.mjs";
import { breadcrumbNav, page } from "./template.mjs";

const CONTENT_DIR = join(ROOT, "content", "market-reports");

// `figures: value | label; value | label` and `tiles: slug | meta; slug | meta`.
function pairs(field, file, name) {
  if (!field) return [];
  return String(field)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const bar = entry.indexOf("|");
      if (bar === -1) throw new Error(`content/market-reports/${file}: ${name} entry "${entry}" needs "a | b"`);
      return [entry.slice(0, bar).trim(), entry.slice(bar + 1).trim()];
    });
}

export function loadPosts() {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    // `_`-prefixed files and the README are notes, not posts.
    .filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md")
    .map((file) => {
      const { data, body } = parseFrontMatter(readFileSync(join(CONTENT_DIR, file), "utf8"));
      const slug = data.slug || file.replace(/\.md$/, "");
      const missing = [];
      for (const key of ["title", "description", "date"]) if (!data[key]) missing.push(key);
      if (missing.length) throw new Error(`content/market-reports/${file}: missing front matter ${missing.join(", ")}`);
      const tiles = pairs(data.tiles, file, "tiles").map(([key, meta]) => {
        if (!AREAS[key]) throw new Error(`content/market-reports/${file}: unknown tile "${key}" (use ${Object.keys(AREAS).join(", ")})`);
        return { key, meta };
      });
      if (data.cover && !AREAS[data.cover]) throw new Error(`content/market-reports/${file}: unknown cover "${data.cover}"`);
      // `communities: windermere, horizon-west` limits which community pages list the report.
      // Left out, a report covers (and is linked from) all four.
      const communities = data.communities
        ? String(data.communities).split(",").map((c) => c.trim()).filter(Boolean)
        : Object.keys(AREAS);
      for (const c of communities) {
        if (!AREAS[c]) throw new Error(`content/market-reports/${file}: unknown community "${c}" (use ${Object.keys(AREAS).join(", ")})`);
      }
      return {
        file,
        slug,
        draft: data.draft === true,
        title: data.title,
        headline: data.headline || data.title,
        description: data.description,
        date: data.date,
        updated: data.updated || data.date,
        summary: data.summary || data.description,
        image: data.image || `${SITE}/img/og-windermere-wide.jpg`,
        cover: data.cover || null,
        communities,
        figures: pairs(data.figures, file, "figures").map(([value, label]) => ({ value, label })),
        tiles,
        body,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function postUrl(slug) {
  return `${SITE}/market-reports/${slug}/`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function monthYear(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// The community aerials a report can show: the index card (`cover:`) and the
// closing tiles (`tiles:`). Alts follow .impeccable/rebuild/PHOTO-MAP.md §4.
const AREAS = {
  windermere: { name: "Windermere", href: "/communities/windermere/", stem: "windermere-aerial", alt: "Aerial view of lakefront homes and private boat docks in Windermere, Florida" },
  "winter-garden": { name: "Winter Garden", href: "/communities/winter-garden/", stem: "winter-garden-aerial", alt: "Aerial view of a lakefront neighborhood near Winter Garden, Florida" },
  "horizon-west": { name: "Horizon West", href: "/communities/horizon-west/", stem: "horizon-west-aerial", alt: "Aerial view of new homes at sunset in Horizon West, Florida" },
  clermont: { name: "Clermont", href: "/communities/clermont/", stem: "clermont-aerial", alt: "Aerial view of homes and curving streets in Clermont, Lake County, Florida" },
};

// Width and height from a JPEG's frame header, so <img> always carries the
// file's real size even when the image pipeline re-encodes a rung.
function jpegSize(file) {
  const b = readFileSync(file);
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`${relative(ROOT, file)}: no JPEG frame header`);
}

// <picture> with AVIF and JPEG rungs for every /img/<stem>-<w> pair on disk,
// up to `max` wide. Lazy unless `eager`; an eager image is also fetched at high priority.
function picture(stem, { alt, sizes, max = Infinity, eager = false }) {
  const widths = readdirSync(join(ROOT, "img"))
    .map((f) => new RegExp(`^${stem}-(\\d+)\\.jpg$`).exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .filter((w) => w <= max && existsSync(join(ROOT, "img", `${stem}-${w}.avif`)))
    .sort((a, b) => a - b);
  if (!widths.length) throw new Error(`img/${stem}-<width>.jpg and .avif not found`);
  const top = widths[widths.length - 1];
  const { width, height } = jpegSize(join(ROOT, "img", `${stem}-${top}.jpg`));
  const set = (ext) => widths.map((w) => `/img/${stem}-${w}.${ext} ${w}w`).join(", ");
  const loading = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"><img src="/img/${stem}-${top}.jpg" srcset="${set("jpg")}" sizes="${sizes}" alt="${escapeHtml(alt)}" width="${width}" height="${height}"${loading} decoding="async"></picture>`;
}

const ARROW = '<svg class="area__go" width="28" height="12" viewBox="0 0 28 12" aria-hidden="true"><path d="m21 1 5 5-5 5M26 6H1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

// Splits a report body before its third "## " heading, so the inline call to
// action follows the first two sections (the summary and the at-a-glance table).
function splitBody(body) {
  const heads = [...body.matchAll(/^## .*$/gm)];
  if (heads.length < 3) return [body, ""];
  return [body.slice(0, heads[2].index), body.slice(heads[2].index)];
}

const INLINE_CTA = `          <aside class="inline-cta" aria-labelledby="street-title">
            <p class="inline-cta__title" id="street-title">What this means for your street</p>
            <p>A median describes a whole market. Send us your address and we will pull the Stellar MLS numbers for your street the same day.</p>
            <div class="signoff"><a class="btn" href="/home-valuation/">What’s my home worth?</a><a class="arrow-link" href="tel:+18139923073">Call (813) 992-3073</a></div>
          </aside>`;

export function renderPost(post, posts) {
  const trail = [
    { name: "Home", href: "/" },
    { name: "Market Reports", href: "/market-reports/" },
    { name: post.headline },
  ];
  const newest = posts[0];
  const newer =
    newest && newest !== post && newest.date > post.date
      ? `\n        <p class="micro">Newer: <a class="text-link" href="/market-reports/${newest.slug}/">${monthYear(newest.date)} West Orlando market report</a></p>`
      : "";
  // Every report with a predecessor links to it (posts run newest first).
  const prev = posts[posts.indexOf(post) + 1];
  const earlier = prev
    ? `\n        <p class="micro">Earlier: <a class="text-link" href="/market-reports/${prev.slug}/">${monthYear(prev.date)} West Orlando market report</a></p>`
    : "";
  // A date never breaks across lines in the byline.
  const nb = (text) => text.replace(/ /g, "\u00a0");
  const updated = post.updated !== post.date ? ` <span class="nowrap">·\u00a0Updated <time datetime="${post.updated}">${nb(longDate(post.updated))}</time></span>` : "";

  const stats = post.figures.length
    ? `

    <section class="night" aria-label="${escapeHtml(monthYear(post.date))} report in figures">
      <div class="wrap stats">
${post.figures
  .map(
    (f, i) =>
      `        <div class="stat reveal"${i ? ` style="--i:${i}"` : ""}><p class="stat__num">${escapeHtml(f.value)}</p><p class="stat__label">${escapeHtml(f.label)}</p></div>`
  )
  .join("\n")}
      </div>
    </section>`
    : "";

  const [lead, rest] = splitBody(post.body);
  const article = rest
    ? `          <div class="prose">
          ${renderMarkdown(lead)}
          </div>
${INLINE_CTA}
          <div class="prose">
          ${renderMarkdown(rest)}
          </div>`
    : `          <div class="prose">
          ${renderMarkdown(lead)}
          </div>`;

  const tiles = post.tiles.length
    ? `

    <section class="section section--tight" aria-labelledby="guides-title">
      <div class="wrap">
        <div class="section-head">
          <h2 id="guides-title" class="reveal">Community guides</h2>
          <a class="arrow-link reveal" style="--i:1" href="/communities/">All communities</a>
        </div>
        <div class="areas areas--four">
${post.tiles
  .map(({ key, meta }, i) => {
    const a = AREAS[key];
    return `          <a class="area reveal"${i ? ` style="--i:${i}"` : ""} href="${a.href}">
            ${picture(a.stem, { alt: a.alt, sizes: "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 25vw" })}
            <div class="area__body"><h3>${escapeHtml(a.name)}</h3><p class="area__meta"><span>${escapeHtml(meta)}</span>${ARROW}</p></div>
          </a>`;
  })
  .join("\n")}
        </div>
      </div>
    </section>`
    : "";

  const body = `${breadcrumbNav(trail)}

    <section class="page-hero" aria-labelledby="report-title">
      <div class="wrap">
        <h1 id="report-title">${escapeHtml(post.headline)}</h1>
        <p class="lede">${escapeHtml(post.summary)}</p>
        <p class="byline"><picture><source type="image/avif" srcset="/img/vlad-kizlo-480.avif"><img src="/img/vlad-kizlo-480.jpg" alt="Vlad Kizlo, team lead of The Kizlo Team" width="480" height="600" decoding="async"></picture><span class="byline__text">By <a href="/about/">Vlad Kizlo</a>, team lead <span class="nowrap">·\u00a0<time datetime="${post.date}">${nb(longDate(post.date))}</time></span>${updated}</span></p>${newer}${earlier}
      </div>
    </section>${stats}

    <section class="section section--tight">
      <div class="wrap grid">
        <div class="longread">
${article}
        </div>
      </div>
    </section>${tiles}`;

  return page({
    title: post.title,
    description: post.description,
    canonical: postUrl(post.slug),
    ogImage: post.image,
    body,
  });
}

// The newest month's report(s) get cards; everything older goes in the past reports list.
const monthOf = (iso) => iso.slice(0, 7);

function pastReports(past) {
  if (!past.length) return "";
  const items = past
    .map(
      (p) => `          <li><a class="text-link" href="/market-reports/${p.slug}/">${escapeHtml(p.headline)}</a> <span class="micro">· <time datetime="${p.date}">${longDate(p.date)}</time></span></li>`
    )
    .join("\n");
  return `

    <section class="section section--tight" aria-labelledby="past-reports-title">
      <div class="wrap">
        <h2 id="past-reports-title">Past reports</h2>
        <ul class="link-list">
${items}
        </ul>
      </div>
    </section>`;
}

/** The "market reports" block for a community page: every published report that covers `key`, newest first. */
export function communityReportsBlock(posts, key) {
  const area = AREAS[key];
  const mine = posts.filter((p) => p.communities.includes(key));
  if (!area || !mine.length) return "";
  const items = mine
    .map(
      (p) => `            <li><a class="text-link" href="/market-reports/${p.slug}/">${escapeHtml(p.headline)}</a> <span class="micro">· ${monthYear(p.date)}</span></li>`
    )
    .join("\n");
  return `<div class="wrap">
          <h2 id="reports-title">${area.name} market reports</h2>
          <p class="measure">Every monthly report that covers ${area.name}, newest first. <a class="text-link" href="/market-reports/">All market reports</a></p>
          <ul class="link-list">
${items}
          </ul>
        </div>`;
}

export function renderIndex(posts) {
  const trail = [{ name: "Home", href: "/" }, { name: "Market Reports" }];
  const newest = posts.length ? monthOf(posts[0].date) : null;
  const latest = posts.filter((p) => monthOf(p.date) === newest);
  const past = posts.filter((p) => monthOf(p.date) !== newest);
  const list = latest.length
    ? latest
        .map((p, i) => {
          const cover = p.cover
            ? `\n          <div class="frame">${picture(AREAS[p.cover].stem, { alt: AREAS[p.cover].alt, sizes: "(max-width: 600px) 100vw, 50vw", max: 960, eager: i === 0 })}</div>`
            : "";
          return `        <article class="card card--half">${cover}
          <div class="card__body">
            <p class="micro"><time datetime="${p.date}">${longDate(p.date)}</time></p>
            <h2 class="card__title"><a href="/market-reports/${p.slug}/">${escapeHtml(p.headline)}</a></h2>
            <p>${escapeHtml(p.summary)}</p>
            <p><a class="arrow-link" href="/market-reports/${p.slug}/">Read the report<span class="visually-hidden">: ${escapeHtml(p.headline)}</span></a></p>
          </div>
        </article>`;
        })
        .join("\n")
    : `        <div style="grid-column: 2 / span 8;">
          <p class="lede">The next report is being written. In the meantime, every community guide carries current medians for its own area.</p>
          <p style="margin-top: 2rem;"><a class="text-link" href="/communities/">Browse the community guides</a></p>
        </div>`;

  const body = `${breadcrumbNav(trail)}

    <section class="page-hero" aria-labelledby="reports-title">
      <div class="wrap">
        <h1 id="reports-title">West Orlando Housing Market Reports</h1>
        <p class="lede">Medians, inventory and days on market for Windermere, Winter Garden, Horizon West and Clermont, from Zillow, Redfin and the Orlando Regional REALTOR Association, written up in plain language. Ask us for the Stellar MLS numbers on your street.</p>
      </div>
    </section>

    <section class="section section--tight" aria-label="Latest reports">
      <div class="wrap editorial-grid">
${list}
      </div>
    </section>${pastReports(past)}`;

  return page({
    title: "West Orlando Housing Market Reports | The Kizlo Team",
    description:
      "Monthly Windermere, Winter Garden, Horizon West and Clermont housing market reports from The Kizlo Team. Medians, inventory and days on market, explained.",
    canonical: `${SITE}/market-reports/`,
    ogImage: `${SITE}/img/og-windermere-wide.jpg`,
    body,
    cta: {
      title: "Want the numbers for your street?",
      text: "These reports describe whole markets. Tell us the address and we will pull the Stellar MLS figures for your street the same day.",
    },
  });
}
