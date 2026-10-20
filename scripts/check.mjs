#!/usr/bin/env node
// The gate. Everything here is a fact about the committed files, so a green
// run means the deployed site is consistent with itself.
//
//   npm run check

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { applyChrome, chromeFiles, currentNavHref, pagePath } from "./lib/chrome.mjs";
import { breadcrumbs, canonicalOf, faqs, images, langOf, reviews, titleOf } from "./lib/extract.mjs";
import { textOf } from "./lib/html.mjs";
import { checkContent } from "./lib/content-rules.mjs";
import { AGENCY_ID, ANALYTICS, ANASTASIIA_ID, HREFLANG_CLUSTERS, NO_ANALYTICS, RATING, SITE, SKIP, VLAD_ID } from "./lib/site-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOME_TITLE = "Windermere & Winter Garden Realtors | The Kizlo Team";

const failures = [];
const warnings = [];
const notes = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);
const warn = (message) => warnings.push(message);

function htmlFiles(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules" || entry === "scripts" || entry === "content") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(relative(ROOT, full));
  }
  return out.sort();
}

const files = htmlFiles().filter((f) => !SKIP.has(f));
const pages = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));

// Listing pages carry their own RealEstateListing JSON-LD and are skipped by
// build.mjs, so the generator's schema shape is not expected of them. Every
// other check (consent, footer, skip link) still applies.
const listingPages = new Set(
  [...pages].filter(([, h]) => /"RealEstateListing"/.test(h) && !h.includes("<!-- schema:start")).map(([f]) => f)
);

/* ------------------------------------------------- 1. JSON-LD parses */

const graphs = new Map();
for (const [file, html] of pages) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (blocks.length === 0) {
    fail(file, "no JSON-LD block");
    continue;
  }
  if (blocks.length > 1) fail(file, `${blocks.length} JSON-LD blocks, expected 1`);
  try {
    const parsed = JSON.parse(blocks[0][1]);
    if (listingPages.has(file)) {
      if (parsed["@type"] !== "RealEstateListing") fail(file, "listing page JSON-LD is not a RealEstateListing");
      continue;
    }
    if (!Array.isArray(parsed["@graph"])) fail(file, "JSON-LD has no @graph array");
    graphs.set(file, parsed["@graph"] || []);
  } catch (err) {
    fail(file, `JSON-LD does not parse: ${err.message}`);
  }
}

const nodeOf = (file, type) => (graphs.get(file) || []).find((n) => n["@type"] === type);

/* ------------------------------- 2. site-wide agency on every page */

for (const file of files) {
  if (listingPages.has(file)) continue;
  const agencyNode = nodeOf(file, "RealEstateAgent");
  if (!agencyNode) {
    fail(file, "missing site-wide RealEstateAgent node");
    continue;
  }
  if (agencyNode["@id"] !== AGENCY_ID) fail(file, `agency @id is ${agencyNode["@id"]}`);
  for (const key of ["name", "url", "logo", "image", "telephone", "email", "address", "geo", "openingHoursSpecification", "areaServed", "parentOrganization", "knowsLanguage", "sameAs"]) {
    if (!agencyNode[key]) fail(file, `agency node missing ${key}`);
  }
  const asset = agencyNode.logo.replace(SITE, "");
  if (!existsSync(join(ROOT, asset))) fail(file, `agency logo asset missing: ${asset}`);
  const img = agencyNode.image.replace(SITE, "");
  if (!existsSync(join(ROOT, img))) fail(file, `agency image asset missing: ${img}`);

  // Review markup belongs only where the reviews are visible. Anywhere else it
  // is self-serving markup, which risks a manual action.
  const ratingAllowed = file === "reviews/index.html";
  if (agencyNode.aggregateRating && !ratingAllowed) {
    fail(file, "aggregateRating on a page with no visible reviews");
  }
  if (agencyNode.review && !ratingAllowed) fail(file, "Review markup on a page with no visible reviews");
  if (ratingAllowed && agencyNode.aggregateRating?.ratingValue !== RATING.ratingValue) {
    fail(file, "aggregateRating missing or drifted");
  }
}

/* ------------------------------------------ 3. Person nodes on /about/ */

const aboutIds = (graphs.get("about/index.html") || [])
  .filter((n) => n["@type"] === "Person")
  .map((n) => n["@id"]);
