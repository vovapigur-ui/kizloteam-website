# Market reports

One Markdown file per report. `npm run build` turns every **published** file into
`/market-reports/<slug>/`, rebuilds the index, and adds the URL to `sitemap.xml`.

Files in here are the source, not the site. Nothing under `content/` is linked
from any page, listed in the sitemap, or allowed in `robots.txt`, so a draft
never reaches a reader until you flip one line.

## Front matter

```markdown
---
title: West Orlando Housing Market October 2026: Rates Hit 7.4%
headline: West Orlando Market, October 2026
description: September 2026 numbers for Windermere, Winter Garden, Horizon West and Clermont: Orlando median $399,610, 66 days on market, 5.3 months of supply, 7.4% rates.
date: 2026-10-19
updated: 2026-10-19
summary: One or two sentences, shown under the headline and on the index card.
image: https://www.kizloteam.com/img/og-horizon-west-aerial.jpg
cover: horizon-west
figures: $399,610 | Orlando metro median sale price (ORRA, September 2026); 66 | Average days on market (ORRA, September 2026)
tiles: windermere | $707,471 typical value · Zillow, August 2026; clermont | $441,790 median sale price · Redfin, September 2026
draft: true
---
```

(The October 2026 report, shortened.)

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | The `<title>`, og:title and the BlogPosting `alternativeHeadline`. Keep it 50-60 characters |
| `headline` | no | The visible `<h1>`, the last breadcrumb, the index card title and the BlogPosting `headline`. Keep it 42 characters or fewer. Defaults to `title` |
| `description` | yes | Meta description. Keep it 150-160 characters |
| `date` | yes | `YYYY-MM-DD`, becomes `datePublished` and the byline date |
| `updated` | no | Defaults to `date`, becomes `dateModified`. Move it only when the numbers or the advice change, not for a retitle or a design pass |
| `slug` | no | Defaults to the filename |
| `summary` | no | The hero lede and the index card text. Defaults to `description` |
| `image` | no | og:image, twitter:image and the BlogPosting `image`. Defaults to `og-windermere-wide.jpg` |
| `cover` | no | The 4:3 photo on the index card: `windermere`, `winter-garden`, `horizon-west` or `clermont` (that community's aerial). No cover, no photo |
| `figures` | no | The dark stats band under the hero. `value | label (source, month)`, entries separated by `;`. Copy every value and label from the report body; four is the usual count |
| `tiles` | no | The community photo tiles before the closing band. `slug | meta`, entries separated by `;`, slugs as for `cover`. The meta is that community's figure with its source and month, copied from the body |
| `draft` | no | `true` holds the post back from the site entirely |

`eyebrow` is retired: the design has no kicker line above headlines, so the
build ignores it.

## What the build adds

- A byline with Vlad's photo, "By Vlad Kizlo, team lead", and the dates.
- "Newer: <Month Year> West Orlando market report" on every report older than the latest.
- "Earlier: <Month Year> West Orlando market report" on every report that has a predecessor (the next older report), so the archive reads as a chain in both directions.
- An inline call to action ("What this means for your street") after the second `##` section.
- The closing band, "What do these numbers mean for your home?".
- Vlad's Person node in the page's JSON-LD.

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

- Straight quotes and apostrophes become typographic ones (“ ” ‘ ’) in the page.
- Links pick up the prose underline from the stylesheet. A link to another site
  opens in a new tab and says so to screen readers.
- A table becomes a labelled, keyboard-scrollable region. Its caption is the
  heading it sits under, and on phones each row stacks into labelled cells, so
  keep the header row short. The first column is the row label.
- End every report with one `## Sources` list.
