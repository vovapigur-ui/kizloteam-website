# The Kizlo Team Website

A multi-page static site built for luxury positioning and local SEO. No frameworks, no build step, no dependencies. Every page is plain HTML, CSS and a small JS file.

## Structure

```
/                       Home
/about/                 Team story, approach, stats
/sell/                  Seller page + FAQ (FAQPage schema)
/buy/                   Buyer page + FAQ (FAQPage schema)
/communities/           Hub page
/communities/windermere/
/communities/winter-garden/
/communities/horizon-west/
/contact/               Contact + form + Google Map embed
sitemap.xml, robots.txt
css/main.css            The entire design system
js/main.js              Header, scroll reveals, testimonial rotation
```

## How to deploy (10 minutes)

1. Drag this folder into Netlify (netlify.com/drop), or push to GitHub and connect Vercel or Netlify. Any static host works.
2. Point your domain at it. The site assumes it lives at the ROOT of a domain (links start with /).
3. The canonical domain used throughout is `https://www.kizloteam.com`. If you deploy to a different domain, find and replace `www.kizloteam.com` across all HTML files plus sitemap.xml and robots.txt.

## Before going live (do these, in order)

1. PHOTOS. The site currently uses licensed Unsplash placeholders. Swap them for your own listing photos and a real team portrait. Every spot is marked with a `REPLACE` comment in the HTML. Keep photos bright, daylight, warm and consistently edited. The two portrait blocks on /about/ (VK and AK monograms) are waiting for your headshots.
2. CONTACT FORM. Create a free account at formspree.io, create a form, and replace `YOUR_FORM_ID` in /contact/index.html. Takes 5 minutes. Until then the form will not send.
3. VERIFY FACTS. I used only verified data: 4.9 stars / 120 Google reviews, 100+ closings, $35M+ volume, license numbers SL3475553 and SL3469407, address 7107 Beek St, phone 813 992 3073, email thekizloteam@kw.com. Check that all of it is how you want it published. Note: Anastasiia's license records show the surname Zbihla; the site uses "Anastasiia Kizlo" to match your marketing. Confirm that choice.
4. TESTIMONIALS. All quotes are real Google reviews (Ayla H., Scott B., Crystal G. plus two review summary lines). Swap or add as you collect more.

## After launch (SEO checklist)

1. Google Search Console: verify the domain, submit sitemap.xml.
2. Google Business Profile: set the website field to your homepage. Your GBP is already strong (4.9, 120 reviews) and the site links back to it.
3. Keep the market numbers fresh. Each community page says "Updated August 2026". Update the medians monthly and change the date. Dated first-party local data is what gets cited by Google AI Overviews.
4. NAP consistency: make sure Zillow, Realtor.com, Facebook and every directory show exactly "The Kizlo Team - Realtors", 7107 Beek St, Windermere, FL 34786, 813 992 3073.
5. Growth pages to add next (same template as the community pages): /communities/hamlin/, /communities/isleworth/, /communities/keenes-pointe/, and a monthly /market-report/ page.

## Design system notes

Fonts: Fraunces (display serif) + Hanken Grotesk (body), loaded from Google Fonts. Palette: warm ivory #FAF7F2, ink #1C1A17, bronze accent #8A6D4B, espresso footer #23211C. No rounded corners, no drop shadows, hairline rules only. If you edit, stay inside those rules and it will keep looking expensive.