for (const id of [VLAD_ID, ANASTASIIA_ID]) {
  if (!aboutIds.includes(id)) fail("about/index.html", `missing Person ${id}`);
}
for (const person of (graphs.get("about/index.html") || []).filter((n) => n["@type"] === "Person")) {
  if (!person.hasCredential) fail("about/index.html", `${person.name} missing hasCredential`);
  if (person.worksFor?.["@id"] !== AGENCY_ID) fail("about/index.html", `${person.name} worksFor does not point at the agency`);
}

/* ------------------- 4/5. FAQ + breadcrumb markup matches the page */

for (const [file, html] of pages) {
  const visibleFaqs = faqs(html);
  const faqNode = nodeOf(file, "FAQPage");
  if (visibleFaqs.length === 0) {
    if (faqNode) fail(file, "FAQPage markup with no visible FAQ on the page");
  } else {
    if (!faqNode) {
      fail(file, `${visibleFaqs.length} visible questions but no FAQPage markup`);
    } else if (JSON.stringify(faqNode.mainEntity) !== JSON.stringify(visibleFaqs)) {
      fail(file, "FAQPage markup does not match the visible questions and answers");
    }
  }

  const visibleCrumbs = breadcrumbs(html);
  const crumbNode = nodeOf(file, "BreadcrumbList");
  if (visibleCrumbs && visibleCrumbs.length > 1) {
    if (!crumbNode) fail(file, "visible breadcrumbs but no BreadcrumbList markup");
    else if (JSON.stringify(crumbNode.itemListElement) !== JSON.stringify(visibleCrumbs)) {
      fail(file, "BreadcrumbList does not match the visible breadcrumbs");
    }
  } else if (crumbNode) {
    fail(file, "BreadcrumbList markup with no visible breadcrumbs");
  }
}

/* ------------------------------------------- 6. reviews page */

{
  const file = "reviews/index.html";
  const html = pages.get(file);
  const visible = reviews(html);
  const agencyNode = nodeOf(file, "RealEstateAgent");
  if (visible.length === 0) fail(file, "no reviews found on the reviews page");
  if (!agencyNode?.review) fail(file, "no Review markup");
  else if (agencyNode.review.length !== visible.length) {
    fail(file, `${agencyNode.review.length} Review nodes for ${visible.length} visible reviews`);
  }
  for (const r of agencyNode?.review || []) {
    if (!r.author?.name) fail(file, "a Review has no author");
    if (!r.datePublished) fail(file, `Review by ${r.author?.name} has no datePublished`);
    if (!r.reviewBody) fail(file, `Review by ${r.author?.name} has no reviewBody`);
  }
}

/* ------------------------------------------- 7. image alt text */

const BAD_ALT = /^(image|picture|photo|photograph)\s+(of|showing)\b/i;
let imageCount = 0;
for (const [file, html] of pages) {
  for (const img of images(html)) {
    imageCount += 1;
    // An image explicitly marked decorative (alt="" plus aria-hidden="true" or role="presentation") is allowed an empty alt.
    const decorative = img.alt === "" && /\s(aria-hidden="true"|role="presentation")/.test(img.tag);
    if (decorative) continue;
    if (!img.alt || !img.alt.trim()) fail(file, `<img src="${img.src}"> has no alt text`);
    else if (BAD_ALT.test(img.alt)) fail(file, `alt text starts with a filler prefix: "${img.alt}"`);
    else if (img.alt.trim().length < 12) fail(file, `alt text too thin: "${img.alt}"`);
  }
}
notes.push(`${imageCount} images, all with alt text`);

/* -------------------------------- 8. sitemap and canonical parity */

{
  const xml = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const canonicals = new Set();
  for (const [file, html] of pages) {
    const canonical = canonicalOf(html);
    if (!canonical) {
      fail(file, "no canonical link");
      continue;
    }
    const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
    if (noindex) continue;
    canonicals.add(canonical);
    if (!locs.includes(canonical)) fail(file, `canonical ${canonical} is not in sitemap.xml`);
  }
  for (const loc of locs) {
    if (!canonicals.has(loc)) fail("sitemap.xml", `${loc} has no page behind it`);
  }
  if (!locs.includes(`${SITE}/market-reports/`)) fail("sitemap.xml", "missing /market-reports/");
  notes.push(`sitemap: ${locs.length} URLs, all matched to a page`);
}

/* --------------------------------------------- 9. hreflang */

