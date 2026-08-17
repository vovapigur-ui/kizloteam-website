// The shared page chrome, copied verbatim from the hand-written pages so
// generated pages are indistinguishable from the rest of the site.

import { escapeHtml } from "./html.mjs";
import { SITE } from "./site-data.mjs";

export const HEAD_ASSETS = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Hanken+Grotesk:wght@300..600&display=swap" rel="stylesheet">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#FAF7F2">
  <link rel="stylesheet" href="/css/main.css">`;

export const HEADER = `  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap site-header__inner">
      <a class="wordmark" href="/">The Kizlo Team<span>Windermere · Winter Garden</span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
      <nav class="site-nav" id="nav" aria-label="Primary">
        <a href="/about/">About</a>
        <a href="/sell/">Sell</a>
        <a href="/buy/">Buy</a>
        <a href="/communities/">Communities</a>
        <a href="https://www.kthomesforsale.com/search?utm_source=kizloteam.com&utm_medium=referral" target="_blank" rel="noopener">Search Homes</a>
        <a href="/contact/" class="btn">Inquire</a>
      </nav>
    </div>
  </header>`;

export const FOOTER = `  <footer class="site-footer">
    <div class="wrap">
      <p class="footer-mark">The Kizlo Team</p>
      <div class="footer-cols">
        <div>
          <h2>The Kizlo Team · Realtors</h2>
          <p style="max-width: 34ch;">A husband and wife real estate team at Keller Williams Realty At The Lakes, serving Windermere, Winter Garden, Horizon West and all of Central Florida.</p>
          <p style="margin-top: 1.2rem;">7107 Beek St<br>Windermere, FL 34786</p>
        </div>
        <div>
          <h2>Explore</h2>
          <ul>
            <li><a href="/about/">About</a></li>
            <li><a href="/sell/">Sell</a></li>
            <li><a href="/buy/">Buy</a></li>
            <li><a href="/communities/">Communities</a></li>
            <li><a href="/home-valuation/">Home Valuation</a></li>
            <li><a href="/market-reports/">Market Reports</a></li>
            <li><a href="/reviews/">Reviews</a></li>
            <li><a href="/contact/">Contact</a></li>
            <li><a href="/ukrainian-realtor-orlando/" lang="uk">Українською</a></li>
            <li><a href="https://www.kthomesforsale.com/search?utm_source=kizloteam.com&utm_medium=referral" target="_blank" rel="noopener">Search Homes</a></li>
          </ul>
        </div>
        <div>
          <h2>Communities</h2>
          <ul>
            <li><a href="/communities/windermere/">Windermere</a></li>
            <li><a href="/communities/winter-garden/">Winter Garden</a></li>
            <li><a href="/communities/horizon-west/">Horizon West</a></li>
            <li><a href="/communities/clermont/">Clermont</a></li>
            <li>Minneola &amp; Groveland</li>
            <li>Apopka</li>
            <li>Winter Park &amp; Maitland</li>
            <li>Longwood</li>
            <li>Orlando</li>
            <li>Kissimmee &amp; St. Cloud</li>
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li><a href="tel:+18139923073">813 992 3073</a></li>
            <li><a href="mailto:thekizloteam@kw.com">thekizloteam@kw.com</a></li>
            <li><a href="https://calendly.com/thekizloteam-kw" rel="noopener">Book a call</a></li>
            <li><a href="https://www.instagram.com/thekizloteam_realestate" rel="noopener">Instagram</a></li>
            <li><a href="https://www.facebook.com/TheKizloTeam" rel="noopener">Facebook</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-legal">
        <p class="footer-legal__links"><a href="/privacy-policy/">Privacy Policy</a> · <a href="/terms-of-use/">Terms of Use</a> · <a href="/accessibility/">Accessibility</a></p>
        <p>© 2026 The Kizlo Team · Realtors. Vlad Kizlo, Lic. SL3475553 · Anastasiia Zbihla, Lic. SL3469407.<br>Keller Williams Realty At The Lakes. Each office is independently owned and operated.</p>
        <p class="footer-eho"><img src="/img/equal-housing-opportunity.svg" alt="Equal Housing Opportunity" width="260" height="64" loading="lazy" decoding="async"> <span>Realtor®</span></p>
      </div>
    </div>
  </footer>`;

export const CTA_BAND = `    <section class="section cta-band">
      <div class="wrap grid" style="align-items: center;">
        <div style="grid-column: 1 / span 7;" class="reveal">
          <span class="eyebrow">Your Move</span>
          <h2 class="display">Numbers are useful. <em>Context is better.</em></h2>
          <p style="margin-top: 1.5rem; max-width: 44ch;">Averages describe a market, not your street. Tell us the address and we will tell you what these figures mean for it.</p>
        </div>
        <div style="grid-column: 9 / span 4; justify-self: start;" class="reveal reveal-d1">
          <p><a class="btn btn--light" href="/home-valuation/">Request A Free Valuation</a></p>
          <p style="margin-top: 1.5rem;"><a class="text-link" href="tel:+18139923073" style="color: var(--ivory); border-color: var(--bronze);">Or call 813 992 3073</a></p>
        </div>
      </div>
    </section>`;

export function breadcrumbNav(trail) {
  const items = trail
    .map((crumb, i) =>
      i === trail.length - 1
        ? `        <li aria-current="page">${escapeHtml(crumb.name)}</li>`
        : `        <li><a href="${crumb.href}">${escapeHtml(crumb.name)}</a></li>`
    )
    .join("\n");
  return `    <nav class="breadcrumbs wrap" aria-label="Breadcrumb">\n      <ol>\n${items}\n      </ol>\n    </nav>`;
}

export function page({ lang = "en", title, description, canonical, ogImage, robots, extraHead = "", body, cta = true }) {
  const image = ogImage || `${SITE}/img/og-living-room.jpg`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <script>document.documentElement.classList.add("js")</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
${robots ? `  <meta name="robots" content="${robots}">\n` : ""}  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${canonical.includes("/market-reports/") && !canonical.endsWith("/market-reports/") ? "article" : "website"}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="${image}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
${HEAD_ASSETS}
${extraHead}</head>
<body>

${HEADER}

  <main id="main">

${body}
${cta ? `\n${CTA_BAND}\n` : ""}
  </main>

${FOOTER}

  <script src="/js/main.js" defer></script>
</body>
</html>
`;
}
