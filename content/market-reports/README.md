# Market reports

One Markdown file per report. `npm run build` turns every **published** file into
`/market-reports/<slug>/`, rebuilds the index, and adds the URL to `sitemap.xml`.

Files in here are the source, not the site. Nothing under `content/` is linked
from any page, listed in the sitemap, or allowed in `robots.txt`, so a draft
never reaches a reader until you flip one line.

## Front matter

```markdown
---
title: West Orlando Housing Market, August 2026
description: Windermere, Winter Garden and Horizon West medians, inventory and days on market for August 2026.
date: 2026-08-17
updated: 2026-08-17
eyebrow: Market Report · August 2026
summary: One or two sentences, shown under the headline and on the index card.
image: https://www.kizloteam.com/img/og-windermere-wide.jpg
draft: true
---
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | The `<title>`, the `<h1>` and the BlogPosting `headline` |
| `description` | yes | Meta description. Keep it 150-160 characters |
| `date` | yes | `YYYY-MM-DD`, becomes `datePublished` |
| `updated` | no | Defaults to `date`, becomes `dateModified` |
| `slug` | no | Defaults to the filename |
| `eyebrow` | no | Small caps line above the headline |
| `summary` | no | Defaults to `description` |
| `image` | no | og:image and BlogPosting image |
| `draft` | no | `true` holds the post back from the site entirely |

## Drafts

`draft: true` means the build writes no page, no index card and no sitemap entry.
Leave `[INSERT ...]` placeholders in the body while you are waiting on MLS numbers;
they stay here in the repo where you can see them, and cannot leak to the site.

When the numbers are in, replace the placeholders, set `draft: false`, then:

```bash
npm run verify
```

## Markdown supported

`##`/`###`/`####` headings, paragraphs, `-` and `1.` lists, `|` tables,
`>` blockquotes, `**bold**`, `*italic*`, `` `code` `` and `[links](/buy/)`.
Tables render with the site's `.data-table` styling; internal links pick up the
bronze underline automatically.