for (const cluster of HREFLANG_CLUSTERS) {
  for (const file of cluster.pages) {
    const html = pages.get(file);
    if (!html) {
      fail(file, "hreflang cluster references a page that does not exist");
      continue;
    }
    for (const alt of cluster.alternates) {
      const tag = `<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}">`;
      if (!html.includes(tag)) fail(file, `missing ${tag}`);
    }
  }
}
if (langOf(pages.get("ukrainian-realtor-orlando/index.html")) !== "uk") {
  fail("ukrainian-realtor-orlando/index.html", 'html lang is not "uk"');
}
for (const [file, html] of pages) {
  if (file === "ukrainian-realtor-orlando/index.html") continue;
  if (langOf(html) !== "en") fail(file, `html lang is "${langOf(html)}", expected "en"`);
}

/* ------------------------------------------- 10. homepage title */

if (titleOf(pages.get("index.html")) !== HOME_TITLE) {
  fail("index.html", `title is "${titleOf(pages.get("index.html"))}"`);
}

/* ---------------------- 11. every form states what submitting agrees to */

// MUST stay byte-identical to WEBSITE_INQUIRY_CONSENT_TEXT in
// kizlohq/server/lib/smsConsent.js. Submitting one of these forms is now read
// as service-texting consent, and THAT string is what lands in
// sms_consent_records — so if this line drifts, the site shows one disclosure
// and the legal record proves a different one.
const CONSENT_TEXT =
  "By submitting, you agree that The Kizlo Team may contact you about your inquiry by " +
  "phone, text or email, including messages sent using an automatic telephone dialing " +
  "system. Consent is not a condition of purchase. Message frequency varies. " +
  "Msg & data rates may apply. Reply STOP to opt out, HELP for help. See our Privacy Policy.";

