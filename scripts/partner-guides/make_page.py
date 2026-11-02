"""Build a partner's Florida guide page: guide/<slug>/index.html and guide/<slug>/thanks/index.html.
Usage: python3 make_page.py agents/<slug>.json <site_root>
Leads post straight to the agent's email through FormSubmit; nothing comes to The Kizlo Team."""
import json, sys, html, os

cfg = json.load(open(sys.argv[1]))
root = sys.argv[2]
e = lambda s: html.escape(s or "", quote=True)

slug = cfg["slug"]
name = cfg["name"]
first = name.split()[0]
email = cfg["email"]
phone = cfg.get("phone", "")
title = cfg.get("title", "Realtor")
brokerage = cfg["brokerage"]
city = cfg.get("city", "")
site = "https://www.kizloteam.com"
base = f"/guide/{slug}/"
pdf = f"{base}{cfg['pdf']}"
photo = f"/guide/partner-assets/agents/{cfg['photo']}"
form_to = cfg.get("form_id") or email  # FormSubmit alias once she activates it

SHOTS = [
    ("/img/windermere-aerial-1116.jpg", "Lakefront homes and docks in Windermere, west of Orlando"),
    ("/img/clermont-aerial-868.jpg", "A newer neighborhood in Clermont, west of Orlando"),
    ("/img/winter-garden-aerial-960.jpg", "Homes on a lake in Winter Garden"),
    ("/img/horizon-west-aerial-1168.jpg", "Horizon West rooftops at sunset"),
    ("/img/luxury-pool-villa-1600.jpg", "A Central Florida pool home"),
    ("/img/living-room-1600.jpg", "A bright living room in a Central Florida home"),
]

QS = [
    ("Home insurance", "$2,000–4,000 a year", "Typical in Orange, Seminole and Osceola counties. Orlando sits more than 45 miles inland, and the age of the roof moves the price most.", 1),
    ("CDD fees", "$1,000–3,000 a year", "A Community Development District fee in many newer communities. It is billed on the property tax bill, on top of the HOA, and listings rarely mention it.", 2),
    ("Flood zones", "Zone X is low risk", "Standard home insurance does not cover flooding. Most of inland Orlando is low-risk Zone X, where flood coverage is optional and inexpensive.", 3),
    ("Property taxes", "Reset at your price", "The seller's tax bill does not transfer. Taxes reset at the price you pay, so budget from the new assessed value.", 4),
    ("Homestead", "Own by January 1", "Own and live in the home by January 1 and file by March 1 to lower your taxable value and cap yearly increases.", 4),
    ("Closing", "30–45 days", "Florida closings run through title companies, and remote or mail-away closings are routine. Nobody has to fly down just to sign.", 5),
    ("Schools", "By exact address", "Schools are assigned by address, not by city or zip code, and they can change from one street to the next.", 6),
    ("Hurricanes", "45+ miles inland", "Storms weaken quickly over land. Newer homes meet strict wind codes, and a wind mitigation inspection can lower the premium.", 1),
    ("The real monthly payment", "Six lines", "Principal and interest, taxes at the new value, insurance, flood if needed, HOA and CDD. The guide shows where each number comes from.", 6),
]

def head(page_title, desc, path):
    return f"""<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{e(page_title)}</title>
  <meta name="description" content="{e(desc)}">
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="{site}{path}">
  <meta name="theme-color" content="#13241e">
  <meta property="og:title" content="{e(page_title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:image" content="{site}/img/windermere-aerial-1116.jpg">
  <meta property="og:type" content="website">
  <link rel="preload" href="/guide/partner-assets/fonts/newsreader-latin-300-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/guide/partner-assets/fonts/newsreader-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/guide/partner-assets/partner.css">
</head>"""

contact_items = [f'<li><a href="mailto:{e(email)}">{e(email)}</a></li>']
if phone:
    tel = "".join(c for c in phone if c.isdigit())
    contact_items.insert(0, f'<li><a href="tel:+1{tel}">{e(phone)}</a></li>')
contact_list = "\n          ".join(contact_items)
where = ", ".join(x for x in [brokerage, city] if x)

footer = f"""<footer>
    <div>
      <p class="name">{e(name)}</p>
      <p>{e(title)}, {e(where)}. Each office independently owned and operated. Equal Housing Opportunity.</p>
      <img class="eho" src="/img/equal-housing-opportunity.svg" alt="Equal Housing Opportunity" width="130" height="32">
    </div>
    <p>Guide figures are 2026 estimates for Orange, Seminole and Osceola counties in Florida and vary by home, roof age, coverage and community. Not legal, tax or insurance advice.</p>
  </footer>"""

