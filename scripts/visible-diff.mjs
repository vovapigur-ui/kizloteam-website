#!/usr/bin/env node
// Proves the changes did not touch what a visitor reads: compares the visible
// text of <body> on every page against a git ref (default HEAD).
//
//   node scripts/visible-diff.mjs [ref]

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { textOf } from "./lib/html.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = process.argv[2] || "HEAD";

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

const visible = (html) => {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return textOf(body ? body[1] : html);
};

let changed = 0;
let identical = 0;

for (const file of htmlFiles()) {
  let before;
  try {
    before = execFileSync("git", ["show", `${REF}:${file}`], { cwd: ROOT, encoding: "utf8" });
  } catch {
    console.log(`NEW       ${file}`);
    continue;
  }
  const a = visible(before);
  const b = visible(readFileSync(join(ROOT, file), "utf8"));
  if (a === b) {
    identical += 1;
    continue;
  }
  changed += 1;
  console.log(`CHANGED   ${file}`);
  // Report the words that moved, not the whole page.
  const aw = a.split(" ");
  const bw = b.split(" ");
  const setA = new Set(aw);
  const setB = new Set(bw);
  const removed = aw.filter((w) => !setB.has(w));
  const added = bw.filter((w) => !setA.has(w));
  if (removed.length) console.log(`  - ${removed.join(" ")}`);
  if (added.length) console.log(`  + ${added.join(" ")}`);
}

console.log(`\n${identical} page(s) visually identical to ${REF}, ${changed} changed`);
