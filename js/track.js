/* The Kizlo Team · visit trail and lead tracking.
   Loaded on every page by the analytics block that scripts/build.mjs injects.
   Everything here fails quietly: a blocked tracker or full storage must never
   stop a visitor from reading a page or sending a form. */
(function () {
  "use strict";

  var KEY = "kz_visit";
  var VISIT_GAP_MS = 30 * 60 * 1000;
  var MAX_PAGES = 30;
  var LEAD_ENDPOINT = "/api/public/website-lead";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  // Where this visit came from: UTM tags first (QR flyers and emails carry
  // them), then the referring site, otherwise direct.
  function source() {
    var params = new URLSearchParams(location.search);
    var utm = ["utm_source", "utm_medium", "utm_campaign"]
      .map(function (k) { return params.get(k); })
      .filter(Boolean)
      .join(" / ");
    if (utm) return utm;
    try {
      var host = document.referrer ? new URL(document.referrer).hostname : "";
      if (host && host !== location.hostname) return host.replace(/^www\./, "");
    } catch (e) {}
    return "direct";
  }

  var now = Date.now();
  var path = location.pathname;
  var v = read();
  if (!v || !v.first) v = { first: { at: now, from: source(), landed: path }, visits: 0 };
  if (!v.current || !v.last || now - v.last > VISIT_GAP_MS) {
    v.visits = (v.visits || 0) + 1;
    v.current = { from: source(), pages: [] };
  }
  var pages = v.current.pages;
  if (pages[pages.length - 1] !== path) pages.push(path);
  if (pages.length > MAX_PAGES) pages.splice(0, pages.length - MAX_PAGES);
  v.last = now;
  write(v);

  function trailText() {
    var t = read() || v;
    var day = new Date(t.first.at).toISOString().slice(0, 10);
    var lines = ["First visit " + day + " from " + t.first.from + ", landed on " + t.first.landed];
    if (t.visits > 1) lines.push("Visit " + t.visits + ", this time from " + t.current.from);
    lines.push("Pages this visit: " + t.current.pages.join(" → "));
    return lines.join("\n");
  }

  // Capture phase, so the trail is in the form before any page's own submit
  // handler serializes it. The submit event only fires once the browser's
  // required-field checks pass.
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || String(form.action).indexOf(LEAD_ENDPOINT) === -1) return;

    var field = form.querySelector('input[name="trail"]');
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = "trail";
      form.appendChild(field);
    }
    field.value = trailText();

    // Clarity hashes the custom id in the browser before sending it, so the
    // email never reaches Microsoft in readable form. Nothing personal goes
    // to Google Analytics.
    if (typeof window.clarity === "function") {
      var email = form.querySelector('[name="email"]');
      var phone = form.querySelector('[name="phone"]');
      var id = ((email && email.value) || (phone && phone.value) || "").trim().toLowerCase();
      if (id) window.clarity("identify", id);
      window.clarity("event", "lead_submitted");
    }
  }, true);

  // Each form has its own submit handler (js/main.js, the listing pages), so
  // the conversion is counted where they all meet: a successful response from
  // the lead endpoint.
  if (typeof window.fetch === "function") {
    var nativeFetch = window.fetch;
    window.fetch = function (input) {
      var result = nativeFetch.apply(window, arguments);
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.indexOf(LEAD_ENDPOINT) !== -1) {
        result.then(function (res) {
          if (res.ok && typeof window.gtag === "function") {
            window.gtag("event", "generate_lead", { form_page: location.pathname });
          }
        }, function () {});
      }
      return result;
    };
  }
})();