video_html = '<video class="is-on" src="/media/hero-lake-portrait.mp4" poster="/media/hero-lake-poster-portrait.jpg" muted loop playsinline preload="metadata" aria-hidden="true"></video>'
shots_html = video_html + "\n      " + "\n      ".join(
    f'<img src="{src}" alt="{e(alt)}" width="1200" height="1500"{" loading=\"lazy\""}>'
    for i, (src, alt) in enumerate(SHOTS))

qs_html = "\n          ".join(
    f'''<li data-shot="{shot}" data-r style="--d:{60 * i}ms"><button type="button" aria-expanded="false" aria-controls="q{i}"><span class="name">{e(q)}</span><span class="fig">{e(fig)}</span></button><div class="desc" id="q{i}"><p>{e(d)}</p></div></li>'''
    for i, (q, fig, d, shot) in enumerate(QS))

index = f"""{head(f"Your free guide to Central Florida | {name}", f"A free two-page guide to buying in Central Florida: insurance, CDD fees, flood zones, taxes, homestead and the real monthly payment. Shared by {name}, {brokerage}.", base)}
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <div class="split split--a">
    <main class="col" id="main">
      <section class="hero" aria-labelledby="t">
        <nav aria-label="Page">
          <a href="#inside">What's inside</a>
          <span class="wordmark">{e(name)}</span>
          <a href="#about">About me</a>
        </nav>
        <div class="lockup">
          <h1 id="t" data-r>Your free guide to Central Florida</h1>
          <p class="lede" data-r style="--d:90ms">Real numbers on insurance, taxes, fees and timing, so nothing about the move surprises you.</p>
          <p class="from" data-r style="--d:150ms">Shared by {e(name)}, {e(brokerage)}</p>
          <a class="btn" href="#get" data-r style="--d:210ms">Get the free guide</a>
        </div>
      </section>

      <section class="sec intro" aria-labelledby="why">
        <h2 id="why" data-r>Before you look at a single house</h2>
        <p data-r style="--d:70ms">Florida looks simple from a listing photo. The cost of owning there is not.</p>
        <p data-r style="--d:140ms">Insurance, community fees, flood zones and property taxes all work differently there, and most of it never shows up in the asking price.</p>
        <p data-r style="--d:210ms">This guide puts the 2026 numbers for the Orlando area in one place, so you can plan a winter home or a full move with clear eyes. It is two pages, it is free, and there is no obligation.</p>
      </section>

      <section class="sec" id="inside" aria-labelledby="ins">
        <h2 id="ins" data-r>What's inside the guide</h2>
        <ul class="qs">
          {qs_html}
        </ul>
      </section>
    </main>

    <aside class="stage first" aria-label="Central Florida">
      {shots_html}
      <p class="bar"><span>West of Orlando, Florida</span><span>Two pages, free PDF</span></p>
    </aside>
  </div>

  <section class="band" aria-labelledby="days">
    <div data-r>
      <p class="big"><span data-days>Jan 1</span><small>days until January 1</small></p>
    </div>
    <div>
      <h2 id="days" data-r>The date that matters most</h2>
      <p data-r style="--d:80ms">To claim Florida's homestead exemption for <span data-year>next year</span>, you need to own and live in the home by January 1, then file by March 1.</p>
      <p class="note" data-tight data-r style="--d:160ms">A typical closing takes 30 to 45 days.</p>
    </div>
  </section>

  <div class="split split--b">
    <div class="col">
      <section class="sec form" id="get" aria-labelledby="g">
        <h2 id="g" data-r>Get the free guide</h2>
        <p class="lead" data-r style="--d:70ms">Tell me where to send it. Your details come straight to me and no one else.</p>
        <form action="https://formsubmit.co/{e(form_to)}" method="POST" data-guide novalidate data-r style="--d:140ms">
          <input type="hidden" name="_subject" value="New request from your Florida guide page">
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_next" value="{site}{base}thanks/">
          <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <label class="field"><span>Your name</span><input type="text" name="name" autocomplete="name" required><span class="err">Please add your name.</span></label>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required><span class="err">Please add an email the guide can go to.</span></label>
          <label class="field"><span>Phone <em>(optional)</em></span><input type="tel" name="phone" autocomplete="tel"></label>
          <label class="field"><span>When are you thinking about Florida?</span>
            <select name="timing">
              <option>Just curious for now</option>
              <option>This winter</option>
              <option>In the next year</option>
              <option>In one to three years</option>
            </select>
          </label>
          <button class="btn" type="submit">Send me the guide</button>
          <p class="fine">You can download the guide on the next screen.</p>
          <p class="partner-consent">By submitting, you agree that {e(name)} may contact you about this guide by phone, text or email. Consent is not a condition of purchase. Msg &amp; data rates may apply. Reply STOP to opt out. Your details go only to {e(name)} and are never sold or shared.</p>
        </form>
      </section>

      <section class="sec letter" id="about" aria-labelledby="a">
        <h2 id="a" data-r>A note from {e(first)}</h2>
        <p data-r style="--d:70ms">Hi, I'm {e(name)}, a {e(title)} with {e(where)}.</p>
        <p data-r style="--d:120ms">When Florida comes up, the same questions come with it: what insurance really costs, what the fees are, how the taxes work. I'm sharing this guide so you have real answers before you start looking.</p>
        <p data-r style="--d:170ms">If Florida turns into a real plan, call me first. I will connect you with a Central Florida agent I trust and stay in your corner through closing, so you are never starting over with a stranger.</p>
        <p class="sign" data-r style="--d:220ms">{e(name)}</p>
        <p class="role">{e(title)}, {e(brokerage)}</p>
      </section>
    </div>

    <aside class="stage stage--portrait" aria-label="{e(name)}">
      <img src="{photo}" alt="{e(name)}, {e(title)}, {e(brokerage)}" width="896" height="1357" class="is-on" loading="lazy">
      <p class="bar"><span>{e(name)}</span><span>{e(where)}</span></p>
    </aside>
  </div>

  <section class="close" aria-labelledby="c">
    <p class="statement" data-r>Thinking about Florida?<br>Call me first.</p>
    <img src="{photo}" alt="{e(name)}" width="170" height="170" loading="lazy" data-r style="--d:80ms">
    <div data-r style="--d:160ms">
      <h2 id="c">Questions about the guide?</h2>
      <ul>
          {contact_list}
      </ul>
      <p class="where">{e(where)}</p>
    </div>
  </section>

  {footer}
  <script src="/guide/partner-assets/partner.js" defer></script>
</body>
</html>
"""

