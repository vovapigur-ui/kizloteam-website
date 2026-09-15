#!/usr/bin/env node
// Prints the <title> and meta description of every HTML page with character
// counts, flagging titles over 60 and descriptions outside 150 to 160.
//
//   node scripts/seo-meta.mjs          table of every page
//   node scripts/seo-meta.mjs --bad    only the pages out of range

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeEntities } from "./lib/html.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([".git", "node_modules", "scripts", "content", "studio"]);

function htmlFiles(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(relative(ROOT, full));
  }
  return out.sort();
}

const onlyBad = process.argv.includes("--bad");
let bad = 0;

for (const file of htmlFiles()) {
  const html = readFileSync(join(ROOT, file), "utf8");
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const d = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
  if (!t && !d) continue;
  const title = t ? decodeEntities(t[1]).trim() : "";
  const desc = d ? decodeEntities(d[1]).trim() : "";
  const titleBad = title.length > 60;
  const descBad = desc.length < 150 || desc.length > 160;
  if (titleBad || descBad) bad += 1;
  if (onlyBad && !titleBad && !descBad) continue;
  console.log(`\n${file}`);
  console.log(`  title ${String(title.length).padStart(3)} ${titleBad ? "✗" : "✓"}  ${title}`);
  console.log(`  desc  ${String(desc.length).padStart(3)} ${descBad ? "✗" : "✓"}  ${desc}`);
}
console.log(`\n${bad} page(s) out of range`);
