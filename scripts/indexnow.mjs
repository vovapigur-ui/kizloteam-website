// IndexNow: tell Bing (and the other IndexNow engines) which pages changed.
//
//   node scripts/indexnow.mjs --all            every URL in sitemap.xml
//   node scripts/indexnow.mjs <base> <head>    pages whose HTML changed between two commits
//
// Run by .github/workflows/indexnow.yml after each push to main. It first waits until the
// key file answers on the live site, so the ping lands after Render has deployed.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SITE = "https://www.kizloteam.com";
const KEY = "46682f37d864ddd58871625943b4a401";
const KEY_URL = `${SITE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const sitemapUrls = () =>
  [...readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

function changedUrls(base, head) {
  const files = execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" }).split("\n");
  const toUrl = (f) => `${SITE}/${f.replace(/(^|\/)index\.html$/, "$1")}`;
  // Only pages that are in the sitemap: that skips noindex pages, the studio, the kiosk and redirect stubs.
  const indexable = new Set(sitemapUrls());
  return files.filter((f) => f.endsWith(".html")).map(toUrl).filter((u) => indexable.has(u));
}

async function waitForKey(tries = 20) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${KEY_URL}?cb=${Date.now()}`, { cache: "no-store" });
      if (res.ok && (await res.text()).trim() === KEY) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 15000));
  }
  return false;
}

const args = process.argv.slice(2);
const urls = args[0] === "--all" ? sitemapUrls() : args.length === 2 ? changedUrls(args[0], args[1]) : null;
if (!urls) {
  console.error("usage: node scripts/indexnow.mjs --all | <base-commit> <head-commit>");
  process.exit(2);
}
if (urls.length === 0) {
  console.log("indexnow: no indexable page changed, nothing to send");
  process.exit(0);
}
if (!(await waitForKey())) {
  console.error(`indexnow: key file never answered at ${KEY_URL}; not sending`);
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: KEY_URL, urlList: urls.slice(0, 10000) }),
});
console.log(`indexnow: ${res.status} ${res.statusText} for ${urls.length} URL(s)`);
urls.forEach((u) => console.log(`  ${u}`));
// 200 = accepted, 202 = accepted and key validation pending. Anything else is a real failure.
if (res.status !== 200 && res.status !== 202) process.exit(1);