thanks = f"""{head(f"Your guide is ready | {name}", "Download your free Central Florida guide.", base + "thanks/")}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="split split--a">
    <main class="col" id="main">
      <section class="hero" aria-labelledby="t">
        <nav aria-label="Page">
          <a href="{base}">Back to the page</a>
          <span class="wordmark">{e(name)}</span>
          <a href="mailto:{e(email)}">Email me</a>
        </nav>
        <div class="lockup">
          <h1 id="t" data-r>Your guide is ready</h1>
          <p class="lede" data-r style="--d:90ms">Thank you. Open it now or save it for later. If anything in it raises a question, reply to me any time.</p>
          <a class="btn" href="{pdf}" download data-r style="--d:160ms">Download the guide (PDF)</a>
          <p class="from" data-r style="--d:220ms">{e(name)}, {e(where)}</p>
        </div>
      </section>
      <section class="sec letter" aria-labelledby="n">
        <h2 id="n" data-r>When you are ready to talk</h2>
        <p data-r style="--d:70ms">Read it at your own pace. If Florida starts to feel like a real plan, call or email me before you look at homes, and I will connect you with a Central Florida agent I trust.</p>
        <p data-r style="--d:140ms"><a href="mailto:{e(email)}">{e(email)}</a>{(" · <a href=\"tel:+1" + "".join(c for c in phone if c.isdigit()) + "\">" + e(phone) + "</a>") if phone else ""}</p>
        <p class="sign" data-r style="--d:200ms">{e(name)}</p>
        <p class="role">{e(title)}, {e(brokerage)}</p>
      </section>
    </main>
    <aside class="stage first" aria-label="Central Florida">
      {video_html}
      <img src="/img/windermere-aerial-1116.jpg" alt="Lakefront homes and docks in Windermere, west of Orlando" width="1200" height="1500" loading="lazy">
      <img src="{photo}" alt="{e(name)}" width="896" height="1357" loading="lazy">
      <p class="bar"><span>West of Orlando, Florida</span><span>Two pages, free PDF</span></p>
    </aside>
  </div>
  {footer}
  <script src="/guide/partner-assets/partner.js" defer></script>
</body>
</html>
"""

out = os.path.join(root, "guide", slug)
os.makedirs(os.path.join(out, "thanks"), exist_ok=True)
open(os.path.join(out, "index.html"), "w").write(index)
open(os.path.join(out, "thanks", "index.html"), "w").write(thanks)
print("built", out)
