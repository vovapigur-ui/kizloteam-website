#!/usr/bin/env node
// The gate. Everything here is a fact about the committed files, so a green
// run means the deployed site is consistent with itself.
//
//   npm run check

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { breadcrumbs, canonicalOf, faqs, images, langOf, reviews, titleOf } from "./lib/extract.mjs";
import { AGENCY_ID, ANASTASIIA_ID, HREFLANG_CLUSTERS, RATING, SITE, SKIP, VLAD_ID } from "./lib/site-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOME_TITLE = "The Kizlo Team | West Orlando Realtors - Windermere, Winter Garden, Horizon West";

const failures = [];
const notes = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);

function htmlFiles(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules" || entry === "scripts" || entry === "content") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(relative(ROOT, full));
  }
  return out.sort();
}

const files = htmlFiles().filter((f) => !SKIP.has(f));
const pages = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));

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
    if (!Array.isArray(parsed["@graph"])) fail(file, "JSON-LD has no @graph array");
    graphs.set(file, parsed["@graph"] || []);
  } catch (err) {
    fail(file, `JSON-LD does not parse: ${err.message}`);
  }
}

const nodeOf = (file, type) => (graphs.get(file) || []).find((n) => n["@type"] === type);

/* ------------------------------- 2. site-wide agency on every page */

for (const file of files) {
  const agencyNode = nodeOf(file, "RealEstateAgent");
  if (!agencyNode) {
    fail(file, "missing site-wide RealEstateAgent node");
    continue;
  }
  if (agencyNode["@id"] !== AGENCY_ID) fail(file, `agency @id is ${agencyNode["@id"]}`);
  for (const key of ["name", "url", "logo", "image", "telephone", "email", "address", "geo", "openingHoursSpecification", "areaServed", "parentOrganization", "knowsLanguage", "aggregateRating", "sameAs"]) {
    if (!agencyNode[key]) fail(file, `agency node missing ${key}`);
  }
  const asset = agencyNode.logo.replace(SITE, "");
  if (!existsSync(join(ROOT, asset))) fail(file, `agency logo asset missing: ${asset}`);
  const img = agencyNode.image.replace(SITE, "");
  if (!existsSync(join(ROOT, img))) fail(file, `agency image asset missing: ${img}`);
  if (agencyNode.aggregateRating.ratingValue !== RATING.ratingValue) fail(file, "aggregateRating drifted");
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

/* ------------------------------- 11. internal links resolve */

for (const [file, html] of pages) {
  for (const m of html.matchAll(/\bhref="(\/[^"#?]*)"/g)) {
    const target = m[1];
    const candidates = target.endsWith("/")
      ? [join(ROOT, target, "index.html")]
      : [join(ROOT, target), join(ROOT, target, "index.html")];
    if (!candidates.some((c) => existsSync(c))) fail(file, `dead internal link: ${target}`);
  }
}

/* ------------------------------------------------------ report */

for (const note of notes) console.log(`  ${note}`);
if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck ok · ${files.length} pages`);
