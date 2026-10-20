#!/usr/bin/env node
// Rewrites the skip link, header, footer, head font links, og:site_name and
// the kizlo.js tag on every page that links /css/kizlo.css, from
// scripts/lib/partials. scripts/build.mjs runs the same pass first, so this
// is for applying a partial edit without a full build.
//
//   node scripts/sync-chrome.mjs

import { syncChrome, chromeFiles } from "./lib/chrome.mjs";

const changed = syncChrome();
for (const file of changed) console.log(`chrome: ${file}`);
console.log(`\nchrome ok · ${changed.length} of ${chromeFiles().length} page(s) updated`);