for (const [file, html] of pages) {
  // Every form that collects personal data needs the consent line: data-lead-form forms and any
  // other POST form (the listing pages' #leadform). A GET search form (find-a-home) does not.
  const forms = [...html.matchAll(/<form\b[^>]*>/gi)].filter(
    ([tag]) => /\bdata-lead-form\b/i.test(tag) || !/\bmethod\s*=\s*["']?get\b/i.test(tag)
  );
  if (forms.length === 0) continue;

  const consents = [...html.matchAll(/<p class="form-consent">([\s\S]*?)<\/p>/g)];
  if (consents.length !== forms.length) {
    fail(file, `${forms.length} form(s) but ${consents.length} consent line(s)`);
  }
  for (const m of consents) {
    if (textOf(m[1]) !== CONSENT_TEXT) {
      fail(file, "consent copy does not match the disclosure the server stores");
    }
    if (!m[1].includes('href="/privacy-policy/"')) fail(file, "consent copy does not link the Privacy Policy");
  }

  // The line is the whole disclosure now, so it has to carry what TCPA needs.
  for (const m of consents) {
    const t = textOf(m[1]);
    for (const [needed, label] of [
      [/automatic telephone dialing system/, "autodialer disclosure"],
      [/Msg & data rates may apply/, "rates disclosure"],
      [/Message frequency varies/, "frequency disclosure"],
      [/Reply STOP to opt out/, "opt-out instruction"],
      [/not a condition of purchase/, "not-a-condition statement"],
    ]) {
      if (!needed.test(t)) fail(file, `consent copy is missing the ${label}`);
    }
  }
}

if (!pages.get("home-valuation/index.html").includes('class="form-disclaimer"')) {
  fail("home-valuation/index.html", "missing the valuation estimate disclaimer");
}

/* ------------------------- 12. legal chrome on every page */

for (const slug of ["privacy-policy", "terms-of-use", "accessibility"]) {
  if (!pages.has(`${slug}/index.html`)) fail(`${slug}/index.html`, "legal page missing");
}

// The studio tool and the open-house iPad kiosk are internal full-screen
// tools with their own chrome, not site pages.
const allHtml = htmlFiles().filter((f) => !f.startsWith("studio/") && !f.startsWith("open-house/") && !f.startsWith("google"));
for (const file of allHtml) {
  const html = pages.get(file) || readFileSync(join(ROOT, file), "utf8");
  if (file === "russian-ukrainian-realtor-orlando/index.html") continue; // retired-URL stub
  for (const href of ["/privacy-policy/", "/terms-of-use/", "/accessibility/"]) {
    if (!html.includes(`href="${href}"`)) fail(file, `footer is missing the ${href} link`);
  }
  if (!html.includes('alt="Equal Housing Opportunity"')) fail(file, "footer is missing the Equal Housing Opportunity mark");
}

/* -------------------------------- 13. WCAG structural checks */

for (const file of allHtml) {
  const html = pages.get(file) || readFileSync(join(ROOT, file), "utf8");
  if (file === "russian-ukrainian-realtor-orlando/index.html") continue;

  // 2.4.1 Bypass Blocks — a skip link that lands somewhere.
  if (!html.includes('class="skip-link" href="#main"')) fail(file, "no skip link (WCAG 2.4.1)");
  if (!/<main\b[^>]*\bid="main"/.test(html)) fail(file, 'no <main id="main"> for the skip link to target');

  // 4.1.2 — aria-current must name where you actually are. In the primary
  // nav that is the link whose href is the longest prefix of this page's
  // path (Communities on every /communities/* page); anywhere else it must
  // point at this page itself.
  {
    const path = pagePath(file);
    const header = (/<header class="site-header[\s\S]*?<\/header>/.exec(html) || [""])[0];
    const nav = (/<nav class="site-nav" id="nav"[\s\S]*?<\/nav>/.exec(header) || [""])[0];
    const expected = nav ? currentNavHref(header, path) : null;
    for (const m of html.matchAll(/<a\b[^>]*\baria-current="page"[^>]*>/g)) {
      const href = (/\bhref="([^"]*)"/.exec(m[0]) || [])[1] || "";
      const inNav = nav.includes(m[0]);
      if (inNav ? href !== expected : href !== path) {
        fail(file, `aria-current="page" on ${href || "a link without href"}, which is not this page or its section`);
      }
    }
    if (expected) {
      for (const m of nav.matchAll(/<a\b[^>]*>/g)) {
        if ((/\bhref="([^"]*)"/.exec(m[0]) || [])[1] === expected && !m[0].includes('aria-current="page"')) {
          fail(file, `nav link ${expected} is this page's section but is not marked aria-current="page"`);
        }
      }
    }
  }

  // Exactly one h1 per page.
  const h1s = [...html.matchAll(/<h1\b/g)].length;
  if (h1s !== 1) fail(file, `${h1s} <h1> elements, expected exactly 1`);

  // Skipped heading levels are an axe best-practice rule, not a WCAG AA
  // success criterion, and closing the remaining ones would mean restyling
  // visible headings. Reported, not enforced.
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      warn(`${file}: heading outline jumps h${levels[i - 1]} to h${levels[i]} (best practice, not AA)`);
      break;
    }
  }

  // 3.1.2 — Ukrainian text inside an English page needs its own lang.
  if (/lang="en"/.test(html) && /<a [^>]*>Українською<\/a>/.test(html)) {
    if (!/<a [^>]*lang="uk"[^>]*>Українською<\/a>/.test(html)) {
      fail(file, 'the "Українською" link needs lang="uk" (WCAG 3.1.2)');
    }
  }
}

// Header and footer drift: every page on the 2026 design system carries the
// skip link, header, footer and head font links exactly as lib/chrome.mjs
// builds them from scripts/lib/partials. A hand edit to one page's copy, or a
// partial edit that was never synced, fails here.
{
  const regions = (html) => ({
    "skip link and header": (/<a class="skip-link"[\s\S]*?<\/header>/.exec(html) || [""])[0],
    footer: (/<footer class="site-footer[\s\S]*?<\/footer>/.exec(html) || [""])[0],
    "head (font links, og:site_name)": (/<head>[\s\S]*?<\/head>/.exec(html) || [""])[0],
  });
  for (const file of chromeFiles()) {
    const html = pages.get(file) || readFileSync(join(ROOT, file), "utf8");
    let expected;
    try {
      expected = applyChrome(file, html);
    } catch (err) {
      fail(file, err.message);
      continue;
    }
    if (expected === html) continue;
    const have = regions(html);
    const want = regions(expected);
    const drifted = Object.keys(want).filter((k) => have[k] !== want[k]);
    fail(file, `site chrome drifted from scripts/lib/partials (${drifted.join(", ") || "script tag"}); run node scripts/sync-chrome.mjs`);
  }
}

// Contrast regression guards.
// 1. --bronze fails AA as small text on every background the site uses, so it
//    must never be a `color` for text again (main.css still serves /guide/ and
//    the internal tools; the 2026 sheets alias --bronze for old inline styles).
// 2. Brass (--gold) is text on dark grounds only (DESIGN.md, The Ink Twin Rule):
//    on white or Warm Stone it measures 2.3:1. Every rule that sets it as a text
//    colour must be scoped to a dark ground, or be one of the components below
//    that only ever sit on one (or that a light-ground rule overrides).
{
  const rules = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const sheet of ["css/main.css", "css/kizlo.css", "css/kizlo-pages.css"]) {
    if (!existsSync(join(ROOT, sheet))) continue;
    const css = readFileSync(join(ROOT, sheet), "utf8");
    for (const m of css.matchAll(/^(.*)color:\s*var\(--bronze\)\s*;/gm)) {
      // accent-color paints a checkbox, border/outline/fill paint UI: all
      // non-text, which WCAG holds to 3:1, and --bronze clears that everywhere.
      if (/border|background|outline|fill|stroke|accent/.test(m[1])) continue;
      fail(sheet, `--bronze used as text colour (fails WCAG AA): ${m[0].trim()}`);
    }
  }
  // A dark block, its elements (__) and modifiers (--).
  const DARK_GROUND = /\.(night|hero|page-hero|claim|closing|cta-band|site-header|site-footer|nav-more|breadcrumbs|stats--photo|quote|reviews)(__[\w-]+)?(--[\w-]+)?(?![\w-])|\.footer-[\w-]+|\.nav-open\b/;
  const ON_DARK_ONLY = [
    ".btn:hover", // inverts on dark; light grounds and form panels override it to Midnight
    ".arrow-link--light", // the opt-in dark-ground modifier
    ".header-call", ".wm--", ".hero__pause", // header, wordmark and home hero
    ".stars", ".area__go", // drawn graphics (3:1 non-text), on dark bands and photo tiles
    ".stat__num", // kizlo-pages.css switches it to Brass Ink on light sections
    ".listing__tag", ".listing__status", // Midnight chips
    ".reviews__num", ".quote-nav", // the Midnight reviews band
  ];
  for (const sheet of ["css/kizlo.css", "css/kizlo-pages.css"]) {
    for (const m of rules(readFileSync(join(ROOT, sheet), "utf8"))) {
      if (!/(^|[;\s])color:\s*var\(--gold\)/.test(m[2])) continue;
      for (const sel of m[1].split(",").map((x) => x.trim()).filter(Boolean)) {
        if (DARK_GROUND.test(sel) || ON_DARK_ONLY.some((c) => sel.includes(c))) continue;
        fail(sheet, `brass (--gold) as text outside a dark ground (2.3:1 on white): ${sel}; use --gold-ink, or scope it to a dark section`);
      }
    }
  }
}

/* ------------------------------- 14. internal links resolve */

for (const [file, html] of pages) {
  for (const m of html.matchAll(/\bhref="(\/[^"#?]*)"/g)) {
    const target = m[1];
    const candidates = target.endsWith("/")
      ? [join(ROOT, target, "index.html")]
      : [join(ROOT, target), join(ROOT, target, "index.html")];
    if (!candidates.some((c) => existsSync(c))) fail(file, `dead internal link: ${target}`);
  }
}

/* ------------------------- 15. analytics on every page */

// SKIP pages are excluded from `pages`, but 404 and the Ukrainian page still
// need analytics, so this reads every file. A page built outside build.mjs
// (a new listing, say) fails here until `npm run build` adds the block.
for (const file of htmlFiles()) {
  if (NO_ANALYTICS.has(file)) continue;
  const html = readFileSync(join(ROOT, file), "utf8");
  if (/<meta http-equiv="refresh"/i.test(html)) continue;
  if (!html.includes(`gtag/js?id=${ANALYTICS.ga4}`)) fail(file, "missing Google Analytics (run npm run build)");
  if (!html.includes(`"${ANALYTICS.clarity}"`)) fail(file, "missing Microsoft Clarity (run npm run build)");
  if (!html.includes('src="/js/track.js"')) fail(file, "missing /js/track.js (run npm run build)");
}

/* ---- 16-19. verbatim quotes, report markup, photo use, fair housing */

checkContent({ pages, graphs, fail, warn });

/* ------------------------------------------------------ report */

for (const note of notes) console.log(`  ${note}`);
for (const w of warnings) console.log(`  ! ${w}`);
if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck ok · ${files.length} pages`);
